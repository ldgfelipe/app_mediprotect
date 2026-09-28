interface WhatsAppConfig {
  gatewayUrl: string
  instanceName: string
  apiKey: string
}

export async function updateWhatsAppConfig(pool: any, gatewayUrl: string, instanceName: string, apiKey?: string) {
  if (!gatewayUrl || !instanceName) {
    throw new Error('gatewayUrl e instanceName son requeridos')
  }

  await pool.query(
    `INSERT INTO configuracion_sistema (clave, valor, categoria) VALUES
     ('whatsapp_gateway_url', $1, 'whatsapp'),
     ('whatsapp_instance_name', $2, 'whatsapp')
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    [gatewayUrl, instanceName]
  )

  if (apiKey) {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor, categoria) VALUES
       ('whatsapp_gateway_apikey', $1, 'whatsapp')
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
      [apiKey]
    )
  }

  return { ok: true, gatewayUrl, instanceName }
}

export async function getWhatsAppConfig(pool: any): Promise<WhatsAppConfig> {
  const result = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema WHERE categoria = 'whatsapp'`
  )
  const configMap: Record<string, string> = {}
  for (const row of result.rows) {
    configMap[row.clave] = row.valor || ''
  }

  const cfg = useRuntimeConfig()

  return {
    gatewayUrl: configMap['whatsapp_gateway_url'] || cfg.whatsappGatewayUrl || 'http://127.0.0.1:8080',
    instanceName: configMap['whatsapp_instance_name'] || cfg.whatsappInstanceName || '',
    apiKey: configMap['whatsapp_gateway_apikey'] || cfg.whatsappGatewayApiKey || '',
  }
}

export async function logMensaje(
  pool: any,
  telefono: string,
  direccion: 'in' | 'out',
  mensaje: string,
  tipo = 'text',
  whatsappMsgId?: string,
  metadata?: any
) {
  await pool.query(
    `INSERT INTO whatsapp_mensajes_log (telefono, direccion, mensaje, tipo, whatsapp_msg_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [telefono, direccion, mensaje, tipo, whatsappMsgId || null, metadata ? JSON.stringify(metadata) : '{}']
  )
}

export async function getOrCreateConversation(pool: any, telefono: string, nombre: string) {
  let result = await pool.query(
    `SELECT * FROM whatsapp_conversaciones WHERE telefono = $1`,
    [telefono]
  )

  if (result.rows.length === 0) {
    let idPaciente = null
    const pacienteRes = await pool.query(
      `SELECT id FROM pacientes WHERE telefono = $1 OR regexp_replace(telefono, '[^0-9]', '', 'g') LIKE '%' || $2 || '%' LIMIT 1`,
      [telefono, telefono.replace(/[^0-9]/g, '')]
    )
    if (pacienteRes.rows.length > 0) {
      idPaciente = pacienteRes.rows[0].id
    }

    result = await pool.query(
      `INSERT INTO whatsapp_conversaciones (telefono, nombre_paciente, id_paciente, estado, datos_temp)
       VALUES ($1, $2, $3, 'bienvenida', '{}')
       RETURNING *`,
      [telefono, nombre || null, idPaciente]
    )
  }

  return result.rows[0]
}

export async function updateConversationState(pool: any, id: string, estado: string, datosTemp: any) {
  await pool.query(
    `UPDATE whatsapp_conversaciones
     SET estado = $1, datos_temp = $2, updated_at = NOW()
     WHERE id = $3`,
    [estado, JSON.stringify(datosTemp), id]
  )
}

export async function getAvailableSpecialties(pool: any) {
  const result = await pool.query(
    `SELECT DISTINCT especialidad
     FROM medicos
     WHERE activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     AND especialidad IS NOT NULL
     ORDER BY especialidad`
  )
  return result.rows.map((r: any) => r.especialidad)
}

export async function getDoctorsBySpecialty(pool: any, especialidad: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, precio_regular, especialidad
     FROM medicos
     WHERE especialidad = $1
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     ORDER BY nombre`,
    [especialidad]
  )
  return result.rows
}

interface DisponibilidadMedico {
  diasDisponibles: number[]
  inicio: string | null
  fin: string | null
  inicioVespertino: string | null
  finVespertino: string | null
}

