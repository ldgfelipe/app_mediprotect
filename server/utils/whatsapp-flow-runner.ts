import {
  getAvailableSpecialties,
  getDoctorsBySpecialty,
  getDiasDisponiblesParaMedico,
  getHorasDisponiblesParaMedico,
  createCitaFromWhatsApp,
  searchPatientByPhone,
  searchPatientById,
  searchDoctorByName,
  getDisponibilidadMedico,
  getAvailableDates,
  getAvailableHours,
  createCitaFromWhatsApp as createCita,
  createCitaFechaPorConfirmar,
  notificarDoctorWhatsApp,
  enviarOpcionesFechaHoraPaciente,
  getWhatsAppConfig,
} from './whatsapp-db'
import { parsearSolicitudCita } from './whatsapp-flow'
import { emitCitaEvento } from './socket-emitter'
import { getWhatsAppConfig as getWhatsAppConfigMain, enviarMensaje, enviarLista } from './whatsapp'

interface FlowDef {
  id: string
  nombre: string
  keywords: string[]
  definicion: any
}

export interface FlujoCtx {
  flowId: string
  nodeId: string | null
  vars: Record<string, any>
  esperando: boolean
}

interface Respuesta {
  texto: string
  nuevoEstado: string
  datosTemp: any
  botones?: { id: string; titulo: string }[]
  lista?: { titulo_seccion: string; opciones: { id: string; titulo: string; descripcion?: string }[] }
}

const FALLBACK_SIN_FLUJO = {
  texto: 'Disculpa, no entendí. ¿Puedes repetir tu mensaje?',
}

function norm(s: string): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function getEdges(def: any, sourceId: string) {
  return (def.edges || []).filter((e: any) => e.source === sourceId)
}

function siguienteNodo(def: any, sourceId: string, label?: string): string | null {
  const edges = getEdges(def, sourceId)
  if (label) {
    const byLabel = edges.find((e: any) => norm(e.label) === norm(label))
    if (byLabel) return byLabel.target
  }
  const first = edges[0]
  return first?.target || null
}

export function interpolar(texto: string, vars: Record<string, any>): string {
  return String(texto || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const v = vars[k]
    return v === undefined || v === null ? '' : String(v)
  })
}

function detectarFlujoPorKeywords(flows: FlowDef[], texto: string): FlowDef | null {
  const t = norm(texto)
  let mejor: FlowDef | null = null
  let mejorScore = -1
  for (const flow of flows) {
    for (const kw of flow.keywords || []) {
      const k = norm(kw)
      if (k === '*') {
        if (mejorScore < 0) { mejor = flow; mejorScore = 0 }
        continue
      }
      if (t === k) {
        if (100 > mejorScore) { mejor = flow; mejorScore = 100 }
      } else if (t.includes(k) && k.length >= 3 && k.length > mejorScore) {
        mejor = flow
        mejorScore = k.length
      }
    }
  }
  return mejor
}

export async function listarFlujosActivos(pool: any): Promise<FlowDef[]> {
  const r = await pool.query(
    `SELECT id, nombre, keywords, definicion FROM whatsapp_flows WHERE activo = true ORDER BY created_at ASC`
  )
  return r.rows.map((f: any) => ({ id: f.id, nombre: f.nombre, keywords: f.keywords, definicion: f.definicion }))
}

export async function obtenerFlujo(pool: any, id: string): Promise<FlowDef | null> {
  const r = await pool.query(
    `SELECT id, nombre, keywords, definicion FROM whatsapp_flows WHERE id = $1`,
    [id]
  )
  const f = r.rows[0]
  if (!f) return null
  return { id: f.id, nombre: f.nombre, keywords: f.keywords, definicion: f.definicion }
}

function nodoInicial(def: any): string | null {
  const inicio = (def.nodes || []).find((n: any) => n.type === 'inicio')
  if (inicio) return siguienteNodo(def, inicio.id)
  return (def.nodes || [])[0]?.id || null
}

function aplicarRegex(texto: string, regex: string): string {
  if (!regex) return String(texto || '')
  try {
    const m = String(texto || '').match(new RegExp(regex, 'i'))
    return m ? m[1] || m[0] : ''
  } catch {
    return String(texto || '')
  }
}

