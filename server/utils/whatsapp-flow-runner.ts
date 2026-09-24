import {
  getAvailableSpecialties,
  getDoctorsBySpecialty,
  getDiasDisponiblesParaMedico,
  getHorasDisponiblesParaMedico,
  createCitaFromWhatsApp,
  searchPatientByPhone,
} from './whatsapp-db'

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
      if (!doctorId || !fecha || !hora) {
        return { texto: 'Faltan datos para crear la cita. Intenta de nuevo.', vars }
      }
      const paciente = await searchPatientByPhone(pool, conv.telefono)
      const cita = await createCitaFromWhatsApp(
        pool,
        doctorId,
        paciente?.id || null,
        fecha,
        hora,
        conv.telefono,
        conv.nombre_paciente || nombre || 'Paciente WhatsApp'
      )
      const precio = vars.precio_con_descuento || vars.precio || 'preferencial'
      const texto = interpolar(
        config.texto ||
          `✅ *¡Cita agendada!*\n\n📌 Folio: *{{folio}}*\n👨‍⚕️ {{doctor_nombre}}\n📅 {{fecha}}\n🕐 {{hora}}\n💰 ${{precio}} MXN\n\n*Instrucciones:*\n• Llegar 10 min antes\n• Traer identificación oficial\n• Presentar este folio en recepción`,
        { ...vars, folio: cita.folio, doctor_nombre: vars.doctor_nombre, fecha, hora, precio }
      )
      return { texto, vars: { ...vars, cita_id: cita.id, folio: cita.folio } }
    }
    case 'info_general': {
      return { texto: config.texto || 'Nosotros te ayudamos.', vars }
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
  let prompt: { modo: string; titulo: string; opciones: any[] } | null = null
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
        const idxMatch = texto.match(/^op_(\d+)$/)
        let destino: string | null = null
        if (idxMatch) {
          const idx = parseInt(idxMatch[1])
          const op = opciones[idx]
          if (op) destino = siguienteNodo(def, node.id, op.valor || op.label)
        } else {
          const directa = opciones.find((o: any) => norm(o.label) === norm(texto) || norm(o.valor) === norm(texto))
          if (directa) destino = siguienteNodo(def, node.id, directa.valor || directa.label)
        }
        if (destino) {
          nodeId = destino
          continue
        }
        prompt = { modo: node.config?.modo || 'botones', titulo: interpolar(node.config?.titulo || 'Elige una opción:', vars), opciones }
        nodeId = node.id
        esperando = true
        break
      }
      case 'lista': {
        const fuente = node.config?.fuente || 'especialidades'
        const opciones = await generarLista(pool, fuente, vars, node.config || {})
        const idxMatch = texto.match(/^op_(\d+)$/)
        if (idxMatch) {
          const idx = parseInt(idxMatch[1])
          const op = opciones[idx]
          if (op && node.config?.campo) vars[node.config.campo] = op.id
          nodeId = siguienteNodo(def, node.id)
          continue
        }
        prompt = { modo: 'lista', titulo: interpolar(node.config?.titulo || 'Selecciona una opción:', vars), opciones }
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
        textos.push(interpolar(node.config?.texto || '¡Gracias por contactarnos!', vars))
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
    texto: textos.join('\n\n'),
    nuevoEstado: finFlow ? 'bienvenida' : 'flow',
    datosTemp: { ...conv.datos_temp, flow: { flowId: flow.id, nodeId, vars } },
  }

  if (prompt) {
    if (prompt.modo === 'lista' && prompt.opciones.length > 0) {
      respuesta.lista = {
        titulo_seccion: prompt.titulo,
        opciones: prompt.opciones.map((o, i) => ({
          id: `op_${i}_${o.id}`,
          titulo: o.titulo,
          descripcion: o.descripcion,
        })),
      }
    } else {
      const opcionesReales = prompt.opciones.filter(Boolean)
      if (opcionesReales.length <= 3) {
        respuesta.botones = opcionesReales.map((o, i) => ({ id: `op_${i}`, titulo: o.label }))
      } else {
        respuesta.lista = {
          titulo_seccion: prompt.titulo,
          opciones: opcionesReales.map((o, i) => ({ id: `op_${i}`, titulo: o.label })),
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

  if (flowActual?.flowId && flowActual.nodeId) {
    const flow = await obtenerFlujo(pool, flowActual.flowId)
    if (flow) {
      const res = await ejecutarFlujo(pool, flow, flowActual, conv, texto, nombre)
      if (res.respuesta) return { respuesta: res.respuesta, flujoDetectado: true }
    }
  }

  const flows = await listarFlujosActivos(pool)
  if (flows.length === 0) return { respuesta: null, flujoDetectado: false }

  const flow = detectarFlujoPorKeywords(flows, texto)
  if (!flow) {
    return { respuesta: { texto: FALLBACK_SIN_FLUJO.texto, nuevoEstado: conv.estado || 'bienvenida', datosTemp: data }, flujoDetectado: false }
  }

  const res = await ejecutarFlujo(pool, flow, { flowId: flow.id, nodeId: null, vars: {}, esperando: false }, conv, texto, nombre)
  return { respuesta: res.respuesta || { texto: FALLBACK_SIN_FLUJO.texto, nuevoEstado: 'bienvenida', datosTemp: {} }, flujoDetectado: true }
}