function minutosAHora(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function horaAMinutos(hora: string | null): number | null {
  if (!hora) return null
  const [h, m] = hora.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatearFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generarBloques(dispo: DisponibilidadMedico, fecha: string): string[] {
  const rangos: { inicio: number; fin: number }[] = []
  const inicio = horaAMinutos(dispo.inicio)
  const fin = horaAMinutos(dispo.fin)
  if (inicio !== null && fin !== null && fin > inicio) rangos.push({ inicio, fin })
  const inicioV = horaAMinutos(dispo.inicioVespertino)
  const finV = horaAMinutos(dispo.finVespertino)
  if (inicioV !== null && finV !== null && finV > inicioV) rangos.push({ inicio: inicioV, fin: finV })

  const bloques: string[] = []
  for (const r of rangos) {
    for (let t = r.inicio; t + 30 <= r.fin; t += 30) {
      bloques.push(minutosAHora(t))
    }
  }

  if (fecha === formatearFecha(new Date())) {
    const ahora = new Date().getHours() * 60 + new Date().getMinutes()
    return bloques.filter((b) => {
      const t = horaAMinutos(b)
      return t !== null && t > ahora
    })
  }
  return bloques
}

export async function getDisponibilidadMedico(pool: any, medicoId: string): Promise<DisponibilidadMedico> {
  const res = await pool.query(
    `SELECT dias_disponibles, horario_inicio, horario_fin,
            horario_inicio_vespertino, horario_fin_vespertino
     FROM medicos WHERE id = $1`,
    [medicoId]
  )
  const m = res.rows[0]
  if (m) {
    let dias = m.dias_disponibles
    if (typeof dias === 'string') {
      try { dias = JSON.parse(dias) } catch { dias = null }
    }
    if (Array.isArray(dias) && dias.length > 0) {
      return {
        diasDisponibles: [...new Set(dias.map((d: any) => Number(d)))],
        inicio: m.horario_inicio ? String(m.horario_inicio).slice(0, 5) : null,
        fin: m.horario_fin ? String(m.horario_fin).slice(0, 5) : null,
        inicioVespertino: m.horario_inicio_vespertino ? String(m.horario_inicio_vespertino).slice(0, 5) : null,
        finVespertino: m.horario_fin_vespertino ? String(m.horario_fin_vespertino).slice(0, 5) : null,
      }
    }
  }

  const dispRes = await pool.query(
    `SELECT dia_semana, hora_inicio, hora_fin
     FROM disponibilidad_medico
     WHERE id_medico = $1 AND activo = true
     ORDER BY hora_inicio ASC`,
    [medicoId]
  )
  if (dispRes.rows.length > 0) {
    const rows = dispRes.rows
    const dias = [...new Set(rows.map((r: any) => Number(r.dia_semana)))]
    const primerRango = rows[0]
    return {
      diasDisponibles: dias,
      inicio: String(primerRango.hora_inicio).slice(0, 5),
      fin: String(primerRango.hora_fin).slice(0, 5),
      inicioVespertino: null,
      finVespertino: null,
    }
  }

  return { diasDisponibles: [1, 2, 3, 4, 5], inicio: '09:00', fin: '20:00', inicioVespertino: null, finVespertino: null }
}

export async function getAvailableHours(pool: any, medicoId: string, fecha: string, dispo?: DisponibilidadMedico, limite = 10) {
  const disponibilidad = dispo || await getDisponibilidadMedico(pool, medicoId)
  const fechaDate = new Date(`${fecha}T12:00:00`)
  if (Number.isNaN(fechaDate.getTime())) return []
  if (!disponibilidad.diasDisponibles.includes(fechaDate.getDay())) return []

  const bloques = generarBloques(disponibilidad, fecha)
  if (bloques.length === 0) return []

  const ocupadas = await pool.query(
    `SELECT EXTRACT(HOUR FROM fecha_hora)::int * 60 + EXTRACT(MINUTE FROM fecha_hora)::int AS minutos
     FROM citas
     WHERE id_medico = $1
     AND fecha_hora::date = $2::date
     AND estado NOT IN ('cancelada')`,
    [medicoId, fecha]
  )
  const minutosOcupados: number[] = ocupadas.rows.map((r: any) => r.minutos)

  return bloques.filter((bloque) => {
    const b = horaAMinutos(bloque) as number
    return !minutosOcupados.some((m) => m >= b && m < b + 30)
  }).slice(0, limite)
}

export async function getAvailableDates(pool: any, medicoId: string, limite = 7, ventanaDias = 60) {
  const dispo = await getDisponibilidadMedico(pool, medicoId)
  const fechas: string[] = []
  const hoy = new Date()
  for (let i = 1; i <= ventanaDias && fechas.length < limite; i++) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + i)
    if (!dispo.diasDisponibles.includes(d.getDay())) continue
    const fechaStr = formatearFecha(d)
    const horas = await getAvailableHours(pool, medicoId, fechaStr, dispo)
    if (horas.length > 0) fechas.push(fechaStr)
  }
  return fechas
}