function evaluarCampo(valor: any, operador: string, esperado: string): boolean {
  const v = String(valor === undefined || valor === null ? '' : valor)
  const e = norm(esperado)
  switch (operador) {
    case 'esVerdadero': return !!valor && v !== 'false'
    case 'existe': return !!valor && v !== ''
    case 'igual': return norm(v) === e
    case 'contiene': return norm(v).includes(e)
    case 'mayor': return Number(v) > Number(esperado || 0)
    case 'menor': return Number(v) < Number(esperado || 0)
    default: return true
  }
}

async function generarLista(pool: any, fuente: string, vars: Record<string, any>, config: any): Promise<{ id: string; titulo: string; descripcion?: string }[]> {
  switch (fuente) {
    case 'especialidades': {
      const rows = await getAvailableSpecialties(pool)
      return rows.map((e: string) => ({ id: e.toLowerCase().replace(/\s+/g, '_'), titulo: e }))
    }
    case 'doctores': {
      const rows = await getDoctorsBySpecialty(pool, vars[config.parametro] || config.parametro)
      return rows.map((d: any) => ({ id: d.id, titulo: `Dr. ${d.nombre} ${d.apellido}`, descripcion: `$${d.precio_regular || 'N/A'} MXN` }))
    }
    case 'fechas': {
      const rows = await getDiasDisponiblesParaMedico(pool, vars[config.parametro] || config.parametro)
      return rows.map((f: string) => ({ id: f, titulo: f }))
    }
    case 'horas': {
      const rows = await getHorasDisponiblesParaMedico(pool, vars[config.parametro] || config.parametro, vars[config.parametro2] || '')
      return rows.map((h: string) => ({ id: h, titulo: h }))
    }
    default:
      return []
  }
}

function formatoFecha(fecha: string): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const d = new Date(fecha + 'T12:00:00')
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`
}

function formatoHora(hora: string): string {
  const [h, m] = hora.split(':')
  const hour = parseInt(h)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${suffix}`
}

