/**
 * MediProtect - Recordatorio proactivo de asistencia (Flujo 2)
 * GET /api/cron/verificar-citas
 *
 * Busca citas que ya ocurrieron hace 3 horas y aún no tienen respuesta del
 * paciente, inyecta el estado del flujo de asistencia en la sesión WhatsApp
 * del paciente y le envía los botones "Sí, asistí" / "No se realizó" vía
 * Evolution API. Cuando el paciente responde, el webhook /whook/wame retoma
 * el flujo desde n_pregunta_asistio y la acción registrar_asistencia graba
 * la respuesta en la cita.
 *
 * Seguridad: si existe CRON_SECRET (env o runtimeConfig) se envía como
 * header `x-cron-secret` o query `?secret=`.
 * Uso manual: GET /api/cron/verificar-citas?dry=1  (simula sin enviar)
 */

const NODO_PREGUNTA = 'n_pregunta_asistio'
const NOMBRE_FLUJO_ASISTENCIA = 'asistencia'
const HORAS_DESPUES_CITA = 3
const LIMITE_CITAS = 50

const OPCIONES_POR_DEFECTO = [
  { label: 'Sí, asistí', valor: 'si' },
  { label: 'No se realizó', valor: 'no' },
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const secreto = config.cronSecret || process.env.CRON_SECRET || ''
  const recibido = getHeader(event, 'x-cron-secret') || String(getQuery(event).secret || '')
  if (secreto && recibido !== secreto) {
    throw createError({ statusCode: 401, message: 'cron secret invalido' })
  }

  const dry = String(getQuery(event).dry || '') === '1'
  const pool = await useDbPool(event)

  // ── 1) Localizar el flujo de asistencia y el nodo pregunta ────────────────
  const flowRes = await pool.query(
    `SELECT id, definicion FROM whatsapp_flows
      WHERE nombre = $1 AND activo = true
      ORDER BY created_at ASC LIMIT 1`,
    [NOMBRE_FLUJO_ASISTENCIA]
  )
  let flow: any = flowRes.rows[0]

  if (!flow && config.flujoAsistenciaId) {
    const alt = await pool.query(`SELECT id, definicion FROM whatsapp_flows WHERE id = $1`, [config.flujoAsistenciaId])
    flow = alt.rows[0]
  }

  const flowId: string = flow?.id || ''
  if (!flowId) {
    return {
      ok: false,
      motivo: `No existe el flujo "${NOMBRE_FLUJO_ASISTENCIA}" activo (ni flujoAsistenciaId valido)`,
      procesadas: 0,
    }
  }

  const definicion = flow?.definicion || {}
  const nodoPregunta: any = (definicion.nodes || []).find((n: any) => n.id === NODO_PREGUNTA)
  if (!nodoPregunta) {
    return {
      ok: false,
      motivo: `El flujo "${NOMBRE_FLUJO_ASISTENCIA}" no contiene el nodo "${NODO_PREGUNTA}"`,
      procesadas: 0,
    }
  }

  const opciones: any[] = nodoPregunta.config?.opciones?.length
    ? nodoPregunta.config.opciones
    : OPCIONES_POR_DEFECTO
  const textoPregunta: string =
    nodoPregunta.config?.titulo || '¿Asististe a tu cita programada?'

  // Los ids de boton deben ser op_{indice} para que el runner los resuelva
  // contra config.opciones del nodo.
  const botones = opciones.map((o: any, i: number) => ({
    id: `op_${i}`,
    titulo: String(o.label || o.titulo || o.valor || ''),
  }))

  // ── 2) Citas con 3h de antigüedad y sin recordatorio ──────────────────────
  const pendientes = await pool.query(
    `SELECT c.id, c.folio, c.fecha_hora, c.estado,
            COALESCE(NULLIF(c.whatsapp_telefono, ''), p.telefono) AS telefono,
            COALESCE(NULLIF(c.whatsapp_nombre, ''), p.nombre, '') AS nombre,
            COALESCE(p.apellido, '') AS apellido
       FROM citas c
       JOIN pacientes p ON p.id = c.id_paciente
      WHERE c.fecha_hora <= NOW() - make_interval(hours => $1)
        AND c.recordatorio_asistencia_enviado = false
        AND c.respuesta_paciente_asistio IS NULL
        AND COALESCE(c.estado, '') <> 'cancelada'
        AND COALESCE(NULLIF(c.whatsapp_telefono, ''), p.telefono, '') <> ''
      ORDER BY c.fecha_hora ASC
      LIMIT $2`,
    [HORAS_DESPUES_CITA, LIMITE_CITAS]
  )

  const waConfig = await getWhatsAppConfig(pool)
  const resumen = { ok: true, detectadas: pendientes.rows.length, enviadas: 0, omitidas: 0, fallos: 0 }

  for (const cita of pendientes.rows) {
    const telefonoPaciente = String(cita.telefono || '')
    const nombrePaciente = [cita.nombre, cita.apellido].filter(Boolean).join(' ') || 'Paciente'

    try {
      // ── 3) Inyectar estado del flujo en la sesión del paciente ────────────
      const conv = await localizarConversacion(pool, telefonoPaciente, nombrePaciente)
      if (!conv) {
        console.warn(`[Cron Asistencia] Sin conversacion para ${telefonoPaciente} (cita ${cita.id})`)
        resumen.omitidas++
        continue
      }

      const datosTemp = {
        ...(conv.datos_temp || {}),
        flow: {
          flowId,
          nodeId: NODO_PREGUNTA,
          vars: { cita_id: cita.id, folio: cita.folio || null },
        },
      }

      if (dry) {
        console.log(`[Cron Asistencia][dry] ${cita.folio || cita.id} -> ${conv.telefono}`)
        resumen.enviadas++
        continue
      }

      await updateConversationState(pool, conv.id, 'flow', datosTemp)

      // ── 4) Enviar botones por Evolution API ───────────────────────────────
      if (!waConfig.gatewayUrl || !waConfig.instanceName) {
        console.error('[Cron Asistencia] Evolution no configurada, no se envia')
        resumen.fallos++
        continue
      }

      const envio = await enviarBotones(waConfig, conv.telefono, textoPregunta, botones)

      await logMensaje(pool, conv.telefono, 'out', textoPregunta, 'button', `cron_asist_${cita.id}_${Date.now()}`, {
        origen: 'cron_asistencia',
        cita_id: cita.id,
        folio: cita.folio,
        status_http: envio.status,
        evolution_respuesta: envio.data,
      })

      // ── 5) Marcar la cita como recordada ──────────────────────────────────
      await pool.query(
        `UPDATE citas SET recordatorio_asistencia_enviado = true, updated_at = NOW() WHERE id = $1`,
        [cita.id]
      )

      resumen.enviadas++
      console.log(`[Cron Asistencia] Recordatorio enviado a ${conv.telefono} por cita ${cita.id}`)
    } catch (err: any) {
      resumen.fallos++
      console.error(`[Cron Asistencia] Error cita ${cita.id}:`, err?.message || err)
    }
  }

  return resumen
})

/**
 * La conversación se indexa por el remoteJid de Evolution (ej. 5212227328662)
 * mientras que en `pacientes` el teléfono puede guardarse sin prefijo
 * internacional. Se prueban las variantes para no crear una sesión huérfana.
 */
async function localizarConversacion(pool: any, telefono: string, nombre: string) {
  const digitos = String(telefono || '').replace(/\D/g, '')
  if (!digitos) return null

  const variantes = [digitos]
  if (digitos.length === 10) {
    variantes.push(`52${digitos}`, `521${digitos}`)
  } else if (digitos.length === 12 && digitos.startsWith('52')) {
    variantes.push(`521${digitos.slice(2)}`)
  }

  const existente = await pool.query(
    `SELECT * FROM whatsapp_conversaciones
      WHERE regexp_replace(telefono, '[^0-9]', '', 'g') = ANY($1)
      ORDER BY updated_at DESC
      LIMIT 1`,
    [variantes]
  )
  if (existente.rows[0]) return existente.rows[0]

  const formaInternacional = digitos.length === 10 ? `521${digitos}` : digitos
  return await getOrCreateConversation(pool, formaInternacional, nombre)
}