export async function getDiasDisponiblesParaMedico(pool: any, medicoId: string): Promise<{ id: string; titulo: string; descripcion: string }[]> {
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const fechas = await getAvailableDates(pool, medicoId)
  return fechas.map((f) => {
    const [y, mo, d] = f.split('-').map(Number)
    const fecha = new Date(y, mo - 1, d)
    return {
      id: `dia_${f}`,
      titulo: `${DIAS[fecha.getDay()]} ${d} ${MESES[mo - 1]}`,
      descripcion: f,
    }
  })
}

export async function getHorasDisponiblesParaMedico(pool: any, medicoId: string, fecha: string): Promise<{ id: string; titulo: string; descripcion: string }[]> {
  const horas = await getAvailableHours(pool, medicoId, fecha)
  return horas.map((h) => {
    const [hh, mm] = h.split(':').map(Number)
    const hour12 = hh > 12 ? hh - 12 : hh
    const suffix = hh >= 12 ? 'PM' : 'AM'
    return {
      id: `hora_${h}`,
      titulo: `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`,
      descripcion: h,
    }
  })
}

export async function createCitaFromWhatsApp(
  pool: any,
  medicoId: string,
  pacienteId: string | null,
  fecha: string | null,
  hora: string | null,
  telefonoPaciente: string,
  nombrePaciente: string,
  // MediProtect: las citas creadas por el motor de flujos quedan PENDIENTE_DE_COORDINACION
  // para que un asistente las coordine manualmente (nunca se confirman solas).
  estado: string = 'PENDIENTE_DE_COORDINACION'
) {
  if ((fecha === null) !== (hora === null)) {
    throw new Error('fecha y hora deben ser ambas nulas o ambas definidas')
  }
  const fechaHora = fecha !== null && hora !== null ? `${fecha}T${hora}:00` : null

  const medicoRes = await pool.query(
    `SELECT nombre, apellido, precio_regular, porcentaje_descuento, monto_comision
     FROM medicos WHERE id = $1`,
    [medicoId]
  )
  const medico = medicoRes.rows[0]
  const precioRegular = medico?.precio_regular || 1000
  const descuento = medico?.porcentaje_descuento || 10
  const precioAcordado = precioRegular * (1 - descuento / 100)
  const whatsappTelefono = estado === 'PENDIENTE_DE_COORDINACION' ? telefonoPaciente : null
  const whatsappNombre = estado === 'PENDIENTE_DE_COORDINACION' ? nombrePaciente : null
  const whatsappMedicoNombre = estado === 'PENDIENTE_DE_COORDINACION'
    ? [medico?.nombre, medico?.apellido].filter(Boolean).join(' ') || null
    : null

  const result = await pool.query(
    `INSERT INTO citas (
       id_paciente, id_medico, fecha_hora, precio_acordado, notas_paciente, estado,
       whatsapp_telefono, whatsapp_nombre, whatsapp_medico_nombre
     )
     VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      pacienteId,
      medicoId,
      fechaHora,
      precioAcordado,
      `Cita agendada vía WhatsApp por ${nombrePaciente}`,
      estado,
      whatsappTelefono,
      whatsappNombre,
      whatsappMedicoNombre,
    ]
  )

  return result.rows[0]
}

export async function searchPatientByPhone(pool: any, telefono: string) {
  const digits = telefono.replace(/[^0-9]/g, '')
  const result = await pool.query(
     `SELECT id, nombre, apellido, email, telefono
     FROM pacientes
     WHERE telefono = $1
     OR regexp_replace(telefono, '[^0-9]', '', 'g') LIKE '%' || $2 || '%'
     LIMIT 1`,
    [telefono, digits]
  )
  return result.rows[0] || null
}

export async function searchPatientById(pool: any, id: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, email, telefono
     FROM pacientes
     WHERE id::text = $1 OR id = $1::uuid
     LIMIT 1`,
    [id]
  )
  return result.rows[0] || null
}