async function ejecutarAccion(
  pool: any,
  accion: string,
  vars: Record<string, any>,
  config: any,
  conv: any,
  nombre: string
): Promise<{ texto: string; vars: Record<string, any> }> {
  switch (accion) {
    case 'capturar_doctor': {
      const doctorId = vars.doctor_id
      if (!doctorId) return { texto: '', vars }
      const doctores = await getDoctorsBySpecialty(pool, vars.especialidad || '')
      const doctor = doctores.find((d: any) => d.id === doctorId)
      if (!doctor) return { texto: '', vars }
      const descuento = Number(doctor.porcentaje_descuento || 10)
      const precio = Number(doctor.precio_regular || 1000) * (1 - descuento / 100)
      return {
        texto: '',
        vars: {
          ...vars,
          doctor_id: doctor.id,
          doctor_nombre: `${doctor.nombre} ${doctor.apellido}`,
          precio: Math.round(precio),
          especialidad: doctor.especialidad || vars.especialidad,
        },
      }
    }
    case 'crear_cita': {
      const doctorId = vars.doctor_id
      const fecha = vars.fecha
      const hora = vars.hora
      const pendiente = !fecha && !hora
      const horarioIncompleto = Boolean(fecha) !== Boolean(hora)
      if (!doctorId || horarioIncompleto || (pendiente && config.crear_pendiente !== true)) {
        console.warn('[Flujo] crear_cita sin datos suficientes:', { doctorId, fecha, hora })
        return { texto: 'Faltan datos para crear la cita. Intenta de nuevo.', vars }
      }
      const paciente = await searchPatientByPhone(pool, conv.telefono)
      const cita = await createCitaFromWhatsApp(
        pool,
        doctorId,
        paciente?.id || null,
        fecha || null,
        hora || null,
        conv.telefono,
        conv.nombre_paciente || nombre || 'Paciente WhatsApp',
        'PENDIENTE_DE_COORDINACION'
      )
      const pacienteNombre = conv.nombre_paciente || nombre || 'Paciente WhatsApp'
      emitCitaEvento('cita:created', {
        id: cita.id,
        paciente_id: paciente?.id,
        medico_id: doctorId,
        paciente_nombre: pacienteNombre,
        medico_nombre: vars.doctor_nombre || 'Médico seleccionado',
        estado: 'PENDIENTE_DE_COORDINACION',
        data: cita,
      })
      if (pendiente) {
        const texto = interpolar(
          config.texto || 'Registramos tu solicitud de cita con {{doctor_nombre}}. Un asistente te contactará por WhatsApp para ofrecerte opciones de fecha y hora.',
          { ...vars, doctor_nombre: vars.doctor_nombre || 'el médico seleccionado', folio: cita.folio }
        )
        return { texto, vars: { ...vars, cita_id: cita.id, folio: cita.folio } }
      }
      const precio = vars.precio_con_descuento || vars.precio || 'preferencial'
      const texto = interpolar(
        config.texto ||
          `✅ *¡Cita agendada!*\n\n📌 Folio: *{{folio}}*\n👨‍⚕️ {{doctor_nombre}}\n📅 {{fecha}}\n🕐 {{hora}}\n💰 ${{precio}} MXN\n\n*Instrucciones:*\n• Llegar 10 min antes\n• Traer identificación oficial\n• Presentar este folio en recepción`,
        { ...vars, folio: cita.folio, doctor_nombre: vars.doctor_nombre, fecha, hora, precio }
      )
      return { texto, vars: { ...vars, cita_id: cita.id, folio: cita.folio } }
    }
    case 'registrar_asistencia': {
      // MediProtect: el paciente responde "si" / "no" al recordatorio post-cita.
      // El nombre de las variables es configurable en el config del nodo.
      const campoCita = config.campo_cita || 'cita_id'
      const campoRespuesta = config.campo_respuesta || 'respuesta_asistencia'
      const citaId = vars[campoCita]
      const respuesta = String(vars[campoRespuesta] ?? config.respuesta ?? '').trim().toLowerCase()

      if (!citaId) {
        console.warn(`[Flujo] registrar_asistencia: falta la variable "${campoCita}" en vars`)
        return { texto: config.texto || '', vars }
      }
      if (respuesta !== 'si' && respuesta !== 'no') {
        console.warn(`[Flujo] registrar_asistencia: respuesta invalida "${respuesta}" (esperado si|no)`)
        return { texto: config.texto || '', vars }
      }

      const r = await pool.query(
        `UPDATE citas
            SET respuesta_paciente_asistio = $1,
                respuesta_paciente_at = NOW(),
                updated_at = NOW()
          WHERE id = $2
          RETURNING id, folio`,
        [respuesta, citaId]
      )

      if (r.rowCount === 0) {
        console.warn(`[Flujo] registrar_asistencia: no existe la cita ${citaId}`)
        return { texto: config.texto || '', vars }
      }

      console.log(`[Flujo] registrar_asistencia: cita ${citaId} -> ${respuesta}`)
      const texto = respuesta === 'si'
        ? (config.texto_si || 'Gracias por confirmar tu asistencia. ¡Nos vemos pronto! 🩺')
        : (config.texto_no || 'Entendido, lamentamos que no hayas podido asistir. ¿Quieres reagendar? Escribe *cita* y con gusto te ayudamos.')

      return { texto, vars: { ...vars, asistencia_registrada: true } }
    }
    case 'info_general': {
      return { texto: config.texto || 'Nosotros te ayudamos.', vars }
    }
    case 'buscar_paciente_por_id': {
      const pacienteId = vars.paciente_id || vars.pacienteId || config.paciente_id
      if (!pacienteId) return { texto: 'Falta ID de paciente', vars }
      const paciente = await searchPatientById(pool, pacienteId)
      if (!paciente) return { texto: 'Paciente no encontrado', vars }
      return {
        texto: '',
        vars: {
          ...vars,
          paciente_id: paciente.id,
          paciente_nombre: `${paciente.nombre} ${paciente.apellido}`,
          paciente_email: paciente.email,
          paciente_telefono: paciente.telefono,
        },
      }
    }
    case 'buscar_doctor_por_nombre': {
      const doctorNombre = vars.doctor_nombre || vars.doctorNombre || config.doctor_nombre
      if (!doctorNombre) return { texto: 'Falta nombre del médico', vars }
      const doctor = await searchDoctorByName(pool, doctorNombre)
      if (!doctor) return { texto: 'Médico no encontrado', vars }
      return {
        texto: '',
        vars: {
          ...vars,
          doctor_id: doctor.id,
          doctor_nombre: `${doctor.nombre} ${doctor.apellido}`,
          doctor_slug: doctor.slug,
          doctor_especialidad: doctor.especialidad,
          doctor_precio_regular: doctor.precio_regular,
          doctor_porcentaje_descuento: doctor.porcentaje_descuento,
        },
      }
    }
    case 'crear_cita_pendiente': {
      const doctorId = vars.doctor_id
      const pacienteId = vars.paciente_id
      const telefonoPaciente = conv.telefono
      const nombrePaciente = vars.paciente_nombre || conv.nombre_paciente || nombre || 'Paciente WhatsApp'
      if (!doctorId) return { texto: 'Falta ID de médico para crear cita', vars }
      const cita = await createCitaFechaPorConfirmar(pool, doctorId, pacienteId || null, telefonoPaciente, nombrePaciente)
      return {
        texto: '',
        vars: {
          ...vars,
          cita_id: cita.id,
          cita_folio: cita.folio,
          estado_cita: 'PENDIENTE_DE_COORDINACION',
        },
      }
    }
    case 'notificar_doctor_whatsapp': {
      const doctorId = vars.doctor_id
      const citaId = vars.cita_id
      if (!doctorId || !citaId) return { texto: 'Faltan datos para notificar al médico', vars }
      const configWhatsApp = await getWhatsAppConfig(pool)
      if (!configWhatsApp.gatewayUrl || !configWhatsApp.instanceName) {
        return { texto: 'WhatsApp no configurado', vars }
      }
      const medicoRes = await pool.query(
        `SELECT m.whatsapp_telefono, c.folio, c.whatsapp_nombre, c.whatsapp_telefono
         FROM medicos m
         JOIN citas c ON c.id_medico = m.id
         WHERE m.id = $1 AND c.id = $2`,
        [doctorId, citaId]
      )
      const medico = medicoRes.rows[0]
      if (!medico || !medico.whatsapp_telefono) {
        return { texto: 'Médico sin WhatsApp configurado', vars }
      }
      const textoNotificacion = `🔔 *Nueva solicitud de cita*\n\n📋 Folio: *${medico.folio}*\n👤 Paciente: ${medico.whatsapp_nombre || 'Paciente WhatsApp'}\n📱 Tel: ${medico.whatsapp_telefono || 'No disponible'}\n\n*Estado:* Fecha por confirmar\n\nResponde a este mensaje con *FECHAS* para enviar tus disponibilidades al paciente.`
      await enviarMensaje(
        { gatewayUrl: configWhatsApp.gatewayUrl, instanceName: configWhatsApp.instanceName, apiKey: configWhatsApp.apiKey },
        medico.whatsapp_telefono,
        textoNotificacion
      )
      return { texto: 'Médico notificado', vars }
    }
    case 'enviar_opciones_fecha_hora': {
      const doctorId = vars.doctor_id
      const citaId = vars.cita_id
      const telefonoPaciente = conv.telefono
      if (!doctorId || !citaId) return { texto: 'Faltan datos para enviar opciones', vars }
      const configWhatsApp = await getWhatsAppConfig(pool)
      if (!configWhatsApp.gatewayUrl || !configWhatsApp.instanceName) {
        return { texto: 'WhatsApp no configurado', vars }
      }
      const dias = await getDiasDisponiblesParaMedico(pool, doctorId)
      if (dias.length === 0) {
        return { texto: 'Médico sin disponibilidad', vars }
      }
      const opciones = dias.slice(0, 10).map((d, i) => ({
        id: `cita_dia_${i}_${d.descripcion}`,
        titulo: d.titulo,
        descripcion: d.descripcion,
      }))
      await enviarLista(
        { gatewayUrl: configWhatsApp.gatewayUrl, instanceName: configWhatsApp.instanceName, apiKey: configWhatsApp.apiKey },
        telefonoPaciente,
        `📅 *Elige una fecha para tu cita con ${vars.doctor_nombre || 'el médico'}:*`,
        opciones,
        'Fechas disponibles'
      )
      await pool.query(
        `UPDATE citas SET whatsapp_opciones = $2, updated_at = NOW() WHERE id = $1`,
        [citaId, JSON.stringify(dias.map((d, i) => ({ id: `cita_dia_${i}_${d.descripcion}`, fecha: d.descripcion })))]
      )
      return { texto: 'Opciones de fecha enviadas al paciente', vars }
    }
    default:
      return { texto: config.texto || 'Acción ejecutada.', vars }
  }
}