export async function searchDoctorBySlug(pool: any, slug: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, slug, precio_regular, porcentaje_descuento, especialidad
     FROM medicos
     WHERE slug = $1
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     LIMIT 1`,
    [slug]
  )
  return result.rows[0] || null
}

export async function searchDoctorByName(pool: any, nombre: string) {
  const search = `%${nombre.toLowerCase()}%`
  const result = await pool.query(
    `SELECT id, nombre, apellido, slug, precio_regular, porcentaje_descuento, especialidad
     FROM medicos
     WHERE (
       LOWER(nombre) LIKE $1
       OR LOWER(apellido) LIKE $1
       OR LOWER(slug) LIKE $1
       OR LOWER(CONCAT(nombre, ' ', apellido)) LIKE $1
     )
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     LIMIT 1`,
    [search]
  )
  return result.rows[0] || null
}

export function getDiasDisponibles(): { id: string; titulo: string; descripcion: string }[] {
  const hoy = new Date()
  const dias: { id: string; titulo: string; descripcion: string }[] = []
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  let d = new Date(hoy)
  d.setDate(d.getDate() + 1)
  while (dias.length < 5) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dias.push({
        id: `dia_${fechaStr}`,
        titulo: `${DIAS[dayOfWeek]} ${d.getDate()} ${MESES[d.getMonth()]}`,
        descripcion: fechaStr,
      })
    }
    d.setDate(d.getDate() + 1)
  }
  return dias
}

export async function getHorasDisponibles(): { id: string; titulo: string; descripcion: string }[] {
  const horas: { id: string; titulo: string; descripcion: string }[] = []
  for (let h = 9; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 20 && m > 0) break
      const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const hour12 = h > 12 ? h - 12 : h
      const suffix = h >= 12 ? 'PM' : 'AM'
      horas.push({
        id: `hora_${hora}`,
        titulo: `${hour12}:${String(m).padStart(2, '0')} ${suffix}`,
        descripcion: hora,
      })
    }
  }
  return horas
}

// ==================== NUEVAS FUNCIONES PARA FLUJO ESTRUCTURADO ====================

export async function searchDoctorByFullName(pool: any, nombreCompleto: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, slug, precio_regular, porcentaje_descuento, especialidad, telefono, whatsapp_telefono
     FROM medicos
     WHERE (
       LOWER(CONCAT(nombre, ' ', apellido)) LIKE $1
       OR LOWER(nombre) LIKE $1
       OR LOWER(apellido) LIKE $1
       OR LOWER(slug) LIKE $1
     )
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     LIMIT 1`,
    [`%${nombreCompleto.toLowerCase()}%`]
  )
  return result.rows[0] || null
}