interface ResultadoFlujo {
  respuesta: Respuesta | null
  ctx: FlujoCtx
  matched: boolean
}

export async function ejecutarFlujo(
  pool: any,
  flow: FlowDef,
  ctx: FlujoCtx,
  conv: any,
  texto: string,
  nombre: string
): Promise<ResultadoFlujo> {
  const def = flow.definicion || {}
  const vars: Record<string, any> = { ...(ctx.vars || {}) }
  let nodeId: string | null = ctx.nodeId || nodoInicial(def)
  const textos: string[] = []
  let prompt: { modo: string; titulo: string; opciones: any[]; aviso?: string } | null = null
  let finFlow = false
  let esperando = false
  let guard = 0

  while (nodeId && guard++ < 40) {
    const node = (def.nodes || []).find((n: any) => n.id === nodeId)
    if (!node) break

    switch (node.type) {
      case 'inicio': {
        nodeId = siguienteNodo(def, node.id)
        continue
      }
      case 'mensaje': {
        textos.push(interpolar(node.config?.texto, vars))
        nodeId = siguienteNodo(def, node.id)
        continue
      }
      case 'capturar': {
        const valor = aplicarRegex(texto, node.config?.regex || '')
        if (node.config?.campo && valor !== '') {
          vars[node.config.campo] = valor
        }
        nodeId = siguienteNodo(def, node.id)
        continue
      }
      case 'pregunta': {
        const opciones = (node.config?.opciones || [])
        let indice: number | null = null
        const opMatch = texto.match(/^op_(\d+)(?:_.*)?$/)
        if (opMatch) indice = parseInt(opMatch[1])
        else {
          const num = texto.match(/^[1-9]\d{0,2}$/)
          if (num) indice = parseInt(num[1]) - 1
        }
        let destino: string | null = null
        let elegido: any = null
        if (indice !== null) {
          const op = opciones[indice]
          if (op) { elegido = op; destino = siguienteNodo(def, node.id, op.valor || op.label) }
        } else {
          const directa = opciones.find((o: any) => norm(o.label) === norm(texto) || norm(o.valor) === norm(texto))
          if (directa) { elegido = directa; destino = siguienteNodo(def, node.id, directa.valor || directa.label) }
        }
        // Si el nodo declara `campo`, la opcion elegida se guarda en vars
        // (ej. campo="respuesta_asistencia" -> vars.respuesta_asistencia = "si")
        if (elegido && destino && node.config?.campo) {
          vars[node.config.campo] = String(elegido.valor ?? elegido.label ?? '').trim().toLowerCase()
        }
        if (destino) {
          nodeId = destino
          continue
        }
        prompt = { modo: node.config?.modo || 'botones', titulo: interpolar(node.config?.titulo || 'Elige una opción:', vars), opciones }
        if (texto.trim() && opciones.length > 0) {
          prompt.aviso = `⚠️ No reconocí «${texto.trim()}». Elige una de las opciones:`
        }
        nodeId = node.id
        esperando = true
        break
      }
      case 'lista': {
        const fuente = node.config?.fuente || 'especialidades'
        const opciones = await generarLista(pool, fuente, vars, node.config || {})
        let indiceLista: number | null = null
        const listaMatch = texto.match(/^op_(\d+)(?:_.*)?$/)
        if (listaMatch) indiceLista = parseInt(listaMatch[1])
        else {
          const num = texto.match(/^[1-9]\d{0,2}$/)
          if (num) indiceLista = parseInt(num[1]) - 1
        }
        if (indiceLista !== null) {
          const op = opciones[indiceLista]
          if (op && node.config?.campo) vars[node.config.campo] = op.id
          else if (op) vars[node.config?.campo || 'seleccion'] = op.id
          nodeId = siguienteNodo(def, node.id)
          continue
        }
        const matchDirecto = opciones.find((o: any) => norm(o.titulo) === norm(texto) || norm(o.id) === norm(texto))
        if (matchDirecto && node.config?.campo) {
          vars[node.config.campo] = matchDirecto.id
          nodeId = siguienteNodo(def, node.id)
          continue
        }
        const parcial = texto.trim() ? opciones.find((o: any) => norm(o.titulo).includes(norm(texto)) || norm(texto).includes(norm(o.titulo))) : null
        if (parcial && node.config?.campo) {
          vars[node.config.campo] = parcial.id
          nodeId = siguienteNodo(def, node.id)
          continue
        }
        prompt = { modo: 'lista', titulo: interpolar(node.config?.titulo || 'Selecciona una opción:', vars), opciones }
        if (texto.trim() && opciones.length > 0) {
          prompt.aviso = `⚠️ No reconocí «${texto.trim()}». Toca una opción de la lista para continuar:`
        }
        nodeId = node.id
        esperando = true
        break
      }
      case 'condicion': {
        const valorActual = node.config?.campo === 'texto' ? texto : vars[node.config?.campo]
        const ok = evaluarCampo(valorActual, node.config?.operador || 'esVerdadero', node.config?.valor || '')
        nodeId = siguienteNodo(def, node.id, ok ? 'true' : 'false') || siguienteNodo(def, node.id)
        continue
      }
      case 'accion': {
        const res = await ejecutarAccion(pool, node.config?.accion || 'info_general', vars, node.config || {}, conv, nombre)
        textos.push(res.texto)
        Object.assign(vars, res.vars)
        nodeId = siguienteNodo(def, node.id)
        continue
      }
      case 'fin': {
        textos.push(interpolar(node.config?.texto ?? '¡Gracias por contactarnos!', vars))
        finFlow = true
        nodeId = null
        break
      }
      default: {
        nodeId = siguienteNodo(def, node.id)
        continue
      }
    }
  }

  const respuesta: Respuesta = {
    texto: textos.filter((t) => t && t.trim()).join('\n\n'),
    nuevoEstado: finFlow ? 'bienvenida' : 'flow',
    datosTemp: { ...conv.datos_temp, flow: { flowId: flow.id, nodeId, vars } },
  }

  if (prompt) {
    if (prompt.aviso) {
      respuesta.texto = (respuesta.texto ? respuesta.texto + '\n\n' : '') + prompt.aviso
    }
    if (!prompt.opciones || prompt.opciones.length === 0) {
      respuesta.texto = (respuesta.texto ? respuesta.texto + '\n\n' : '') + prompt.titulo
    } else if (prompt.modo === 'lista' && prompt.opciones.length > 0) {
      respuesta.lista = {
        titulo_seccion: prompt.titulo,
        opciones: prompt.opciones.map((o, i) => ({
          id: `op_${i}_${o.id}`,
          titulo: o.titulo,
          descripcion: o.descripcion,
        })),
      }
    } else {
      const opcionesReales = prompt.opciones.filter((o: any) => o && (o.label || o.titulo))
      if (opcionesReales.length === 0) {
        respuesta.texto = (respuesta.texto ? respuesta.texto + '\n\n' : '') + prompt.titulo
      } else if (opcionesReales.length <= 3) {
        respuesta.botones = opcionesReales.map((o: any, i: number) => ({ id: `op_${i}`, titulo: o.label || o.titulo }))
      } else {
        respuesta.lista = {
          titulo_seccion: prompt.titulo,
          opciones: opcionesReales.map((o: any, i: number) => ({ id: `op_${i}`, titulo: o.label || o.titulo })),
        }
      }
    }
  } else if (!respuesta.texto && !finFlow) {
    return { respuesta: null, ctx, matched: true }
  }

  const nuevoCtx: FlujoCtx = {
    flowId: flow.id,
    nodeId: finFlow ? null : (esperando ? null : nodeId),
    vars: finFlow ? {} : vars,
    esperando: esperando || !finFlow,
  }

  if (finFlow) {
    return {
      respuesta: { ...respuesta, nuevoEstado: 'bienvenida', datosTemp: {} },
      ctx: { flowId: flow.id, nodeId: null, vars: {}, esperando: false },
      matched: true,
    }
  }

  return { respuesta, ctx: nuevoCtx, matched: true }
}

export async function proseguirOIniciarFlujo(
  pool: any,
  conv: any,
  texto: string,
  nombre: string
): Promise<{ respuesta: Respuesta | null; flujoDetectado: boolean }> {
  const data = conv.datos_temp || {}
  const flowActual = data.flow as FlujoCtx | undefined

  // Parsear mensaje para extraer datos estructurados (pacienteId, doctor, email, etc.)
  const solicitudParseada = parsearSolicitudCita(texto)
  console.log('[DEBUG parsearSolicitudCita]', { texto: texto.substring(0, 200), solicitudParseada })

  // Construir vars iniciales con datos parseados
  const initialVars: Record<string, any> = {}
  if (solicitudParseada.pacienteId) initialVars.paciente_id = solicitudParseada.pacienteId
  if (solicitudParseada.doctor) initialVars.doctor_nombre = solicitudParseada.doctor
  if (solicitudParseada.nombre) initialVars.paciente_nombre = solicitudParseada.nombre
  if (solicitudParseada.email) initialVars.paciente_email = solicitudParseada.email
  if (solicitudParseada.telefono) initialVars.paciente_telefono = solicitudParseada.telefono
  console.log('[DEBUG initialVars]', initialVars)

  if (flowActual?.flowId && flowActual.nodeId) {
    const flow = await obtenerFlujo(pool, flowActual.flowId)
    if (flow) {
      const activos = await listarFlujosActivos(pool)
      const nuevo = detectarFlujoPorKeywords(activos, texto)
      const esKeywordExacta = !!nuevo && (activos.find((f) => f.id === nuevo.id)?.keywords || []).some((k) => norm(k) === norm(texto))
      if (nuevo && esKeywordExacta) {
        const res = await ejecutarFlujo(pool, nuevo, { flowId: nuevo.id, nodeId: null, vars: { ...initialVars }, esperando: false }, conv, texto, nombre)
        if (res.respuesta) return { respuesta: res.respuesta, flujoDetectado: true }
      } else {
        const res = await ejecutarFlujo(pool, flow, flowActual, conv, texto, nombre)
        if (res.respuesta) return { respuesta: res.respuesta, flujoDetectado: true }
      }
    }
  }

  const flows = await listarFlujosActivos(pool)
  if (flows.length === 0) return { respuesta: null, flujoDetectado: false }

  // Si el parser detectó una solicitud estructurada, priorizar el flujo dedicado
  // sin depender de keywords (el mensaje contiene ID paciente, doctor, email, teléfono).
  if (solicitudParseada.esSolicitudDirecta) {
    const flujoEstructurado = flows.find((f) => f.nombre === 'solicitud_estructurada')
    if (flujoEstructurado) {
      const res = await ejecutarFlujo(
        pool,
        flujoEstructurado,
        { flowId: flujoEstructurado.id, nodeId: null, vars: { ...initialVars }, esperando: false },
        conv,
        texto,
        nombre
      )
      return { respuesta: res.respuesta || { texto: FALLBACK_SIN_FLUJO.texto, nuevoEstado: 'bienvenida', datosTemp: {} }, flujoDetectado: true }
    }
  }

  const flow = detectarFlujoPorKeywords(flows, texto)
  if (!flow) {
    return { respuesta: { texto: FALLBACK_SIN_FLUJO.texto, nuevoEstado: conv.estado || 'bienvenida', datosTemp: data }, flujoDetectado: false }
  }

  const res = await ejecutarFlujo(pool, flow, { flowId: flow.id, nodeId: null, vars: { ...initialVars }, esperando: false }, conv, texto, nombre)
  return { respuesta: res.respuesta || { texto: FALLBACK_SIN_FLUJO.texto, nuevoEstado: 'bienvenida', datosTemp: {} }, flujoDetectado: true }
}