export async function createCitaFechaPorConfirmar(
  pool: any,
  medicoId: string,
  pacienteId: string | null,
  telefonoPaciente: string,
  nombrePaciente: string
) {
  const medicoRes = await pool.query(
    `SELECT nombre, apellido, precio_regular, porcentaje_descuento, monto_comision
     FROM medicos WHERE id = $1`,
    [medicoId]
  )
  const medico = medicoRes.rows[0]
  const precioRegular = medico?.precio_regular || 1000
  const descuento = medico?.porcentaje_descuento || 10
  const precioAcordado = precioRegular * (1 - descuento / 100)
  const whatsappTelefono = telefonoPaciente
  const whatsappNombre = nombrePaciente
  const whatsappMedicoNombre = [medico?.nombre, medico?.apellido].filter(Boolean).join(' ') || null

  const result = await pool.query(
    `INSERT INTO citas (
       id_paciente, id_medico, fecha_hora, precio_acordado, notas_paciente, estado,
       whatsapp_telefono, whatsapp_nombre, whatsapp_medico_nombre
     )
     VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      pacienteId,
      medicoId,
      precioAcordado,
      `Cita agendada vía WhatsApp por ${nombrePaciente} - Fecha por confirmar`,
      'PENDIENTE_DE_COORDINACION',
      whatsappTelefono,
      whatsappNombre,
      whatsappMedicoNombre,
    ]
  )

  return result.rows[0]
}

export async function sendWhatsAppToDoctor(
  pool: any,
  medicoId: string,
  citaFolio: string,
  pacienteNombre: string,
  pacienteTelefono: string
) {
  const config = await getWhatsAppConfig(pool)
  if (!config.gatewayUrl || !config.instanceName) return { ok: false, error: 'WhatsApp no configurado' }

  const medicoRes = await pool.query(
    `SELECT nombre, apellido, whatsapp_telefono FROM medicos WHERE id = $1`,
    [medicoId]
  )
  const medico = medicoRes.rows[0]
  if (!medico || !medico.whatsapp_telefono) return { ok: false, error: 'Médico sin WhatsApp' }

  const { enviarMensaje } = await import('./whatsapp')
  const texto = `🔔 *Nueva solicitud de cita*\n\n📋 Folio: *${citaFolio}*\n👤 Paciente: ${pacienteNombre}\n📱 Tel: ${pacienteTelefono || 'No disponible'}\n\n*Estado:* Fecha por confirmar\n\nResponde *FECHAS* para enviar tus disponibilidades.`
  await enviarMensaje(
    { gatewayUrl: (await import('./whatsapp-db')).getWhatsAppConfig(await import('#internal/nitro').then(m => m.useDbPool({}))).gatewayUrl, instanceName: '', apiKey: '' },
    medico.whatsapp_telefono,
    texto
  )
  return { ok: true }
}

// Función simplificada para usar desde el flow runner (evita import circular)
export async function notificarDoctorWhatsApp(
  pool: any,
  medicoId: string,
  citaFolio: string,
  pacienteNombre: string,
  pacienteTelefono: string,
  gatewayUrl: string,
  instanceName: string,
  apiKey: string
) {
  const medicoRes = await pool.query(
    `SELECT whatsapp_telefono FROM medicos WHERE id = $1`,
    [medicoId]
  )
  const medico = medicoRes.rows[0]
  if (!medico || !medico.whatsapp_telefono) return { ok: false, error: 'Médico sin WhatsApp' }

  const { enviarMensaje } = await import('./whatsapp')
  const texto = `🔔 *Nueva solicitud de cita*\n\n📋 Folio: *${citaFolio}*\n👤 Paciente: ${pacienteNombre}\n📱 Tel: ${pacienteTelefono || 'No disponible'}\n\n*Estado:* Fecha por confirmar\n\nResponde *FECHAS* para enviar tus disponibilidades.`
  await enviarMensaje({ gatewayUrl, instanceName, apiKey }, medico.whatsapp_telefono, texto)
  return { ok: true }
}

export async function enviarOpcionesFechaHoraPaciente(
  pool: any,
  telefonoPaciente: string,
  doctorId: string,
  doctorNombre: string,
  citaId: string,
  gatewayUrl: string,
  instanceName: string,
  apiKey: string
) {
  const dias = await getDiasDisponiblesParaMedico(pool, doctorId)
  if (dias.length === 0) return { ok: false, error: 'Sin disponibilidad' }

  const { enviarLista } = await import('./whatsapp')
  const opciones = dias.slice(0, 10).map((d, i) => ({
    id: `cita_dia_${i}_${d.descripcion}`,
    titulo: d.titulo,
    descripcion: d.descripcion,
  }))

  await enviarLista({ gatewayUrl, instanceName, apiKey: '' }, telefonoPaciente, `📅 *Elige una fecha para tu cita con ${doctorNombre}:*`, opciones, 'Fechas disponibles')

  await pool.query(
    `UPDATE citas SET whatsapp_opciones = $2, updated_at = NOW() WHERE id = $1`,
    [citaId, JSON.stringify(dias.map((d, i) => ({ id: `cita_dia_${i}_${d.descripcion}`, fecha: d.descripcion })))]
  )
  return { ok: true }
}

export async function getCitasPendientesConfirmar(pool: any, medicoId?: string) {
  let query = `SELECT c.*, p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.email as paciente_email, p.telefono as paciente_telefono,
               m.nombre as medico_nombre, m.apellido as medico_apellido, m.whatsapp_telefono as medico_whatsapp
               FROM citas c
               LEFT JOIN pacientes p ON p.id = c.id_paciente
               LEFT JOIN medicos m ON m.id = c.id_medico
               WHERE c.estado = 'PENDIENTE_DE_COORDINACION'`
  const params: any[] = []
  if (medicoId) {
    query += ` AND c.id_medico = $1`
    params.push(medicoId)
  }
  query += ` ORDER BY c.created_at DESC`
  const result = await pool.query(query, params)
  return result.rows
}

export async function confirmarFechaHoraCita(
  pool: any,
  citaId: string,
  fecha: string,
  hora: string,
  confirmadoPor: 'paciente' | 'asistente' | 'medico'
) {
  const fechaHora = `${fecha}T${hora}:00`
  const result = await pool.query(
    `UPDATE citas
       SET fecha_hora = $2::timestamptz,
           estado = 'pendiente',
           updated_at = NOW()
     WHERE id = $1
       AND estado = 'PENDIENTE_DE_COORDINACION'
       AND fecha_hora IS NULL
     RETURNING *`,
    [citaId, fechaHora]
  )
  if (result.rows.length === 0) return { ok: false, error: 'Cita no encontrada o ya confirmada' }
  return { ok: true, cita: result.rows[0] }
}
