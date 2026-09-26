<script setup>
import { useSocket } from '~/composables/useSocket'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ layout: false })

const usuario = ref(null)
const citas = ref([])
const loading = ref(true)
const filtroEstado = ref('')
const busqueda = ref('')
const citaSeleccionada = ref(null)
const bitacora = ref([])
const mensajesWA = ref([])
const showModal = ref(false)
const showNuevaCita = ref(false)
const notaText = ref('')
const newMsg = ref({ remitente: '', destinatario: '', telefono: '', mensaje: '' })

// Nueva cita form
const nuevaCita = ref({
  wa_text: '',
  paciente_search: '',
  medico_search: '',
  fecha: '',
  hora: '',
  notas: '',
})
const pacientesSearch = ref([])
const pacienteSeleccionado = ref(null)
const medicosSearch = ref([])
const medicoSeleccionado = ref(null)
const creandoCita = ref(false)

const tokenCookie = useCookie('token')
const adminTokenCookie = useCookie('admin_token')
const authToken = computed(() => tokenCookie.value || adminTokenCookie.value)
const errorCita = ref('')
const parseando = ref(false)
const pasoActual = ref(1)
const buscandoMedico = ref(false)

// Pestañas
const activeTab = ref('citas')

// Vista: calendario (default) o lista
const vistaCitas = ref('calendar')
if (process.client) {
  const savedView = localStorage.getItem('vistaCitas')
  vistaCitas.value = savedView || 'calendar'
}

watchEffect(() => {
  if (process.client) {
    localStorage.setItem('vistaCitas', vistaCitas.value)
  }
})

// Buscador de médicos (pestaña Médicos)
const medicoBusqueda = ref('')
const medicoResults = ref([])
const medicoSeleccionadoPerfil = ref(null)
const buscandoPerfilMedico = ref(false)

function abrirNuevaCita() {
  showNuevaCita.value = true
  pasoActual.value = 1
  pacienteSeleccionado.value = null
  medicoSeleccionado.value = null
  nuevaCita.value = { wa_text: '', paciente_search: '', medico_search: '', fecha: '', hora: '', notas: '' }
  errorCita.value = ''
  pacientesSearch.value = []
  medicosSearch.value = []
}

function siguientePaso() {
  if (pasoActual.value === 2 && !nuevaCita.value.medico_search.trim()) {
    errorCita.value = 'Escribe el nombre del médico'
    return
  }
  errorCita.value = ''
  if (pasoActual.value < 3) pasoActual.value++
}

function pasoAnterior() {
  if (pasoActual.value > 1) pasoActual.value--
}

const { on, onReconnect, disconnect } = useSocket()
const { agregar } = useNotifications()

useSmartPolling('asistente-citas', cargarCitas, { fastInterval: 10000, slowInterval: 20000 })

onMounted(() => {
  const saved = localStorage.getItem('usuario')
  if (!saved) { navigateTo('/login-asistente'); return }
  usuario.value = JSON.parse(saved)
  cargarCitas()
  $fetch('/api/paquetes').then(d => { paquetesLista.value = d?.paquetes || [] }).catch(() => {})

  on('cita:created', (cita) => {
    cargarCitas()
    agregar({ tipo: 'cita_created', titulo: 'Nueva cita', mensaje: `${cita.paciente_nombre || 'Paciente'} - ${cita.medico_nombre || 'M\u00e9dico por asignar'}`, timestamp: new Date() })
  })
  on('cita:updated', (cita) => {
    cargarCitas()
    agregar({ tipo: 'cita_updated', titulo: 'Cita actualizada', mensaje: `${cita.paciente_nombre || 'Paciente'} - Estado: ${cita.estado}`, timestamp: new Date() })
  })
  on('cita:confirmed', (cita) => {
    cargarCitas()
    agregar({ tipo: 'cita_confirmed', titulo: 'Cita confirmada', mensaje: `${cita.paciente_nombre || 'Paciente'} confirmada`, timestamp: new Date() })
  })
  on('cita:cancelled', (cita) => {
    cargarCitas()
    agregar({ tipo: 'cita_cancelled', titulo: 'Cita cancelada', mensaje: `${cita.paciente_nombre || 'Paciente'} cancelada`, timestamp: new Date() })
  })
  on('paciente:created', (data) => {
    cargarCitas()
    agregar({ tipo: 'paciente_created', titulo: 'Nuevo paciente', mensaje: `${data.nombre || ''} ${data.apellido || ''}`, timestamp: new Date() })
  })
  on('paciente:updated', (data) => {
    cargarCitas()
    agregar({ tipo: 'paciente_updated', titulo: 'Paciente actualizado', mensaje: `${data.nombre || ''} ${data.apellido || ''}`, timestamp: new Date() })
  })
  on('medico:created', (data) => {
    cargarCitas()
    agregar({ tipo: 'medico_created', titulo: 'Nuevo m\u00e9dico', mensaje: `${data.nombre || ''} ${data.apellido || ''}`, timestamp: new Date() })
  })
  onReconnect(() => {
    console.log('[WS] Reconectado, recargando datos...')
    cargarCitas()
  })
})

async function cargarCitas() {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (filtroEstado.value) qs.set('estado', filtroEstado.value)
    if (busqueda.value) qs.set('search', busqueda.value)
    const data = await $fetch('/api/asistente/citas?' + qs.toString(), {
      headers: { Authorization: 'Bearer ' + authToken.value }
    })
    citas.value = data?.citas || []
  } catch (e) { console.error(e) }
  loading.value = false
}

// Parse WhatsApp message
async function parsearMensaje() {
  const text = nuevaCita.value.wa_text
  if (!text.trim()) return
  parseando.value = true
  errorCita.value = ''
  console.log('[Asistente] Parseando mensaje:', text.substring(0, 300))

  // Extract doctor name
  const medicoMatch = text.match(/(?:con\s+(?:el\s+)?(?:m[eé]dico|doctor|dra?\.?)\s+)([^\n.,;]+)/i)
    || text.match(/(?:m[eé]dico|doctor|dra?\.?)\s+(?:es\s+|:?\s*)([^\n.,;]+)/i)
    || text.match(/(?:dr(?:a?)\.?\s+)([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s*[.,;]|$)/i)
  if (medicoMatch) {
    const nombreLimpio = medicoMatch[1].trim().replace(/^(dra?\.?\s*)/i, '').trim()
    nuevaCita.value.medico_search = nombreLimpio
    await buscarMedicoConDisponibilidadDirecto(nombreLimpio)
  }

  // Extract ALL possible patient identifiers from the text
  const busquedas = []

  // Email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (emailMatch) busquedas.push(emailMatch[1].trim())

  // UUID
  const uuidMatch = text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (uuidMatch) busquedas.push(uuidMatch[1].trim())

  // Phone - multiple patterns for WhatsApp messages
  const phoneMatch = text.match(/(?:tel(?:[eé]fono)?|cel(?:ular)?|phone|movil|m[oó]vil)[:\s]*(\d{10,12})/i)
    || text.match(/(\d{10})/)
    || text.match(/(\d{2,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/)
  if (phoneMatch) {
    const digits = phoneMatch[1].replace(/[^0-9]/g, '')
    if (digits.length >= 10) busquedas.push(digits)
  }

  // Name patterns: "soy [Name]", "nombre es: [Name]", "nombre: [Name]", "paciente: [Name]"
  const nombreMatch = text.match(/soy\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+y\s+(?:solicita|requiere))/i)
    || text.match(/(?:nombre\s*(?:es|:))\s+([^\n.,]+)/i)
    || text.match(/paciente:\s*([^\n.,]+)/i)
    || text.match(/(?:me\s+llamo)\s+([^\n.,]+)/i)
  if (nombreMatch) busquedas.push(nombreMatch[1].trim())

  console.log('[Asistente] Busquedas extraídas:', busquedas)

  // Try each search until we find a patient
  for (const termino of busquedas) {
    if (pacienteSeleccionado.value) break
    if (termino.length < 2) continue
    console.log('[Asistente] Buscando:', termino)
    nuevaCita.value.paciente_search = termino
    await buscarPacientesById()
  }

  parseando.value = false
  if (pacienteSeleccionado.value) {
    pasoActual.value = 2
    console.log('[Asistente] Paciente seleccionado:', pacienteSeleccionado.value.nombre, pacienteSeleccionado.value.apellido)
  } else {
    errorCita.value = 'No se encontró paciente. Busca manualmente por nombre, email o teléfono.'
    console.log('[Asistente] No se encontró paciente con:', busquedas)
  }
}

async function buscarPacientesById() {
  const termino = nuevaCita.value.paciente_search.trim()
  if (!termino) { pacientesSearch.value = []; return }
  console.log('[Asistente] Buscando paciente por:', termino)
  errorCita.value = ''
  try {
    const data = await $fetch('/api/asistente/pacientes?search=' + encodeURIComponent(termino), {
      headers: { Authorization: 'Bearer ' + authToken.value }
    })
    console.log('[Asistente] Resultado:', data)
    pacientesSearch.value = data?.pacientes || []
    if (pacientesSearch.value.length === 1) {
      seleccionarPaciente(pacientesSearch.value[0])
    }
  } catch (e) {
    console.error('[Asistente] Error buscando paciente:', e)
    errorCita.value = 'Error del servidor: ' + (e?.data?.message || e?.message || 'Desconocido')
    pacientesSearch.value = []
  }
}

async function buscarPacientesByIdDirecto() {
  const termino = nuevaCita.value.paciente_search.trim()
  if (!termino) return
  errorCita.value = ''
  pacientesSearch.value = []

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termino)

  if (isUUID) {
    console.log('[Asistente] Buscando por ID directo:', termino)
    try {
      const data = await $fetch('/api/asistente/pacientes/' + termino, {
        headers: { Authorization: 'Bearer ' + authToken.value }
      })
      console.log('[Asistente] Resultado ID directo:', data)
      if (data?.paciente) {
        seleccionarPaciente(data.paciente)
        return
      }
    } catch (e) {
      console.error('[Asistente] Error ID directo:', e)
      errorCita.value = e?.data?.message || 'Paciente no encontrado con ID: ' + termino
    }
  } else {
    await buscarPacientesById()
  }

  if (!pacienteSeleccionado.value && pacientesSearch.value.length > 1) {
  } else if (!pacienteSeleccionado.value && pacientesSearch.value.length === 0) {
    errorCita.value = `No se encontró paciente con "${termino}"`
  }
}

let pacienteSearchTimeout = null
async function buscarPacientes() {
  const termino = nuevaCita.value.paciente_search.trim()
  if (!termino || termino.length < 2) { pacientesSearch.value = []; return }
  if (pacienteSearchTimeout) clearTimeout(pacienteSearchTimeout)
  pacienteSearchTimeout = setTimeout(async () => {
    try {
      const data = await $fetch('/api/asistente/pacientes?search=' + encodeURIComponent(termino), {
        headers: { Authorization: 'Bearer ' + authToken.value }
      })
      pacientesSearch.value = data?.pacientes || []
      if (pacientesSearch.value.length === 1) {
        seleccionarPaciente(pacientesSearch.value[0])
      }
    } catch (e) {
      console.error('[Asistente] Error buscarPacientes:', e)
      pacientesSearch.value = []
    }
  }, 350)
}

let searchTimeout = null
async function buscarMedicoConDisponibilidad() {
  const termino = nuevaCita.value.medico_search.trim()
  if (!termino || termino.length < 2) {
    medicosSearch.value = []
    medicoSeleccionado.value = null
    return
  }

  if (searchTimeout) clearTimeout(searchTimeout)
  buscandoMedico.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const data = await $fetch('/api/medicos/buscar?q=' + encodeURIComponent(termino), {
        headers: { Authorization: 'Bearer ' + authToken.value }
      })
      medicosSearch.value = data.medicos || []
    } catch (e) {
      console.error('Error buscando médico:', e)
      medicosSearch.value = []
    }
    buscandoMedico.value = false
  }, 400)
}

async function buscarMedicoConDisponibilidadDirecto(termino) {
  if (!termino || termino.length < 2) {
    medicosSearch.value = []
    return
  }
  buscandoMedico.value = true
  try {
    const data = await $fetch('/api/medicos/buscar?q=' + encodeURIComponent(termino), {
      headers: { Authorization: 'Bearer ' + authToken.value }
    })
    medicosSearch.value = data.medicos || []
    // Si solo hay un resultado, seleccionarlo automáticamente
    if (medicosSearch.value.length === 1) {
      seleccionarMedico(medicosSearch.value[0])
    }
  } catch (e) {
    medicosSearch.value = []
  }
  buscandoMedico.value = false
}

function seleccionarMedico(medico) {
  medicoSeleccionado.value = medico
  nuevaCita.value.medico_search = `${medico.titulo || 'Dr.'} ${medico.nombre} ${medico.apellido}`
  medicosSearch.value = []
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO)
  const opciones = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  return fecha.toLocaleDateString('es-MX', opciones)
}

function estadoBadge(estado) {
  const colores = {
    pendiente: '#fdcb6e',
    confirmada: '#00b894',
    paciente_llego: '#0984e3',
    en_atencion: '#6c5ce7',
    asistida: '#00cec9',
    no_asistida: '#d63031',
    cancelada: '#b2bec3',
    reagendada: '#e17055',
    PENDIENTE_DE_COORDINACION: '#fdcb6e'
  }
  return colores[estado] || '#636e72'
}

// Funciones para pestaña de Médicos
let perfilSearchTimeout = null
async function buscarPerfilMedico() {
  const termino = medicoBusqueda.value.trim()
  if (!termino || termino.length < 2) {
    medicoResults.value = []
    medicoSeleccionadoPerfil.value = null
    return
  }

  if (perfilSearchTimeout) clearTimeout(perfilSearchTimeout)
  perfilSearchTimeout = setTimeout(async () => {
    buscandoPerfilMedico.value = true
    try {
      const data = await $fetch('/api/medicos/buscar?q=' + encodeURIComponent(termino), {
        headers: { Authorization: 'Bearer ' + authToken.value }
      })
      medicoResults.value = data.medicos || []
    } catch (e) {
      medicoResults.value = []
    }
    buscandoPerfilMedico.value = false
  }, 400)
}

function seleccionarPerfilMedico(medico) {
  medicoSeleccionadoPerfil.value = medico
  medicoResults.value = []
}

function cerrarPerfilMedico() {
  medicoSeleccionadoPerfil.value = null
  medicoBusqueda.value = ''
}

function formatearFechaCita(fechaISO) {
  const fecha = new Date(fechaISO)
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
  return fecha.toLocaleDateString('es-MX', opciones)
}

function seleccionarPaciente(p) {
  pacienteSeleccionado.value = { ...p }
  nuevaCita.value.paciente_search = p.nombre + ' ' + p.apellido
  pacientesSearch.value = []
  pasoActual.value = 2
}

async function crearCita() {
  errorCita.value = ''
  if (!pacienteSeleccionado.value) { errorCita.value = 'Selecciona un paciente en el paso 1'; pasoActual.value = 1; return }
  if (!nuevaCita.value.medico_search.trim()) { errorCita.value = 'Escribe el nombre del médico'; pasoActual.value = 2; return }
  if (!nuevaCita.value.fecha || !nuevaCita.value.hora) { errorCita.value = 'Selecciona fecha y hora'; return }
  creandoCita.value = true
  try {
    const fecha_hora = nuevaCita.value.fecha + 'T' + nuevaCita.value.hora + ':00'
    const body = {
      id_paciente: pacienteSeleccionado.value.id,
      medico_nombre: nuevaCita.value.medico_search.trim(),
      fecha_hora,
      notas_asistente: nuevaCita.value.notas || nuevaCita.value.wa_text,
    }
    // Si se seleccionó un médico de la búsqueda, incluir su ID
    if (medicoSeleccionado.value) {
      body.id_medico = medicoSeleccionado.value.id
    }
    await $fetch('/api/asistente/citas', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + authToken.value },
      body
    })
    showNuevaCita.value = false
    pasoActual.value = 1
    nuevaCita.value = { wa_text: '', paciente_search: '', medico_search: '', fecha: '', hora: '', notas: '' }
    pacienteSeleccionado.value = null
    medicoSeleccionado.value = null
    await cargarCitas()
  } catch (e) {
    errorCita.value = e.data?.message || 'Error al crear cita'
  }
  creandoCita.value = false
}

async function abrirCita(cita) {
  citaSeleccionada.value = cita
  showModal.value = true
  try {
    const data = await $fetch('/api/asistente/citas/' + cita.id + '/bitacora', {
      headers: { Authorization: 'Bearer ' + authToken.value }
    })
    bitacora.value = data?.bitacora || []
    mensajesWA.value = data?.mensajes_whatsapp || []
  } catch (e) { console.error(e) }
}

const actionLoading = ref(null)
const actionSuccess = ref('')

async function cambiarEstado(estado, descripcion) {
  if (!citaSeleccionada.value) return
  actionLoading.value = estado
  actionSuccess.value = ''
  try {
    await $fetch('/api/asistente/citas/' + citaSeleccionada.value.id + '/estado', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + authToken.value },
      body: { estado, descripcion }
    })
    actionSuccess.value = `✓ ${estado === 'confirmada' ? 'Cita confirmada' : estado === 'cancelada' ? 'Cita cancelada' : 'Estado actualizado'}`
    setTimeout(() => { actionSuccess.value = '' }, 3000)
    await abrirCita(citaSeleccionada.value)
    await cargarCitas()
  } catch (e) {
    alert(e.data?.message || 'Error al cambiar estado')
  }
  actionLoading.value = null
}

async function agregarNota() {
  if (!notaText.value.trim() || !citaSeleccionada.value) return
  try {
    await $fetch('/api/asistente/citas/' + citaSeleccionada.value.id + '/estado', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + authToken.value },
      body: { estado: citaSeleccionada.value.estado, descripcion: notaText.value }
    })
    notaText.value = ''
    await abrirCita(citaSeleccionada.value)
  } catch (e) { alert(e.data?.message || 'Error') }
}

async function registrarMensaje() {
  if (!newMsg.value.mensaje.trim()) return
  try {
    await $fetch('/api/asistente/whatsapp', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + authToken.value },
      body: { id_cita: citaSeleccionada.value?.id, ...newMsg.value }
    })
    newMsg.value = { remitente: '', destinatario: '', telefono: '', mensaje: '' }
    await abrirCita(citaSeleccionada.value)
  } catch (e) { alert(e.data?.message || 'Error') }
}

function abrirWA(tel) {
  window.open('https://wa.me/' + tel.replace(/[^0-9]/g, ''), '_blank')
}

function cerrarSesion() {
  disconnect()
  localStorage.removeItem('usuario')
  authToken.value = null
  navigateTo('/login-asistente')
}

function estadoColor(estado) {
  const colors = { pendiente: '#fdcb6e', confirmada: '#0984e3', paciente_llego: '#00b894', en_atencion: '#6c5ce7', asistida: '#00b894', no_asistida: '#d63031', cancelada: '#b2bec3', reagendada: '#e17055', PENDIENTE_DE_COORDINACION: '#fdcb6e' }
  return colors[estado] || '#dfe6e9'
}

// ========== SECCION: MEDICOS (crear/buscar/editar) ==========
const searchMedico = ref('')
const resultadosMedicos = ref([])
const loadingSearchMedico = ref(false)
const showNuevoMedico = ref(false)
const editandoMedico = ref(false)
const medicoEditId = ref(null)
const especialidades = ref([])
const formMedico = ref({ nombre: '', apellido: '', email: '', telefono: '', cedula_profesional: '', titulo: 'Dr.', especialidad: '', usuario: '', password: '', curp: '', codigo_postal: '', colonia: '', consultorio_ciudad: '', consultorio_estado: '', comision_tipo: 1 })
const savingMedico = ref(false)
const errorMsgMedico = ref('')
const okMsgMedico = ref('')

function abrirEditarMedico(m) {
  formMedico.value = { nombre: m.nombre, apellido: m.apellido, email: m.email || '', telefono: m.telefono || '', cedula_profesional: m.cedula_profesional || '', titulo: m.titulo || 'Dr.', especialidad: m.especialidad_nombre || '', usuario: '', password: '', curp: m.curp || '', codigo_postal: m.codigo_postal || '', colonia: m.colonia || '', consultorio_ciudad: m.consultorio_ciudad || '', consultorio_estado: m.consultorio_estado || '', comision_tipo: m.comision_tipo || 1 }
  medicoEditId.value = m.id
  editandoMedico.value = true
  showNuevoMedico.value = true
  cargarConsultoriosMedico(m.id)
  resetConsultorioForm()
}

function cerrarFormMedico() {
  showNuevoMedico.value = false
  editandoMedico.value = false
  medicoEditId.value = null
  formMedico.value = { nombre: '', apellido: '', email: '', telefono: '', cedula_profesional: '', titulo: 'Dr.', especialidad: '', usuario: '', password: '', curp: '', codigo_postal: '', colonia: '', consultorio_ciudad: '', consultorio_estado: '', comision_tipo: 1 }
  errorMsgMedico.value = ''
  consultorios.value = []
  resetConsultorioForm()
}

let medicoSearchTimeout = null
function buscarMedicos() {
  if (medicoSearchTimeout) clearTimeout(medicoSearchTimeout)
  medicoSearchTimeout = setTimeout(async () => {
    const q = searchMedico.value.trim()
    if (!q || q.length < 2) { resultadosMedicos.value = []; return }
    loadingSearchMedico.value = true
    try {
      const data = await $fetch('/api/admin/medicos', { headers: { Authorization: 'Bearer ' + authToken.value } })
      const all = data?.medicos || []
      const s = q.toLowerCase()
      resultadosMedicos.value = all.filter(m =>
        `${m.nombre} ${m.apellido}`.toLowerCase().includes(s) ||
        m.email?.toLowerCase().includes(s) || m.cedula_profesional?.toLowerCase().includes(s) || m.especialidad_nombre?.toLowerCase().includes(s)
      )
    } catch (e) { console.error(e) }
    loadingSearchMedico.value = false
  }, 300)
}

async function guardarMedico() {
  errorMsgMedico.value = ''; okMsgMedico.value = ''
  if (!formMedico.value.nombre || !formMedico.value.apellido) { errorMsgMedico.value = 'Nombre y apellido son requeridos'; return }
  savingMedico.value = true
  try {
    let nuevoId = null
    if (editandoMedico.value && medicoEditId.value) {
      await $fetch(`/api/admin/medicos/${medicoEditId.value}`, { method: 'PUT', headers: { Authorization: 'Bearer ' + authToken.value }, body: formMedico.value })
      for (const c of consultorios.value) {
        try {
          if (c._new) { await $fetch('/api/admin/consultorios', { method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: { ...c, id_medico: medicoEditId.value } }) }
          else { await $fetch(`/api/admin/consultorios/${c.id}`, { method: 'PUT', headers: { Authorization: 'Bearer ' + authToken.value }, body: c }) }
        } catch {}
      }
      okMsgMedico.value = 'Medico actualizado correctamente'
    } else {
      const data = await $fetch('/api/admin/medicos', { method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: formMedico.value })
      nuevoId = data?.medico?.id || null
      if (nuevoId) {
        for (const c of consultorios.value) {
          try { await $fetch('/api/admin/consultorios', { method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: { ...c, id_medico: nuevoId } }) } catch {}
        }
      }
      okMsgMedico.value = 'Medico registrado correctamente'
    }
    if (nuevoId) {
      pendienteConfirmacion.value = { id: nuevoId, nombre: `Dr. ${formMedico.value.nombre} ${formMedico.value.apellido}`.trim(), _tipo: 'medico', _tab: 'medicos' }
    }
    cerrarFormMedico()
    await buscarMedicos()
    setTimeout(() => { okMsgMedico.value = '' }, 3000)
  } catch (e) { errorMsgMedico.value = e.data?.message || 'Error al guardar' }
  finally { savingMedico.value = false }
}

// ========== CONSULTORIOS (MULTI-UBICACIÓN) ==========
const consultorios = ref([])
const consultorioForm = ref({ nombre: '', direccion: '', codigo_postal: '', colonia: '', ciudad: '', estado: '', hospital_consultorio: '', google_maps_url: '', es_principal: false })
const editConsultorioId = ref(null)

function agregarConsultorio() {
  if (!consultorioForm.value.direccion && !consultorioForm.value.ciudad) return
  consultorios.value.push({ ...consultorioForm.value })
  resetConsultorioForm()
}

function eliminarConsultorio(idx) { consultorios.value.splice(idx, 1) }

function guardarConsultorioEdit() {
  if (!consultorioForm.value.direccion && !consultorioForm.value.ciudad) return
  if (editConsultorioId.value) {
    const idx = consultorios.value.findIndex(c => c.id === editConsultorioId.value)
    if (idx !== -1) consultorios.value[idx] = { ...consultorioForm.value, id: editConsultorioId.value }
  } else {
    consultorios.value.push({ ...consultorioForm.value, _new: true })
  }
  resetConsultorioForm()
}

function editarConsultorioItem(c) {
  editConsultorioId.value = c.id || null
  Object.assign(consultorioForm.value, { nombre: c.nombre || '', direccion: c.direccion || '', codigo_postal: c.codigo_postal || '', colonia: c.colonia || '', ciudad: c.ciudad || '', estado: c.estado || '', hospital_consultorio: c.hospital_consultorio || '', google_maps_url: c.google_maps_url || '', es_principal: c.es_principal || false })
}

function resetConsultorioForm() {
  editConsultorioId.value = null
  Object.assign(consultorioForm.value, { nombre: '', direccion: '', codigo_postal: '', colonia: '', ciudad: '', estado: '', hospital_consultorio: '', google_maps_url: '', es_principal: false })
}

async function cargarConsultoriosMedico(id_medico) {
  try {
    const data = await $fetch(`/api/admin/consultorios?id_medico=${id_medico}`, { headers: { Authorization: 'Bearer ' + authToken.value } })
    consultorios.value = data?.consultorios || []
  } catch { consultorios.value = [] }
}

function abrirGoogleMaps(url) { if (url) window.open(url, '_blank') }

// ========== SECCION: PACIENTES (crear/buscar/editar) ==========
const searchPacienteAdmin = ref('')
const resultadosPacientes = ref([])
const loadingSearchPaciente = ref(false)
const showNuevoPaciente = ref(false)
const editandoPaciente = ref(false)
const pacienteEditId = ref(null)
const formPaciente = ref({ nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '', fecha_nacimiento: '', genero: '', ciudad: '', curp: '', estado_civil: '', ocupacion: '', codigo_postal: '', estado: '', municipio: '', colonia: '', id_paquete: '', password: '' })
const savingPaciente = ref(false)
const errorMsgPaciente = ref('')
const okMsgPaciente = ref('')
const curpValidandoPaciente = ref(false)
const curpErrorPaciente = ref('')
const curpDatosPaciente = ref(null)
const paquetesLista = ref([])

let adminPacienteSearchTimeout = null
function buscarPacientesAdmin() {
  if (adminPacienteSearchTimeout) clearTimeout(adminPacienteSearchTimeout)
  adminPacienteSearchTimeout = setTimeout(async () => {
    const q = searchPacienteAdmin.value.trim()
    if (!q || q.length < 2) { resultadosPacientes.value = []; return }
    loadingSearchPaciente.value = true
    try {
      const data = await $fetch('/api/asistente/pacientes?search=' + encodeURIComponent(q), { headers: { Authorization: 'Bearer ' + authToken.value } })
      resultadosPacientes.value = data?.pacientes || []
    } catch (e) { console.error(e) }
    loadingSearchPaciente.value = false
  }, 300)
}

async function guardarPaciente() {
  errorMsgPaciente.value = ''; okMsgPaciente.value = ''
  if (!formPaciente.value.nombre || !formPaciente.value.email) { errorMsgPaciente.value = 'Nombre y email son requeridos'; return }
  savingPaciente.value = true
  try {
    const body = { ...formPaciente.value }
    if (!body.password) delete body.password
    if (!body.id_paquete) delete body.id_paquete
    let nuevoId = null
    if (editandoPaciente.value && pacienteEditId.value) {
      await $fetch(`/api/admin/pacientes/${pacienteEditId.value}`, { method: 'PUT', headers: { Authorization: 'Bearer ' + authToken.value }, body })
      okMsgPaciente.value = 'Paciente actualizado correctamente'
    } else {
      const data = await $fetch('/api/admin/pacientes', { method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body })
      nuevoId = data?.paciente?.id || null
      okMsgPaciente.value = 'Paciente registrado correctamente'
    }
    if (nuevoId) {
      pendienteConfirmacion.value = { id: nuevoId, nombre: `${body.nombre || ''} ${body.apellido_paterno || ''}`.trim(), _tipo: 'paciente', _tab: 'pacientes' }
    }
    cerrarFormPaciente()
    await buscarPacientesAdmin()
    setTimeout(() => { okMsgPaciente.value = '' }, 3000)
  } catch (e) { errorMsgPaciente.value = e.data?.message || 'Error al guardar' }
  finally { savingPaciente.value = false }
}

function abrirEditarPaciente(p) {
  formPaciente.value = { nombre: p.nombre, apellido_paterno: p.apellido_paterno || p.apellido || '', apellido_materno: p.apellido_materno || '', email: p.email || '', telefono: p.telefono || '', fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.slice(0,10) : '', genero: p.genero || '', ciudad: p.ciudad || '', curp: p.curp || '', estado_civil: p.estado_civil || '', ocupacion: p.ocupacion || '', codigo_postal: p.codigo_postal || '', estado: p.estado || '', municipio: p.municipio || '', colonia: p.colonia || '', id_paquete: '', password: '' }
  pacienteEditId.value = p.id
  editandoPaciente.value = true
  showNuevoPaciente.value = true
  curpDatosPaciente.value = null
  curpErrorPaciente.value = ''
}

function cerrarFormPaciente() {
  showNuevoPaciente.value = false
  editandoPaciente.value = false
  pacienteEditId.value = null
  formPaciente.value = { nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '', fecha_nacimiento: '', genero: '', ciudad: '', curp: '', estado_civil: '', ocupacion: '', codigo_postal: '', estado: '', municipio: '', colonia: '', id_paquete: '', password: '' }
  errorMsgPaciente.value = ''
  curpDatosPaciente.value = null
  curpErrorPaciente.value = ''
}

// ========== CURP VALIDATION (PACIENTE) ==========
async function validarCURPPaciente() {
  curpErrorPaciente.value = ''
  curpDatosPaciente.value = null
  const curp = formPaciente.value.curp.toUpperCase().trim()
  if (!curp || curp.length !== 18) { curpErrorPaciente.value = 'La CURP debe tener 18 caracteres'; return }
  curpValidandoPaciente.value = true
  try {
    const data = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) { curpErrorPaciente.value = data.error_msg || 'No se pudieron obtener datos'; return }
    curpDatosPaciente.value = data.response
    const s = data.response?.Solicitante || {}
    formPaciente.value.nombre = s.Nombres || formPaciente.value.nombre
    formPaciente.value.apellido_paterno = s.ApellidoPaterno || formPaciente.value.apellido_paterno
    formPaciente.value.apellido_materno = s.ApellidoMaterno || formPaciente.value.apellido_materno
    if (s.FechaNacimiento) {
      const parts = s.FechaNacimiento.split('/')
      if (parts.length === 3) formPaciente.value.fecha_nacimiento = `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    formPaciente.value.genero = s.ClaveSexo === 'H' ? 'masculino' : s.ClaveSexo === 'M' ? 'femenino' : formPaciente.value.genero
    if (s.EntidadNacimiento) formPaciente.value.estado = s.EntidadNacimiento
  } catch (e) {
    curpErrorPaciente.value = e?.data?.message || 'Error al validar CURP'
  }
  curpValidandoPaciente.value = false
}

// ========== SEPOMEX: CODIGO POSTAL (PACIENTE) ==========
const coloniasPaciente = ref([])
const coloniasPacienteLoading = ref(false)
let cpPacienteTimeout = null
watch(() => formPaciente.value.codigo_postal, (val) => {
  formPaciente.value.colonia = ''
  coloniasPaciente.value = []
  if (cpPacienteTimeout) clearTimeout(cpPacienteTimeout)
  if (!val || val.length !== 5 || !/^\d{5}$/.test(val)) return
  cpPacienteTimeout = setTimeout(() => buscarColoniasPaciente(val), 400)
})

async function buscarColoniasPaciente(cp) {
  coloniasPacienteLoading.value = true
  coloniasPaciente.value = []
  try {
    const data = await $fetch('/api/sepomex/colonias', { params: { zip_code: cp } })
    coloniasPaciente.value = data?.colonias || []
    if (data?.municipio && !formPaciente.value.municipio) formPaciente.value.municipio = data.municipio
    if (data?.ciudad && !formPaciente.value.ciudad) formPaciente.value.ciudad = data.ciudad
    if (data?.estado && !formPaciente.value.estado) formPaciente.value.estado = data.estado
  } catch (e) { coloniasPaciente.value = [] }
  coloniasPacienteLoading.value = false
}

function seleccionarColoniaPaciente(col) {
  formPaciente.value.colonia = typeof col === 'object' ? col.colonia : col
  coloniasPaciente.value = []
}

// ========== CURP VALIDATION (MEDICO) ==========
const curpValidandoMedico = ref(false)
const curpErrorMedico = ref('')
const curpDatosMedico = ref(null)

async function validarCURPMedico() {
  curpErrorMedico.value = ''
  curpDatosMedico.value = null
  const curp = formMedico.value.curp.toUpperCase().trim()
  if (!curp || curp.length !== 18) { curpErrorMedico.value = 'La CURP debe tener 18 caracteres'; return }
  curpValidandoMedico.value = true
  try {
    const data = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) { curpErrorMedico.value = data.error_msg || 'No se pudieron obtener datos'; return }
    curpDatosMedico.value = data.response
    const s = data.response?.Solicitante || {}
    if (s.Nombres) formMedico.value.nombre = s.Nombres
    if (s.ApellidoPaterno) formMedico.value.apellido = s.ApellidoPaterno + (s.ApellidoMaterno ? ' ' + s.ApellidoMaterno : '')
    if (s.EntidadNacimiento) formMedico.value.consultorio_estado = s.EntidadNacimiento
  } catch (e) {
    curpErrorMedico.value = e?.data?.message || 'Error al validar CURP'
  }
  curpValidandoMedico.value = false
}

// ========== SEPOMEX: CODIGO POSTAL (MEDICO) ==========
const coloniasMedico = ref([])
const coloniasMedicoLoading = ref(false)
let cpMedicoTimeout = null
watch(() => formMedico.value.codigo_postal, (val) => {
  formMedico.value.colonia = ''
  coloniasMedico.value = []
  if (cpMedicoTimeout) clearTimeout(cpMedicoTimeout)
  if (!val || val.length !== 5 || !/^\d{5}$/.test(val)) return
  cpMedicoTimeout = setTimeout(() => buscarColoniasMedico(val), 400)
})

async function buscarColoniasMedico(cp) {
  coloniasMedicoLoading.value = true
  coloniasMedico.value = []
  try {
    const data = await $fetch('/api/sepomex/colonias', { params: { zip_code: cp } })
    coloniasMedico.value = data?.colonias || []
    if (data?.ciudad && !formMedico.value.consultorio_ciudad) formMedico.value.consultorio_ciudad = data.ciudad
    if (data?.estado && !formMedico.value.consultorio_estado) formMedico.value.consultorio_estado = data.estado
  } catch (e) { coloniasMedico.value = [] }
  coloniasMedicoLoading.value = false
}

function seleccionarColoniaMedico(col) {
  formMedico.value.colonia = typeof col === 'object' ? col.colonia : col
  coloniasMedico.value = []
}

// ========== CONFIRMACIONES (correo + SMS) ==========
const pendienteConfirmacion = ref(null)
const confirmandoEmail = ref({})
const confirmandoSms = ref({})

async function enviarConfirmacionEmail(registro) {
  const key = `${registro._tipo}:${registro.id}`
  confirmandoEmail.value[key] = true
  try {
    const data = await $fetch('/api/admin/enviar-confirmacion', {
      method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: { id: registro.id, tipo: registro._tipo }
    })
    alert(data?.mensaje || 'Correo de confirmacion enviado')
  } catch (e) {
    alert(e?.data?.message || 'Error al enviar el correo')
  } finally {
    confirmandoEmail.value[key] = false
  }
}

async function enviarConfirmacionSms(registro) {
  const key = `${registro._tipo}:${registro.id}`
  confirmandoSms.value[key] = true
  try {
    const data = await $fetch('/api/admin/enviar-sms-confirmacion', {
      method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: { id: registro.id, tipo: registro._tipo }
    })
    alert(data?.mensaje || 'SMS de confirmacion enviado')
  } catch (e) {
    alert(e?.data?.message || 'Error al enviar el SMS')
  } finally {
    confirmandoSms.value[key] = false
  }
}

// ========== SECCION: EMPRESAS (crear/buscar/editar/asociar) ==========
const searchEmpresaAdmin = ref('')
const resultadosEmpresas = ref([])
const loadingSearchEmpresa = ref(false)
const showNuevaEmpresa = ref(false)
const editandoEmpresa = ref(false)
const empresaEditId = ref(null)
const formEmpresa = ref({ nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '', google_maps_url: '' })
const savingEmpresa = ref(false)
const errorMsgEmpresa = ref('')
const okMsgEmpresa = ref('')

const showEmpresaPacientes = ref(false)
const empresaSeleccionada = ref(null)
const pacientesEmpresa = ref([])
const allPacientesList = ref([])
const searchPacienteEmpresa = ref('')
const loadingPacientesEmpresa = ref(false)
const savingAsociar = ref(false)

let empresaSearchTimeout = null
function buscarEmpresasAdmin() {
  if (empresaSearchTimeout) clearTimeout(empresaSearchTimeout)
  empresaSearchTimeout = setTimeout(async () => {
    const q = searchEmpresaAdmin.value.trim()
    if (!q || q.length < 2) { resultadosEmpresas.value = []; return }
    loadingSearchEmpresa.value = true
    try {
      const data = await $fetch('/api/admin/empresas', { headers: { Authorization: 'Bearer ' + authToken.value } })
      const all = data?.empresas || []
      const s = q.toLowerCase()
      resultadosEmpresas.value = all.filter(e =>
        e.nombre?.toLowerCase().includes(s) || e.rfc?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s) || e.contacto_nombre?.toLowerCase().includes(s)
      )
    } catch (e) { console.error(e) }
    loadingSearchEmpresa.value = false
  }, 300)
}

async function guardarEmpresa() {
  errorMsgEmpresa.value = ''; okMsgEmpresa.value = ''
  if (!formEmpresa.value.nombre || !formEmpresa.value.email) { errorMsgEmpresa.value = 'Nombre y email son requeridos'; return }
  savingEmpresa.value = true
  try {
    let nuevoId = null
    if (editandoEmpresa.value && empresaEditId.value) {
      await $fetch(`/api/admin/empresas/${empresaEditId.value}`, { method: 'PUT', headers: { Authorization: 'Bearer ' + authToken.value }, body: formEmpresa.value })
      okMsgEmpresa.value = 'Empresa actualizada correctamente'
    } else {
      const data = await $fetch('/api/admin/empresas', { method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: formEmpresa.value })
      nuevoId = data?.empresa?.id || null
      okMsgEmpresa.value = 'Empresa registrada correctamente'
    }
    if (nuevoId) {
      pendienteConfirmacion.value = { id: nuevoId, nombre: formEmpresa.value.nombre, _tipo: 'empresa', _tab: 'empresas' }
    }
    cerrarFormEmpresa()
    await buscarEmpresasAdmin()
    setTimeout(() => { okMsgEmpresa.value = '' }, 3000)
  } catch (e) { errorMsgEmpresa.value = e.data?.message || 'Error al guardar' }
  finally { savingEmpresa.value = false }
}

function abrirEditarEmpresa(e) {
  formEmpresa.value = { nombre: e.nombre, rfc: e.rfc || '', email: e.email || '', telefono: e.telefono || '', contacto_nombre: e.contacto_nombre || '', direccion: e.direccion || '', ciudad: e.ciudad || '', estado: e.estado || '', google_maps_url: e.google_maps_url || '' }
  empresaEditId.value = e.id
  editandoEmpresa.value = true
  showNuevaEmpresa.value = true
}

function cerrarFormEmpresa() {
  showNuevaEmpresa.value = false
  editandoEmpresa.value = false
  empresaEditId.value = null
  formEmpresa.value = { nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '', google_maps_url: '' }
  errorMsgEmpresa.value = ''
}

async function abrirEmpresaPacientes(empresa) {
  empresaSeleccionada.value = empresa
  loadingPacientesEmpresa.value = true
  showEmpresaPacientes.value = true
  try {
    const [ep, ap] = await Promise.all([
      $fetch(`/api/admin/empresas/${empresa.id}/pacientes`, { headers: { Authorization: 'Bearer ' + authToken.value } }),
      $fetch('/api/admin/pacientes', { headers: { Authorization: 'Bearer ' + authToken.value } })
    ])
    pacientesEmpresa.value = ep?.pacientes || []
    allPacientesList.value = ap?.pacientes || []
  } catch (e) { console.error(e) }
  loadingPacientesEmpresa.value = false
}

const pacientesFiltradosEmpresa = computed(() => {
  if (!searchPacienteEmpresa.value) return allPacientesList.value
  const s = searchPacienteEmpresa.value.toLowerCase()
  return allPacientesList.value.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)
  )
})

const idsAsociados = computed(() => new Set(pacientesEmpresa.value.map(p => p.id_paciente)))

async function asociarPacienteAEmpresa(pacienteId) {
  savingAsociar.value = true
  try {
    await $fetch(`/api/admin/empresas/${empresaSeleccionada.value.id}/pacientes`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value }, body: { id_paciente: pacienteId }
    })
    await abrirEmpresaPacientes(empresaSeleccionada.value)
  } catch (e) { alert(e.data?.message || 'Error') }
  savingAsociar.value = false
}

async function desasociarPacienteEmpresa(pacienteId) {
  if (!confirm('¿Remover paciente de esta empresa?')) return
  try {
    await $fetch(`/api/admin/empresas/${empresaSeleccionada.value.id}/pacientes/${pacienteId}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + authToken.value }
    })
    await abrirEmpresaPacientes(empresaSeleccionada.value)
  } catch (e) { alert(e.data?.message || 'Error') }
}

async function crearPacienteParaEmpresa() {
  errorMsgPaciente.value = ''; okMsgPaciente.value = ''
  if (!formPaciente.value.nombre || !formPaciente.value.email) { errorMsgPaciente.value = 'Nombre y email son requeridos'; return }
  savingPaciente.value = true
  try {
    const data = await $fetch('/api/admin/pacientes', {
      method: 'POST', headers: { Authorization: 'Bearer ' + authToken.value },
      body: { ...formPaciente.value, id_empresa: empresaSeleccionada.value.id }
    })
    okMsgPaciente.value = 'Paciente creado y asociado a la empresa'
    formPaciente.value = { nombre: '', apellido: '', email: '', telefono: '', fecha_nacimiento: '', genero: '', ciudad: '', curp: '', codigo_postal: '', colonia: '', password: '' }
    showNuevoPaciente.value = false
    await abrirEmpresaPacientes(empresaSeleccionada.value)
    setTimeout(() => { okMsgPaciente.value = '' }, 3000)
  } catch (e) { errorMsgPaciente.value = e.data?.message || 'Error al guardar' }
  finally { savingPaciente.value = false }
}
</script>

<template>
  <div class="dashboard" v-if="usuario">
    <header class="header">
      <div class="header-inner">
        <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" />
        <nav>
          <button :class="{ active: activeTab === 'citas' }" @click="activeTab = 'citas'">Citas</button>
          <button :class="{ active: activeTab === 'medicos' }" @click="activeTab = 'medicos'">Medicos</button>
          <button :class="{ active: activeTab === 'pacientes' }" @click="activeTab = 'pacientes'">Pacientes</button>
          <button :class="{ active: activeTab === 'empresas' }" @click="activeTab = 'empresas'">Empresas</button>
        </nav>
        <div class="user-info">
          <NotificationBell />
          <span>{{ usuario.nombre }} {{ usuario.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>

    <main class="content">
      <!-- PESTAÑA: CITAS -->
      <div v-if="activeTab === 'citas'">
        <div class="content-header">
          <h1>Gestión de Citas</h1>
          <div class="header-actions">
            <div class="view-toggle">
              <button :class="{ active: vistaCitas === 'calendar' }" @click="vistaCitas = 'calendar'" title="Vista calendario">📅</button>
              <button :class="{ active: vistaCitas === 'list' }" @click="vistaCitas = 'list'" title="Vista lista">📋</button>
            </div>
            <button @click="abrirNuevaCita" class="btn-primary">+ Nueva Cita</button>
          </div>
        </div>

        <!-- Vista Calendario -->
        <CalendarioCitas
          v-if="vistaCitas === 'calendar'"
          :citas="citas"
          @seleccionar-cita="abrirCita"
        />

        <!-- Vista Lista -->
        <div v-if="vistaCitas === 'list'" class="citas-lista">
          <div class="filters">
            <input v-model="busqueda" placeholder="Buscar por paciente o médico..." @input="cargarCitas" />
            <select v-model="filtroEstado" @change="cargarCitas">
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="asistida">Asistidas</option>
              <option value="cancelada">Canceladas</option>
              <option value="no_asistida">No Asistidas</option>
            </select>
          </div>

          <div v-if="loading" class="loading">Cargando citas...</div>

          <div v-else-if="citas.length === 0" class="empty">
            <p>No hay citas para mostrar</p>
          </div>

          <div v-else class="citas-cards">
            <div
              v-for="cita in citas"
              :key="cita.id"
              class="cita-card"
              :style="{ borderLeftColor: estadoColor(cita.estado) }"
              @click="abrirCita(cita)"
            >
              <div class="cita-header">
                <span class="estado-badge" :style="{ background: estadoColor(cita.estado) }">{{ cita.estado }}</span>
                <span class="fecha">{{ formatearFecha(cita.fecha_hora) }}</span>
              </div>
              <div class="cita-body">
                <div class="cita-col">
                  <strong>Paciente:</strong> {{ cita.paciente_nombre }} {{ cita.paciente_apellido }}
                  <span v-if="cita.paciente_telefono" class="phone" @click.stop="abrirWA(cita.paciente_telefono)">📱 WhatsApp</span>
                </div>
                <div class="cita-col">
                  <strong>Médico:</strong> {{ cita.medico_nombre }} {{ cita.medico_apellido }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PESTAÑA: MÉDICOS -->
      <div v-if="activeTab === 'medicos'">
        <div class="content-header">
          <h1>Directorio de Medicos</h1>
          <button @click="showNuevoMedico = true" class="btn-primary">+ Nuevo Medico</button>
        </div>
        <div v-if="okMsgMedico" class="success-msg">{{ okMsgMedico }}</div>
        <div v-if="errorMsgMedico" class="error-msg">{{ errorMsgMedico }}</div>
        <div v-if="pendienteConfirmacion && pendienteConfirmacion._tab === 'medicos'" class="confirm-banner">
          <span class="confirm-banner-label">Nuevo medico registrado: <strong>{{ pendienteConfirmacion.nombre }}</strong></span>
          <div class="confirm-banner-actions">
            <button class="btn-confirm" @click="enviarConfirmacionEmail(pendienteConfirmacion)" :disabled="confirmandoEmail[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id]">
              {{ confirmandoEmail[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id] ? 'Enviando...' : '✉️ Enviar confirmacion de correo' }}
            </button>
            <button class="btn-confirm sms" @click="enviarConfirmacionSms(pendienteConfirmacion)" :disabled="confirmandoSms[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id]">
              {{ confirmandoSms[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id] ? 'Enviando...' : '📱 Enviar SMS (opcional)' }}
            </button>
            <button class="btn-confirm-close" @click="pendienteConfirmacion = null">&times;</button>
          </div>
        </div>

        <!-- Buscador -->
        <div class="medico-search-box">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              v-model="searchMedico"
              placeholder="Buscar por nombre, email, cedula o especialidad..."
              @input="buscarMedicos"
            />
            <span v-if="loadingSearchMedico" class="search-spinner"></span>
            <span v-else-if="searchMedico" class="search-clear" @click="searchMedico = ''; resultadosMedicos = []">&times;</span>
          </div>
        </div>

        <!-- Resultados de busqueda -->
        <div v-if="resultadosMedicos.length > 0 && !medicoSeleccionadoPerfil" class="medico-search-results">
          <div class="results-count">{{ resultadosMedicos.length }} medicos encontrados</div>
          <div v-for="medico in resultadosMedicos" :key="medico.id" class="medico-result-card">
            <div class="medico-card-avatar" :style="{ background: medico.especialidad_color ? '#' + medico.especialidad_color : '#0984e3' }">
              <img v-if="medico.foto_url" :src="medico.foto_url" :alt="medico.nombre" />
              <span v-else class="avatar-initials">{{ medico.nombre?.charAt(0) }}{{ medico.apellido?.charAt(0) }}</span>
            </div>
            <div class="medico-card-body" @click="seleccionarPerfilMedico(medico)">
              <div class="medico-card-name">{{ medico.titulo || 'Dr.' }} {{ medico.nombre }} {{ medico.apellido }}</div>
              <div class="medico-card-specialty">{{ medico.especialidad_nombre || 'Sin especialidad' }}</div>
              <div class="medico-card-meta">
                <span v-if="medico.cedula_profesional" class="meta-item">Ced. {{ medico.cedula_profesional }}</span>
                <span v-if="medico.email" class="meta-item">{{ medico.email }}</span>
                <span v-if="medico.telefono" class="meta-item">{{ medico.telefono }}</span>
              </div>
            </div>
            <div class="medico-card-actions">
              <div class="medico-card-stat"><span class="stat-num">{{ medico.citas?.length || 0 }}</span><span class="stat-text">citas</span></div>
              <button v-if="!medico.email_confirmado" class="btn-sm" title="Enviar confirmacion de correo" @click.stop="enviarConfirmacionEmail({ ...medico, _tipo: 'medico' })">✉️</button>
              <button v-if="!medico.telefono_confirmado && medico.telefono" class="btn-sm" title="Enviar confirmacion SMS" @click.stop="enviarConfirmacionSms({ ...medico, _tipo: 'medico' })">📱</button>
              <button class="btn-card-edit" @click.stop="abrirEditarMedico(medico)" title="Editar">Editar</button>
              <button class="btn-card-view" @click.stop="seleccionarPerfilMedico(medico)" title="Ver perfil">Ver</button>
            </div>
          </div>
        </div>

        <div v-if="searchMedico.length >= 2 && resultadosMedicos.length === 0 && !loadingSearchMedico && !medicoSeleccionadoPerfil" class="empty-results">
          <p>No se encontraron medicos con "{{ searchMedico }}"</p>
          <span>Intenta con otro nombre, email o especialidad</span>
        </div>

        <div v-if="searchMedico.length < 2 && !medicoSeleccionadoPerfil" class="empty-results">
          <p>Busca un medico por nombre, email, cedula o especialidad</p>
        </div>

        <!-- Perfil del médico seleccionado -->
        <div v-if="medicoSeleccionadoPerfil" class="medico-perfil">
          <button class="btn-back" @click="cerrarPerfilMedico">← Volver a búsqueda</button>

          <!-- Header del perfil -->
          <div class="perfil-header">
            <div class="perfil-avatar" :style="{ background: medicoSeleccionadoPerfil.especialidad_color ? '#' + medicoSeleccionadoPerfil.especialidad_color : '#0984e3' }">
              <img v-if="medicoSeleccionadoPerfil.foto_url" :src="medicoSeleccionadoPerfil.foto_url" :alt="medicoSeleccionadoPerfil.nombre" />
              <span v-else>{{ medicoSeleccionadoPerfil.nombre?.charAt(0) }}{{ medicoSeleccionadoPerfil.apellido?.charAt(0) }}</span>
            </div>
            <div class="perfil-info">
              <h2>{{ medicoSeleccionadoPerfil.titulo || 'Dr.' }} {{ medicoSeleccionadoPerfil.nombre }} {{ medicoSeleccionadoPerfil.apellido }}</h2>
              <span class="perfil-especialidad">{{ medicoSeleccionadoPerfil.especialidad_nombre }}</span>
              <div class="perfil-meta">
                <span v-if="medicoSeleccionadoPerfil.cedula_profesional">📋 Cédula: {{ medicoSeleccionadoPerfil.cedula_profesional }}</span>
                <span v-if="medicoSeleccionadoPerfil.email">✉️ {{ medicoSeleccionadoPerfil.email }}</span>
                <span v-if="medicoSeleccionadoPerfil.telefono">📱 {{ medicoSeleccionadoPerfil.telefono }}</span>
              </div>
            </div>
          </div>

          <!-- Datos del perfil -->
          <div class="perfil-grid">
            <div class="perfil-card" v-if="medicoSeleccionadoPerfil.bio">
              <h3>Biografía</h3>
              <p>{{ medicoSeleccionadoPerfil.bio }}</p>
            </div>

            <div class="perfil-card" v-if="medicoSeleccionadoPerfil.universidad">
              <h3>Formación</h3>
              <p>🎓 {{ medicoSeleccionadoPerfil.universidad }}</p>
            </div>

            <div class="perfil-card" v-if="medicoSeleccionadoPerfil.horario_atencion">
              <h3>Horario de Atención</h3>
              <p>🕐 {{ medicoSeleccionadoPerfil.horario_atencion }}</p>
            </div>

            <div class="perfil-card" v-if="medicoSeleccionadoPerfil.ciudad">
              <h3>Ubicación</h3>
              <p>📍 {{ medicoSeleccionadoPerfil.ciudad }}</p>
            </div>

            <div class="perfil-card" v-if="medicoSeleccionadoPerfil.precio_regular">
              <h3>Precios</h3>
              <p>
                <span v-if="medicoSeleccionadoPerfil.precio_miembro">Miembro: ${{ medicoSeleccionadoPerfil.precio_miembro }}</span>
                <span v-if="medicoSeleccionadoPerfil.precio_regular"> | Regular: ${{ medicoSeleccionadoPerfil.precio_regular }}</span>
              </p>
            </div>

            <div class="perfil-card" v-if="medicoSeleccionadoPerfil.idiomas && medicoSeleccionadoPerfil.idiomas.length">
              <h3>Idiomas</h3>
              <p>🗣️ {{ medicoSeleccionadoPerfil.idiomas.join(', ') }}</p>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="perfil-stats">
            <div class="stat-box">
              <span class="stat-number">{{ medicoSeleccionadoPerfil.estadisticas?.pendientes || 0 }}</span>
              <span class="stat-label">Pendientes</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">{{ medicoSeleccionadoPerfil.estadisticas?.confirmadas || 0 }}</span>
              <span class="stat-label">Confirmadas</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">{{ medicoSeleccionadoPerfil.estadisticas?.hoy || 0 }}</span>
              <span class="stat-label">Hoy</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">{{ medicoSeleccionadoPerfil.estadisticas?.total || 0 }}</span>
              <span class="stat-label">Total</span>
            </div>
          </div>

          <!-- Citas agendadas -->
          <div class="perfil-citas">
            <h3>Citas Agendadas</h3>
            <div v-if="medicoSeleccionadoPerfil.citas && medicoSeleccionadoPerfil.citas.length > 0" class="citas-timeline">
              <div v-for="cita in medicoSeleccionadoPerfil.citas" :key="cita.id" class="timeline-item">
                <div class="timeline-dot" :style="{ background: estadoBadge(cita.estado) }"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-fecha">{{ formatearFechaCita(cita.fecha_hora) }}</span>
                    <span class="timeline-estado" :style="{ background: estadoBadge(cita.estado) }">{{ cita.estado }}</span>
                  </div>
                  <div class="timeline-paciente">
                    <strong>{{ cita.paciente_nombre }} {{ cita.paciente_apellido }}</strong>
                    <span v-if="cita.paciente_telefono">📱 {{ cita.paciente_telefono }}</span>
                  </div>
                  <div v-if="cita.notas_paciente" class="timeline-notas">
                    📝 {{ cita.notas_paciente }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="citas-empty">
              <p>📅 No hay citas programadas para este médico</p>
            </div>
          </div>
        </div>

        <!-- Estado vacio -->
        <div v-if="!medicoSeleccionadoPerfil && resultadosMedicos.length === 0 && !loadingSearchMedico && searchMedico.length >= 2" class="empty-state">
          <p>No se encontraron medicos con "{{ searchMedico }}"</p>
        </div>

        <div v-if="!medicoSeleccionadoPerfil && searchMedico.length < 2" class="empty-state">
          <p>Escribe al menos 2 caracteres para buscar un medico</p>
        </div>
      </div>

      <!-- PESTAÑA: PACIENTES -->
      <div v-if="activeTab === 'pacientes'">
        <div class="content-header">
          <h1>Directorio de Pacientes</h1>
          <button @click="showNuevoPaciente = true" class="btn-primary">+ Nuevo Paciente</button>
        </div>
        <div v-if="okMsgPaciente" class="success-msg">{{ okMsgPaciente }}</div>
        <div v-if="errorMsgPaciente" class="error-msg">{{ errorMsgPaciente }}</div>
        <div v-if="pendienteConfirmacion && pendienteConfirmacion._tab === 'pacientes'" class="confirm-banner">
          <span class="confirm-banner-label">Nuevo paciente registrado: <strong>{{ pendienteConfirmacion.nombre }}</strong></span>
          <div class="confirm-banner-actions">
            <button class="btn-confirm" @click="enviarConfirmacionEmail(pendienteConfirmacion)" :disabled="confirmandoEmail[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id]">
              {{ confirmandoEmail[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id] ? 'Enviando...' : '✉️ Enviar confirmacion de correo' }}
            </button>
            <button class="btn-confirm sms" @click="enviarConfirmacionSms(pendienteConfirmacion)" :disabled="confirmandoSms[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id]">
              {{ confirmandoSms[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id] ? 'Enviando...' : '📱 Enviar SMS (opcional)' }}
            </button>
            <button class="btn-confirm-close" @click="pendienteConfirmacion = null">&times;</button>
          </div>
        </div>

        <div class="search-box"><input v-model="searchPacienteAdmin" @input="buscarPacientesAdmin" placeholder="Buscar por nombre, email o telefono..." /></div>
        <p v-if="loadingSearchPaciente" class="loading">Buscando...</p>

        <div v-if="resultadosPacientes.length > 0" class="results-list">
          <div v-for="p in resultadosPacientes" :key="p.id" class="result-card">
            <div class="result-avatar green"><span>{{ p.nombre?.charAt(0) }}{{ p.apellido?.charAt(0) }}</span></div>
            <div class="result-info"><strong>{{ p.nombre }} {{ p.apellido }}</strong><span>{{ p.email }}</span><span>{{ p.telefono || '' }}</span></div>
            <div class="result-actions">
              <span class="result-date">{{ p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX') : '' }}</span>
              <button v-if="!p.email_confirmado" class="btn-sm" title="Enviar confirmacion de correo" @click.stop="enviarConfirmacionEmail({ ...p, _tipo: 'paciente' })">✉️</button>
              <button v-if="!p.telefono_confirmado && p.telefono" class="btn-sm" title="Enviar confirmacion SMS" @click.stop="enviarConfirmacionSms({ ...p, _tipo: 'paciente' })">📱</button>
              <span v-if="p.email_confirmado" class="badge-confirmado" title="Correo confirmado">✔</span>
              <button class="btn-edit" @click.stop="abrirEditarPaciente(p)">Editar</button>
            </div>
          </div>
        </div>
        <div v-else-if="searchPacienteAdmin.length >= 2 && !loadingSearchPaciente" class="empty-state">No se encontraron pacientes</div>
        <div v-else class="empty-state">Escribe al menos 2 caracteres para buscar</div>
      </div>

      <!-- PESTAÑA: EMPRESAS -->
      <div v-if="activeTab === 'empresas'">
        <div class="content-header">
          <h1>Directorio de Empresas</h1>
          <button @click="showNuevaEmpresa = true" class="btn-primary">+ Nueva Empresa</button>
        </div>
        <div v-if="okMsgEmpresa" class="success-msg">{{ okMsgEmpresa }}</div>
        <div v-if="errorMsgEmpresa" class="error-msg">{{ errorMsgEmpresa }}</div>
        <div v-if="pendienteConfirmacion && pendienteConfirmacion._tab === 'empresas'" class="confirm-banner">
          <span class="confirm-banner-label">Nueva empresa registrada: <strong>{{ pendienteConfirmacion.nombre }}</strong></span>
          <div class="confirm-banner-actions">
            <button class="btn-confirm" @click="enviarConfirmacionEmail(pendienteConfirmacion)" :disabled="confirmandoEmail[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id]">
              {{ confirmandoEmail[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id] ? 'Enviando...' : '✉️ Enviar confirmacion de correo' }}
            </button>
            <button class="btn-confirm sms" @click="enviarConfirmacionSms(pendienteConfirmacion)" :disabled="confirmandoSms[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id]">
              {{ confirmandoSms[pendienteConfirmacion._tipo + ':' + pendienteConfirmacion.id] ? 'Enviando...' : '📱 Enviar SMS (opcional)' }}
            </button>
            <button class="btn-confirm-close" @click="pendienteConfirmacion = null">&times;</button>
          </div>
        </div>

        <div class="search-box"><input v-model="searchEmpresaAdmin" @input="buscarEmpresasAdmin" placeholder="Buscar por nombre, RFC, email o contacto..." /></div>
        <p v-if="loadingSearchEmpresa" class="loading">Buscando...</p>

        <div v-if="resultadosEmpresas.length > 0" class="results-list">
          <div v-for="e in resultadosEmpresas" :key="e.id" class="result-card" @click="abrirEmpresaPacientes(e)">
            <div class="result-avatar orange"><span>{{ e.nombre?.charAt(0) }}</span></div>
            <div class="result-info"><strong>{{ e.nombre }}</strong><span>{{ e.rfc || '' }} {{ e.contacto_nombre ? '· Contacto: ' + e.contacto_nombre : '' }}</span><span>{{ e.email || '' }}</span></div>
            <div class="result-actions">
              <button v-if="!e.email_confirmado" class="btn-sm" title="Enviar confirmacion de correo" @click.stop="enviarConfirmacionEmail({ ...e, _tipo: 'empresa' })">✉️</button>
              <button v-if="!e.telefono_confirmado && e.telefono" class="btn-sm" title="Enviar confirmacion SMS" @click.stop="enviarConfirmacionSms({ ...e, _tipo: 'empresa' })">📱</button>
              <span v-if="e.email_confirmado" class="badge-confirmado" title="Correo confirmado">✔</span>
              <button class="btn-sm blue" @click.stop="abrirEmpresaPacientes(e)">Pacientes</button>
              <button class="btn-edit" @click.stop="abrirEditarEmpresa(e)">Editar</button>
            </div>
          </div>
        </div>
        <div v-else-if="searchEmpresaAdmin.length >= 2 && !loadingSearchEmpresa" class="empty-state">No se encontraron empresas</div>
        <div v-else class="empty-state">Escribe al menos 2 caracteres para buscar</div>
      </div>
    </main>

    <!-- Modal NUEVA CITA -->
    <div v-if="showNuevaCita" class="modal-overlay" @click.self="showNuevaCita = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Nueva Cita</h2>
          <button @click="showNuevaCita = false" class="close">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="errorCita" class="error">{{ errorCita }}</div>

          <!-- Stepper -->
          <div class="stepper">
            <div class="step" :class="{ active: pasoActual === 1, done: pacienteSeleccionado }">
              <span class="step-num">1</span> Paciente
            </div>
            <div class="step-line" :class="{ done: pacienteSeleccionado }"></div>
            <div class="step" :class="{ active: pasoActual === 2, done: nuevaCita.medico_search.trim() }">
              <span class="step-num">2</span> Médico
            </div>
            <div class="step-line" :class="{ done: nuevaCita.medico_search.trim() }"></div>
            <div class="step" :class="{ active: pasoActual === 3 }">
              <span class="step-num">3</span> Fecha/Hora
            </div>
          </div>

          <!-- PASO 1: Buscar paciente -->
          <div v-if="pasoActual === 1">
            <!-- WhatsApp message paste -->
            <div class="field">
              <label>Mensaje de WhatsApp (copy/paste)</label>
              <textarea
                v-model="nuevaCita.wa_text"
                rows="4"
                placeholder="Pega aquí el mensaje completo de WhatsApp...&#10;&#10;Ejemplo:&#10;Hola, soy Juan Pérez. Mi ID es: abc-123-uuid&#10;Mi correo es: juan@email.com&#10;Mi teléfono: 5551234567&#10;Quiero cita con el Dr. Carlos Ramírez"
                style="font-family: inherit; font-size: 0.9rem;"
              ></textarea>
              <button
                @click="parsearMensaje"
                :disabled="parseando || !nuevaCita.wa_text.trim()"
                class="btn-parse"
              >
                {{ parseando ? 'Analizando...' : 'Analizar mensaje' }}
              </button>
            </div>

            <div style="text-align:center; color:#b2bec3; font-size:0.8rem; margin: 0.5rem 0;">
              \u2014 o busca manualmente \u2014
            </div>

            <!-- Direct ID search -->
            <div class="field">
              <label>ID del paciente</label>
              <div style="display:flex; gap:0.5rem;">
                <input
                  v-model="nuevaCita.paciente_search"
                  placeholder="UUID, nombre, email o teléfono..."
                  @input="buscarPacientes"
                  @keyup.enter="buscarPacientesByIdDirecto"
                  style="flex:1;"
                />
                <button @click="buscarPacientesByIdDirecto" :disabled="!nuevaCita.paciente_search.trim()" class="btn-sm blue">Buscar</button>
              </div>
            </div>

            <!-- Autocomplete dropdown -->
            <div v-if="pacientesSearch.length > 0 && !pacienteSeleccionado" class="autocomplete-dropdown">
              <div class="autocomplete-count">{{ pacientesSearch.length }} pacientes encontrados</div>
              <div v-for="p in pacientesSearch" :key="p.id" class="autocomplete-item" @click="seleccionarPaciente(p)">
                <div class="autocomplete-avatar green">{{ p.nombre?.charAt(0) }}{{ p.apellido?.charAt(0) }}</div>
                <div class="autocomplete-info">
                  <div class="autocomplete-name">{{ p.nombre }} {{ p.apellido }}</div>
                  <div class="autocomplete-meta">
                    <span v-if="p.email">{{ p.email }}</span>
                    <span v-if="p.telefono">{{ p.telefono }}</span>
                  </div>
                </div>
                <svg class="autocomplete-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
            <div v-if="nuevaCita.paciente_search.length >= 2 && pacientesSearch.length === 0 && !pacienteSeleccionado && !buscandoMedico" class="autocomplete-empty">
              No se encontraron pacientes con "{{ nuevaCita.paciente_search }}"
            </div>

            <!-- Resumen del paciente seleccionado -->
            <div v-if="pacienteSeleccionado" class="selected-patient">
              <div class="selected-patient-avatar">{{ pacienteSeleccionado.nombre?.charAt(0) }}{{ pacienteSeleccionado.apellido?.charAt(0) }}</div>
              <div class="selected-patient-info">
                <strong>{{ pacienteSeleccionado.nombre }} {{ pacienteSeleccionado.apellido }}</strong>
                <span v-if="pacienteSeleccionado.email">{{ pacienteSeleccionado.email }}</span>
                <span v-if="pacienteSeleccionado.telefono">{{ pacienteSeleccionado.telefono }}</span>
              </div>
              <button @click="pacienteSeleccionado = null; pasoActual = 1" class="btn-sm red">Cambiar</button>
            </div>

            <div v-if="pacienteSeleccionado" class="selected-card">
              <div class="selected-header">
                <span class="check">✓</span>
                <div>
                  <strong>{{ pacienteSeleccionado.nombre }} {{ pacienteSeleccionado.apellido }}</strong>
                  <div class="selected-details">
                    <span v-if="pacienteSeleccionado.telefono">📱 {{ pacienteSeleccionado.telefono }}</span>
                    <span v-if="pacienteSeleccionado.email">✉️ {{ pacienteSeleccionado.email }}</span>
                    <span v-if="pacienteSeleccionado.id">🔑 {{ pacienteSeleccionado.id.substring(0,8) }}...</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="btn-row">
              <button @click="siguientePaso" class="btn-primary">Siguiente: Médico →</button>
            </div>
          </div>

          <!-- PASO 2: Médico -->
          <div v-if="pasoActual === 2">
            <div class="field">
              <label>Nombre del médico</label>
              <div class="autocomplete-wrapper">
                <svg class="autocomplete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  v-model="nuevaCita.medico_search"
                  placeholder="Escribe nombre del médico..."
                  @input="buscarMedicoConDisponibilidad"
                  class="autocomplete-input"
                />
                <span v-if="buscandoMedico" class="autocomplete-spinner"></span>
              </div>
            </div>

            <p class="field-hint">Escribe el nombre. Si lo encuentras, selecciónalo para ver disponibilidad. Si no, continua igual.</p>

            <!-- Aviso cuando médico no encontrado -->
            <div v-if="medicosSearch.length === 0 && !medicoSeleccionado && nuevaCita.medico_search.trim().length >= 2 && !buscandoMedico" class="medico-not-found">
              <p>⚠️ No se encontró "<strong>{{ nuevaCita.medico_search }}</strong>" en el directorio.</p>
              <p class="hint">La cita se registrará con el nombre proporcionado. El match con el médico se realizará después.</p>
            </div>

            <!-- Resultados de búsqueda de médico -->
            <div v-if="medicosSearch.length > 0 && !medicoSeleccionado" class="autocomplete-dropdown">
              <div class="autocomplete-count">{{ medicosSearch.length }} médicos encontrados</div>
              <div
                v-for="medico in medicosSearch"
                :key="medico.id"
                class="autocomplete-item medico-item"
                @click="seleccionarMedico(medico)"
              >
                <div class="autocomplete-avatar" :style="{ background: medico.especialidad_color ? '#' + medico.especialidad_color : '#0984e3' }">
                  <img v-if="medico.foto_url" :src="medico.foto_url" :alt="medico.nombre" />
                  <span v-else>{{ medico.nombre?.charAt(0) }}{{ medico.apellido?.charAt(0) }}</span>
                </div>
                <div class="autocomplete-info">
                  <div class="autocomplete-name">{{ medico.titulo || 'Dr.' }} {{ medico.nombre }} {{ medico.apellido }}</div>
                  <div class="autocomplete-meta">
                    <span v-if="medico.especialidad_nombre" class="meta-specialty">{{ medico.especialidad_nombre }}</span>
                    <span v-if="medico.cedula_profesional">Céd: {{ medico.cedula_profesional }}</span>
                    <span v-if="medico.email">{{ medico.email }}</span>
                  </div>
                  <div class="autocomplete-stats">
                    <span class="stat-badge blue" title="Citas pendientes">📋 {{ medico.estadisticas?.pendientes || 0 }}</span>
                    <span class="stat-badge yellow" title="Citas confirmadas">✅ {{ medico.estadisticas?.confirmadas || 0 }}</span>
                    <span class="stat-badge orange" title="Citas hoy">📅 {{ medico.estadisticas?.hoy || 0 }} hoy</span>
                  </div>
                </div>
                <svg class="autocomplete-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>

            <!-- Médico seleccionado -->
            <div v-if="medicoSeleccionado" class="selected-card medico-selected">
              <div class="selected-header">
                <span class="check">✓</span>
                <div class="selected-info">
                  <strong>{{ medicoSeleccionado.titulo || 'Dr.' }} {{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellido }}</strong>
                  <span class="selected-especialidad">{{ medicoSeleccionado.especialidad_nombre }}</span>
                </div>
                <button class="btn-change" @click="medicoSeleccionado = null; medicosSearch = []">Cambiar</button>
              </div>

              <!-- Resumen de disponibilidad del médico seleccionado -->
              <div class="medico-availability" v-if="medicoSeleccionado.citas && medicoSeleccionado.citas.length > 0">
                <div class="availability-header">Horarios ocupados del médico:</div>
                <div class="availability-grid">
                  <div v-for="cita in medicoSeleccionado.citas.slice(0, 8)" :key="cita.id" class="availability-slot">
                    <span class="slot-fecha">{{ formatearFecha(cita.fecha_hora) }}</span>
                    <span class="slot-estado" :style="{ color: estadoBadge(cita.estado) }">{{ cita.estado }}</span>
                  </div>
                </div>
                <p class="availability-hint">⚠️ Verifica que el nuevo horario no se encime con estos</p>
              </div>
            </div>

            <div class="btn-row">
              <button @click="pasoAnterior" class="btn-secondary">← Paciente</button>
              <button @click="siguientePaso" class="btn-primary">Siguiente: Fecha →</button>
            </div>
          </div>

          <!-- PASO 3: Fecha y hora -->
          <div v-if="pasoActual === 3">
            <div class="resumen">
              <div class="resumen-item">
                <span class="resumen-label">Paciente:</span>
                <span v-if="pacienteSeleccionado">{{ pacienteSeleccionado.nombre }} {{ pacienteSeleccionado.apellido }}</span>
                <span v-else style="color:#d63031">No seleccionado</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Médico:</span>
                <span v-if="nuevaCita.medico_search">{{ nuevaCita.medico_search }}</span>
                <span v-else style="color:#d63031">No especificado</span>
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Fecha</label>
                <input v-model="nuevaCita.fecha" type="date" />
              </div>
              <div class="field">
                <label>Hora</label>
                <input v-model="nuevaCita.hora" type="time" />
              </div>
            </div>

            <div class="field">
              <label>Notas (opcional)</label>
              <textarea v-model="nuevaCita.notas" placeholder="Notas adicionales..." rows="2"></textarea>
            </div>

            <div class="btn-row">
              <button @click="pasoAnterior" class="btn-secondary">← Médico</button>
              <button @click="crearCita" :disabled="creandoCita" class="btn-primary btn-create">
                {{ creandoCita ? 'Creando...' : '✓ Crear Cita' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Modal DETALLE CITA -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Detalle de Cita</h2>
          <button @click="showModal = false" class="close">&times;</button>
        </div>
        <div class="modal-body" v-if="citaSeleccionada">
          <div class="info-grid">
            <div><strong>Estado:</strong> <span class="estado-badge" :style="{ background: estadoColor(citaSeleccionada.estado) }">{{ citaSeleccionada.estado }}</span></div>
            <div><strong>Fecha:</strong> {{ new Date(citaSeleccionada.fecha_hora).toLocaleString('es-MX') }}</div>
            <div>
              <strong>Paciente:</strong> {{ citaSeleccionada.paciente_nombre }} {{ citaSeleccionada.paciente_apellido }}
              <a v-if="citaSeleccionada.paciente_telefono" @click="abrirWA(citaSeleccionada.paciente_telefono)" class="link-wa">Abrir WhatsApp</a>
            </div>
            <div>
              <strong>Médico:</strong> {{ citaSeleccionada.medico_nombre }} {{ citaSeleccionada.medico_apellido }}
              <a v-if="citaSeleccionada.medico_whatsapp" @click="abrirWA(citaSeleccionada.medico_whatsapp)" class="link-wa">Abrir WhatsApp</a>
            </div>
          </div>

          <div v-if="actionSuccess" style="background:#d4edda;color:#00b894;padding:0.5rem 1rem;border-radius:6px;font-size:0.85rem;font-weight:600;margin-bottom:0.75rem">
            {{ actionSuccess }}
          </div>

          <div class="acciones">
            <h3>Acciones</h3>
            <div class="btn-group">
              <button v-if="['pendiente','PENDIENTE_DE_COORDINACION'].includes(citaSeleccionada.estado)" @click="cambiarEstado('confirmada', 'Confirmada por asistente')" class="btn-action btn-confirm" :disabled="actionLoading">
                {{ actionLoading === 'confirmada' ? 'Confirmando...' : 'Confirmar' }}
              </button>
              <button v-if="citaSeleccionada.estado === 'confirmada'" @click="cambiarEstado('paciente_llego', 'Paciente llegó (reportado por asistente)')" class="btn-action btn-arrival" :disabled="actionLoading">
                {{ actionLoading === 'paciente_llego' ? 'Procesando...' : 'Paciente Llegó' }}
              </button>
              <button v-if="citaSeleccionada.estado === 'paciente_llego'" @click="cambiarEstado('en_atencion', 'Iniciando atención')" class="btn-action btn-attention" :disabled="actionLoading">
                {{ actionLoading === 'en_atencion' ? 'Procesando...' : 'Iniciar Atención' }}
              </button>
              <button v-if="['en_atencion','paciente_llego'].includes(citaSeleccionada.estado)" @click="cambiarEstado('asistida', 'Cita completada')" class="btn-action btn-success" :disabled="actionLoading">
                {{ actionLoading === 'asistida' ? 'Procesando...' : 'Marcar Asistida' }}
              </button>
              <button v-if="['pendiente','PENDIENTE_DE_COORDINACION','confirmada','paciente_llego'].includes(citaSeleccionada.estado)" @click="cambiarEstado('cancelada', 'Cancelada por asistente')" class="btn-action btn-cancel" :disabled="actionLoading">
                {{ actionLoading === 'cancelada' ? 'Cancelando...' : 'Cancelar' }}
              </button>
            </div>
          </div>

          <div class="nota-section">
            <h3>Agregar Nota</h3>
            <div class="nota-input">
              <input v-model="notaText" placeholder="Escribe una nota..." @keyup.enter="agregarNota" />
              <button @click="agregarNota" class="btn-secondary">Guardar</button>
            </div>
          </div>

          <div class="bitacora-section">
            <h3>Bitácora de Cambios</h3>
            <div v-for="b in bitacora" :key="b.id" class="bitacora-entry">
              <span class="bit-time">{{ new Date(b.created_at).toLocaleString('es-MX') }}</span>
              <span class="bit-user">{{ b.tipo_usuario }}{{ b.asistente_nombre ? ' (' + b.asistente_nombre + ')' : '' }}</span>
              <span class="bit-action">{{ b.accion }}</span>
              <span v-if="b.estado_anterior" class="bit-from">{{ b.estado_anterior }} →</span>
              <span v-if="b.estado_nuevo" class="bit-to">{{ b.estado_nuevo }}</span>
              <p v-if="b.descripcion" class="bit-desc">{{ b.descripcion }}</p>
            </div>
          </div>

          <div class="wa-section">
            <h3>Mensajes WhatsApp</h3>
            <div v-for="wm in mensajesWA" :key="wm.id" class="wa-entry">
              <span class="wa-dir" :class="wm.direccion">{{ wm.direccion === 'saliente' ? '→' : '←' }}</span>
              <span class="wa-from">{{ wm.remitente || 'Desconocido' }}</span>
              <span class="wa-msg">{{ wm.mensaje }}</span>
              <span class="wa-time">{{ new Date(wm.created_at).toLocaleTimeString('es-MX') }}</span>
            </div>
            <div class="wa-new">
              <input v-model="newMsg.remitente" placeholder="Remitente" />
              <input v-model="newMsg.destinatario" placeholder="Destinatario" />
              <input v-model="newMsg.telefono" placeholder="Teléfono" />
              <input v-model="newMsg.mensaje" placeholder="Mensaje..." @keyup.enter="registrarMensaje" />
              <button @click="registrarMensaje" class="btn-secondary">Registrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal NUEVO/EDITAR MEDICO -->
    <div v-if="showNuevoMedico" class="modal-overlay" @click.self="cerrarFormMedico">
      <div class="modal">
        <div class="modal-header"><h2>{{ editandoMedico ? 'Editar' : 'Nuevo' }} Medico</h2><button @click="cerrarFormMedico" class="close">&times;</button></div>
        <div class="modal-body">
          <div v-if="errorMsgMedico" class="error">{{ errorMsgMedico }}</div>
          <div v-if="okMsgMedico" class="success-msg">{{ okMsgMedico }}</div>
          <div class="field-row"><div class="field"><label>Nombre *</label><input v-model="formMedico.nombre" /></div><div class="field"><label>Apellido *</label><input v-model="formMedico.apellido" /></div></div>
          <div class="field-row"><div class="field"><label>Email</label><input v-model="formMedico.email" type="email" /></div><div class="field"><label>Telefono</label><input v-model="formMedico.telefono" /></div></div>
          <div class="field-row"><div class="field"><label>Cedula Profesional</label><input v-model="formMedico.cedula_profesional" /></div><div class="field"><label>Titulo</label><input v-model="formMedico.titulo" placeholder="Dr." /></div></div>
          <div class="field"><label>Especialidad</label><input v-model="formMedico.especialidad" placeholder="Nombre de la especialidad" /></div>
          <div class="field-row"><div class="field"><label>Usuario (login)</label><input v-model="formMedico.usuario" placeholder="dr.lopez" /></div><div class="field"><label>Contrasena</label><input v-model="formMedico.password" type="password" placeholder="******" /></div></div>

          <div class="form-section-label">Datos Oficiales (CURP)</div>
          <div class="curp-row">
            <div class="field" style="flex:1"><label>CURP</label><input v-model="formMedico.curp" maxlength="18" placeholder="18 caracteres" style="text-transform:uppercase;font-family:monospace;letter-spacing:1px" @keyup.enter="validarCURPMedico" /></div>
            <button class="btn-validate" @click="validarCURPMedico" :disabled="curpValidandoMedico || !formMedico.curp || formMedico.curp.length !== 18">
              <span v-if="curpValidandoMedico" class="spinner-sm"></span><span v-else>Validar</span>
            </button>
          </div>
          <div v-if="curpErrorMedico" class="error" style="margin-top:0.5rem">{{ curpErrorMedico }}</div>
          <div v-if="curpDatosMedico" class="curp-success"><span class="check-icon">&#10003;</span> Datos cargados de CURP</div>

          <div class="form-section-label">Comision</div>
          <div class="field-row">
            <div class="field"><label>Tipo de Comision</label>
              <select v-model="formMedico.comision_tipo">
                <option :value="1">Tipo 1 — $100 MXN</option>
                <option :value="2">Tipo 2 — $75 MXN</option>
                <option :value="3">Tipo 3 — $50 MXN</option>
              </select>
            </div>
          </div>

          <div class="form-section-label">Ubicacion del Consultorio</div>
          <div class="field-row">
            <div class="field">
              <label>Codigo Postal</label>
              <input v-model="formMedico.codigo_postal" maxlength="5" placeholder="5 digitos" />
              <span v-if="coloniasMedicoLoading" class="field-hint">Buscando colonias...</span>
              <div v-if="coloniasMedico.length > 0" class="colonias-list">
                <div v-for="col in coloniasMedico" :key="typeof col === 'object' ? col.colonia : col" class="colonia-item" @click="seleccionarColoniaMedico(col)">{{ typeof col === 'object' ? col.colonia : col }}</div>
              </div>
            </div>
            <div class="field"><label>Ciudad</label><input v-model="formMedico.consultorio_ciudad" /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Estado</label><input v-model="formMedico.consultorio_estado" /></div>
            <div class="field"><label>Colonia</label><input v-model="formMedico.colonia" placeholder="Colonia / Fracc." /></div>
          </div>

          <!-- CONSULTORIOS ADICIONALES -->
          <div class="section-divider"><span>Consultorios / Ubicaciones</span></div>
          <div v-if="consultorios.length > 0" class="consultorios-list">
            <div v-for="(c, idx) in consultorios" :key="c.id || idx" class="consultorio-item" :class="{ principal: c.es_principal }">
              <div class="consultorio-info">
                <strong>{{ c.nombre || 'Consultorio ' + (idx+1) }}</strong> <span v-if="c.es_principal" class="badge-principal">Principal</span>
                <span>{{ c.direccion }} {{ c.colonia ? ', ' + c.colonia : '' }} {{ c.ciudad ? ', ' + c.ciudad : '' }} {{ c.estado ? ', ' + c.estado : '' }}</span>
                <span v-if="c.hospital_consultorio">{{ c.hospital_consultorio }}</span>
                <span v-if="c.google_maps_url"><a :href="c.google_maps_url" target="_blank" class="maps-link">📍 Ver en Maps</a></span>
              </div>
              <div class="consultorio-actions">
                <button type="button" class="btn-sm" @click="editarConsultorioItem(c)">Editar</button>
                <button type="button" class="btn-remove" @click="eliminarConsultorio(idx)">✕</button>
              </div>
            </div>
          </div>
          <div class="consultorio-form">
            <div class="field-row">
              <div class="field"><label>Nombre</label><input v-model="consultorioForm.nombre" placeholder="Ej: Consultorio Principal" /></div>
              <div class="field"><label>Direccion</label><input v-model="consultorioForm.direccion" placeholder="Calle y numero" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>CP</label><input v-model="consultorioForm.codigo_postal" maxlength="5" placeholder="5 digitos" /></div>
              <div class="field"><label>Colonia</label><input v-model="consultorioForm.colonia" /></div>
              <div class="field"><label>Ciudad</label><input v-model="consultorioForm.ciudad" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Estado</label><input v-model="consultorioForm.estado" /></div>
              <div class="field"><label>Hospital</label><input v-model="consultorioForm.hospital_consultorio" /></div>
            </div>
            <div class="field-row">
              <div class="field" style="flex:2"><label>URL Google Maps</label><input v-model="consultorioForm.google_maps_url" placeholder="https://maps.google.com/..." /></div>
              <div class="field" style="flex:0; align-self:flex-end;">
                <button type="button" v-if="consultorioForm.google_maps_url" class="btn-maps" @click="abrirGoogleMaps(consultorioForm.google_maps_url)">📍 Abrir</button>
              </div>
            </div>
            <div class="field-row">
              <label class="checkbox-label"><input type="checkbox" v-model="consultorioForm.es_principal" /> Consultorio principal</label>
              <button type="button" class="btn-add-consultorio" @click="editConsultorioId ? guardarConsultorioEdit() : agregarConsultorio()">{{ editConsultorioId ? 'Actualizar' : '+ Agregar' }}</button>
              <button v-if="editConsultorioId" type="button" class="btn-secondary" @click="resetConsultorioForm()">Cancelar edicion</button>
            </div>
          </div>

          <div class="btn-row"><button @click="cerrarFormMedico" class="btn-secondary">Cancelar</button><button @click="guardarMedico" :disabled="savingMedico" class="btn-primary">{{ savingMedico ? 'Guardando...' : (editandoMedico ? 'Actualizar' : 'Guardar') }}</button></div>
        </div>
      </div>
    </div>

    <!-- Modal NUEVO/EDITAR PACIENTE -->
    <div v-if="showNuevoPaciente" class="modal-overlay" @click.self="cerrarFormPaciente">
      <div class="modal" style="max-width:650px">
        <div class="modal-header"><h2>{{ editandoPaciente ? 'Editar' : 'Nuevo' }} Paciente</h2><button @click="cerrarFormPaciente" class="close">&times;</button></div>
        <div class="modal-body">
          <div v-if="errorMsgPaciente" class="error">{{ errorMsgPaciente }}</div>
          <div v-if="okMsgPaciente" class="success">{{ okMsgPaciente }}</div>

          <!-- CURP -->
          <div class="form-section-label">Datos Oficiales (CURP)</div>
          <div class="curp-row">
            <div class="field" style="flex:1"><label>CURP</label><input v-model="formPaciente.curp" maxlength="18" placeholder="18 caracteres" style="text-transform:uppercase;font-family:monospace;letter-spacing:1px" @keyup.enter="validarCURPPaciente" /></div>
            <button class="btn-validate" @click="validarCURPPaciente" :disabled="curpValidandoPaciente || !formPaciente.curp || formPaciente.curp.length !== 18">
              <span v-if="curpValidandoPaciente" class="spinner-sm"></span><span v-else>Validar</span>
            </button>
          </div>
          <div v-if="curpErrorPaciente" class="error" style="margin-top:0.5rem">{{ curpErrorPaciente }}</div>
          <div v-if="curpDatosPaciente" class="curp-success"><span class="check-icon">&#10003;</span> Datos cargados de CURP</div>

          <!-- PERSONAL -->
          <div class="form-section-label">Datos Personales</div>
          <div class="field-row"><div class="field"><label>Nombre *</label><input v-model="formPaciente.nombre" /></div><div class="field"><label>Apellido Paterno</label><input v-model="formPaciente.apellido_paterno" /></div></div>
          <div class="field-row"><div class="field"><label>Apellido Materno</label><input v-model="formPaciente.apellido_materno" /></div><div class="field"><label>Genero</label><select v-model="formPaciente.genero"><option value="">---</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select></div></div>
          <div class="field-row"><div class="field"><label>Fecha nacimiento</label><input v-model="formPaciente.fecha_nacimiento" type="date" /></div><div class="field"><label>Estado Civil</label><select v-model="formPaciente.estado_civil"><option value="">---</option><option value="soltero/a">Soltero/a</option><option value="casado/a">Casado/a</option><option value="divorciado/a">Divorciado/a</option><option value="viudo/a">Viudo/a</option><option value="union libre">Union libre</option></select></div></div>
          <div class="field-row"><div class="field"><label>Ocupacion</label><input v-model="formPaciente.ocupacion" /></div><div class="field"><label>Ciudad</label><input v-model="formPaciente.ciudad" /></div></div>

          <!-- CONTACTO -->
          <div class="form-section-label">Contacto</div>
          <div class="field-row"><div class="field"><label>Email *</label><input v-model="formPaciente.email" type="email" /></div><div class="field"><label>Telefono</label><input v-model="formPaciente.telefono" /></div></div>
          <div class="field-row">
            <div class="field">
              <label>Codigo Postal</label>
              <input v-model="formPaciente.codigo_postal" maxlength="5" placeholder="5 digitos" />
              <span v-if="coloniasPacienteLoading" class="field-hint">Buscando colonias...</span>
              <div v-if="coloniasPaciente.length > 0" class="colonias-list">
                <div v-for="col in coloniasPaciente" :key="typeof col === 'object' ? col.colonia : col" class="colonia-item" @click="seleccionarColoniaPaciente(col)">{{ typeof col === 'object' ? col.colonia : col }}</div>
              </div>
              <span v-if="formPaciente.codigo_postal.length === 5 && coloniasPaciente.length === 0 && !coloniasPacienteLoading" class="field-hint">No se encontraron colonias</span>
            </div>
            <div class="field"><label>Estado</label><input v-model="formPaciente.estado" /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Municipio</label><input v-model="formPaciente.municipio" /></div>
            <div class="field"><label>Colonia</label><input v-model="formPaciente.colonia" placeholder="Colonia / Fracc." /></div>
          </div>

          <!-- PLAN & PASSWORD -->
          <div class="form-section-label">Plan y Acceso</div>
          <div class="field-row">
            <div class="field"><label>Plan / Paquete</label><select v-model="formPaciente.id_paquete"><option value="">Sin plan</option><option v-for="p in paquetesLista" :key="p.id" :value="p.id">{{ p.nombre }} — ${{ p.precio }}</option></select></div>
            <div class="field"><label>{{ editandoPaciente ? 'Password (vacio = no cambiar)' : 'Password' }}</label><input v-model="formPaciente.password" type="password" :placeholder="editandoPaciente ? 'Dejar vacio para no cambiar' : 'mediprotect123'" /></div>
          </div>

          <div class="btn-row"><button @click="cerrarFormPaciente" class="btn-secondary">Cancelar</button><button @click="guardarPaciente" :disabled="savingPaciente" class="btn-primary">{{ savingPaciente ? 'Guardando...' : (editandoPaciente ? 'Actualizar' : 'Guardar') }}</button></div>
        </div>
      </div>
    </div>

    <!-- Modal NUEVA/EDITAR EMPRESA -->
    <div v-if="showNuevaEmpresa" class="modal-overlay" @click.self="cerrarFormEmpresa">
      <div class="modal">
        <div class="modal-header"><h2>{{ editandoEmpresa ? 'Editar' : 'Nueva' }} Empresa</h2><button @click="cerrarFormEmpresa" class="close">&times;</button></div>
        <div class="modal-body">
          <div v-if="errorMsgEmpresa" class="error">{{ errorMsgEmpresa }}</div>
          <div class="field-row"><div class="field"><label>Nombre *</label><input v-model="formEmpresa.nombre" /></div><div class="field"><label>RFC</label><input v-model="formEmpresa.rfc" /></div></div>
          <div class="field-row"><div class="field"><label>Email *</label><input v-model="formEmpresa.email" type="email" /></div><div class="field"><label>Telefono</label><input v-model="formEmpresa.telefono" /></div></div>
          <div class="field"><label>Contacto</label><input v-model="formEmpresa.contacto_nombre" /></div>
          <div class="field"><label>Direccion</label><input v-model="formEmpresa.direccion" /></div>
          <div class="field-row"><div class="field"><label>Ciudad</label><input v-model="formEmpresa.ciudad" /></div><div class="field"><label>Estado</label><input v-model="formEmpresa.estado" /></div></div>
          <div class="field-row">
            <div class="field" style="flex:2"><label>URL Google Maps</label><input v-model="formEmpresa.google_maps_url" placeholder="https://maps.google.com/..." /></div>
            <div class="field" style="flex:0; align-self:flex-end;">
              <button type="button" v-if="formEmpresa.google_maps_url" class="btn-maps" @click="abrirGoogleMaps(formEmpresa.google_maps_url)">📍 Abrir</button>
            </div>
          </div>
          <div class="btn-row"><button @click="cerrarFormEmpresa" class="btn-secondary">Cancelar</button><button @click="guardarEmpresa" :disabled="savingEmpresa" class="btn-primary">{{ savingEmpresa ? 'Guardando...' : (editandoEmpresa ? 'Actualizar' : 'Guardar') }}</button></div>
        </div>
      </div>
    </div>

    <!-- Modal PACIENTES DE EMPRESA -->
    <div v-if="showEmpresaPacientes" class="modal-overlay" @click.self="showEmpresaPacientes = false">
      <div class="modal" style="max-width: 700px">
        <div class="modal-header"><h2>Pacientes — {{ empresaSeleccionada?.nombre }}</h2><button @click="showEmpresaPacientes = false" class="close">&times;</button></div>
        <div class="modal-body">
          <p v-if="loadingPacientesEmpresa" class="loading">Cargando...</p>
          <template v-else>
            <div class="section-label">Pacientes asignados ({{ pacientesEmpresa.length }})</div>
            <div v-if="pacientesEmpresa.length" class="pacientes-list">
              <div v-for="p in pacientesEmpresa" :key="p.id" class="paciente-row">
                <div class="paciente-info"><strong>{{ p.nombre }} {{ p.apellido }}</strong><span>{{ p.email }}</span></div>
                <button class="btn-sm red" @click="desasociarPacienteEmpresa(p.id_paciente)">Remover</button>
              </div>
            </div>
            <div v-else class="empty-state">No hay pacientes asignados</div>

            <div class="section-label" style="margin-top: 1.5rem">Agregar paciente existente</div>
            <input v-model="searchPacienteEmpresa" class="search-input" placeholder="Buscar paciente por nombre o email..." />
            <div class="pacientes-list">
              <div v-for="p in pacientesFiltradosEmpresa.filter(p => !idsAsociados.has(p.id))" :key="p.id" class="paciente-row">
                <div class="paciente-info"><strong>{{ p.nombre }} {{ p.apellido }}</strong><span>{{ p.email }}</span></div>
                <button class="btn-sm green" @click="asociarPacienteAEmpresa(p.id)" :disabled="savingAsociar">Asociar</button>
              </div>
            </div>

            <div style="margin-top: 1rem; text-align: center">
              <button class="btn-primary" @click="showNuevoPaciente = true; showEmpresaPacientes = false">+ Crear paciente nuevo para esta empresa</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { min-height: 100vh; background: #f0f2f5; }
.header { background: white; padding: 0.8rem 2rem; border-bottom: 1px solid #e0e0e0; }
.header-inner { display: flex; align-items: center; gap: 2rem; max-width: 1200px; margin: 0 auto; }
.logo { height: 35px; }
nav { display: flex; gap: 0.25rem; }
nav button { background: none; border: none; color: #636e72; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.15s; }
nav button:hover { background: #f0f2f5; }
nav button.active { background: #0984e3; color: white; }
.user-info { margin-left: auto; display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #dfe6e9; padding: 0.3rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }

.content { max-width: 1200px; margin: 1.5rem auto; padding: 0 1rem; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.header-actions { display: flex; align-items: center; gap: 0.75rem; }
.view-toggle { display: flex; background: #dfe6e9; border-radius: 8px; overflow: hidden; }
.view-toggle button { background: none; border: none; padding: 0.45rem 0.75rem; cursor: pointer; font-size: 1rem; transition: all 0.15s; }
.view-toggle button.active { background: #0984e3; color: white; }
h1 { font-size: 1.5rem; color: #2d3436; }

.citas-lista { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #dfe6e9; }
.citas-cards { display: flex; flex-direction: column; gap: 0.6rem; }
.cita-card { background: white; padding: 1rem 1.2rem; border-radius: 10px; cursor: pointer; border-left: 4px solid #dfe6e9; transition: all 0.15s; }
.cita-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.cita-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.cita-body { display: flex; gap: 2rem; }
.cita-col { font-size: 0.9rem; }
.phone { font-size: 0.8rem; color: #25d366; margin-left: 0.5rem; cursor: pointer; }

.filters { display: flex; gap: 0.8rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filters input { flex: 1; min-width: 200px; padding: 0.6rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; }
.filters select { padding: 0.6rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; }

.citas-list { display: flex; flex-direction: column; gap: 0.6rem; }
.cita-card { background: white; padding: 1rem 1.2rem; border-radius: 10px; cursor: pointer; border-left: 4px solid #dfe6e9; transition: all 0.15s; }
.cita-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.cita-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.estado-badge { padding: 0.2rem 0.6rem; border-radius: 12px; color: white; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
.fecha { font-size: 0.85rem; color: #636e72; }
.cita-body { display: flex; gap: 2rem; }
.cita-col { font-size: 0.9rem; }
.phone { font-size: 0.8rem; color: #25d366; margin-left: 0.5rem; cursor: pointer; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-body { padding: 1.5rem; }

.field { margin-bottom: 1rem; position: relative; }
.field label { display: block; font-size: 0.85rem; font-weight: 600; color: #2d3436; margin-bottom: 0.3rem; }
.field input, .field textarea { width: 100%; padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; font-family: inherit; }
.field textarea { resize: vertical; }
.field-row { display: flex; gap: 1rem; }
.field-row .field { flex: 1; }
.selected { color: #00b894; font-size: 0.85rem; margin: 0.3rem 0 0; }
.selected-card { background: #f0fff4; border: 1px solid #00b894; border-radius: 8px; padding: 0.8rem 1rem; margin-top: 0.5rem; }
.selected-header { display: flex; align-items: center; gap: 0.5rem; }
.selected-header .check { color: #00b894; font-weight: bold; font-size: 1.1rem; }
.selected-header strong { flex: 1; color: #2d3436; }
.btn-remove { background: none; border: none; color: #d63031; cursor: pointer; font-size: 1rem; padding: 0.2rem; }
.selected-details { display: flex; gap: 1rem; margin-top: 0.4rem; font-size: 0.82rem; color: #636e72; flex-wrap: wrap; }

.btn-parse { background: #fdcb6e; color: #2d3436; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-top: 0.5rem; font-weight: 600; }
.btn-parse:disabled { opacity: 0.5; cursor: not-allowed; }

.search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #dfe6e9; border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.search-item { padding: 0.6rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f2f5; }
.search-item:hover { background: #f8f9fa; }
.search-item strong { display: block; font-size: 0.9rem; }
.search-item span { font-size: 0.8rem; color: #636e72; }

.field-hint { font-size: 0.8rem; color: #636e72; margin-top: 0.3rem; }

.acciones { margin-bottom: 1.5rem; }
.acciones h3, .nota-section h3, .bitacora-section h3, .wa-section h3 { font-size: 1rem; margin-bottom: 0.8rem; color: #2d3436; }
.btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-action { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: white; transition: opacity 0.2s; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-confirm { background: #0984e3; }
.btn-arrival { background: #00b894; }
.btn-attention { background: #6c5ce7; }
.btn-success { background: #00b894; }
.btn-cancel { background: #d63031; }

.nota-input { display: flex; gap: 0.5rem; }
.nota-input input { flex: 1; padding: 0.5rem 0.8rem; border: 1px solid #dfe6e9; border-radius: 6px; }

.bitacora-entry { padding: 0.5rem 0; border-bottom: 1px solid #f0f2f5; font-size: 0.85rem; }
.bit-time { color: #b2bec3; margin-right: 0.5rem; }
.bit-user { color: #0984e3; margin-right: 0.5rem; }
.bit-action { font-weight: 600; margin-right: 0.5rem; }
.bit-from { color: #d63031; }
.bit-to { color: #00b894; }
.bit-desc { margin: 0.3rem 0 0; color: #636e72; font-style: italic; }

.wa-entry { padding: 0.4rem 0; border-bottom: 1px solid #f0f2f5; font-size: 0.85rem; display: flex; gap: 0.5rem; align-items: baseline; }
.wa-dir { font-weight: bold; width: 1.2rem; }
.wa-dir.saliente { color: #0984e3; }
.wa-dir.entrante { color: #00b894; }
.wa-from { color: #636e72; min-width: 100px; }
.wa-msg { flex: 1; }
.wa-time { color: #b2bec3; font-size: 0.8rem; }
.wa-new { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-top: 0.8rem; }
.wa-new input { padding: 0.5rem 0.8rem; border: 1px solid #dfe6e9; border-radius: 6px; font-size: 0.85rem; }
.wa-new input:nth-child(4) { grid-column: 1 / -1; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.link-wa { color: #25d366; margin-left: 0.5rem; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }

.btn-primary { background: #0984e3; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-primary.full { width: 100%; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary.btn-create { background: #00b894; flex: 1; }
.btn-primary.btn-create:hover { background: #00a884; }
.btn-secondary { background: #dfe6e9; color: #2d3436; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-row { display: flex; gap: 0.8rem; margin-top: 1rem; }

.stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; gap: 0; }
.step { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #b2bec3; font-weight: 500; }
.step.active { color: #0984e3; font-weight: 700; }
.step.done { color: #00b894; }
.step-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #dfe6e9; font-size: 0.75rem; font-weight: 700; }
.step.active .step-num { background: #0984e3; color: white; border-color: #0984e3; }
.step.done .step-num { background: #00b894; color: white; border-color: #00b894; }
.step-line { width: 40px; height: 2px; background: #dfe6e9; margin: 0 0.3rem; }
.step-line.done { background: #00b894; }

.resumen { background: #f8f9fa; border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 1rem; }
.resumen-item { font-size: 0.9rem; margin-bottom: 0.3rem; }
.resumen-label { font-weight: 600; margin-right: 0.5rem; color: #636e72; }
.btn-secondary { background: white; color: #0984e3; border: 1px solid #0984e3; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.error { background: #ffeaa7; color: #d63031; padding: 0.6rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; }
.loading, .empty { text-align: center; padding: 2rem; color: #636e72; }

/* Doctor Search Results */
.search-input-wrapper { position: relative; }
.search-spinner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 1rem; }
.medico-not-found { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 1rem; margin-top: 0.75rem; }
.medico-not-found p { margin: 0 0 0.25rem; font-size: 0.85rem; color: #f57f17; }
.medico-not-found .hint { font-size: 0.8rem; color: #b2bec3; margin: 0; }
.medicos-results { max-height: 400px; overflow-y: auto; margin-top: 0.5rem; }
.medico-result-card {
  background: white;
  border: 1px solid #dfe6e9;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}
.medico-result-card:hover { border-color: #0984e3; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.medico-result-header { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; }
.medico-avatar {
  width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: white; font-weight: bold; font-size: 0.85rem; flex-shrink: 0; overflow: hidden;
}
.medico-avatar img { width: 100%; height: 100%; object-fit: cover; }
.medico-result-info { display: flex; flex-direction: column; }
.medico-result-info strong { font-size: 0.9rem; color: #2d3436; }
.medico-especialidad { font-size: 0.8rem; color: #0984e3; }
.medico-cedula { font-size: 0.75rem; color: #636e72; }
.medico-stats { display: flex; gap: 1rem; padding: 0.4rem 0; border-top: 1px solid #f0f2f5; font-size: 0.8rem; color: #636e72; }
.medico-citas-list { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f0f2f5; }
.citas-header { font-size: 0.75rem; color: #636e72; font-weight: 600; margin-bottom: 0.3rem; }
.cita-item { display: flex; gap: 0.5rem; align-items: center; font-size: 0.8rem; padding: 0.2rem 0; }
.cita-fecha { color: #636e72; min-width: 120px; }
.cita-paciente { flex: 1; color: #2d3436; }
.cita-estado { padding: 0.1rem 0.4rem; border-radius: 8px; color: white; font-size: 0.7rem; font-weight: 600; }
.citas-more { font-size: 0.75rem; color: #636e72; margin-top: 0.3rem; }
.medico-citas-empty { font-size: 0.8rem; color: #00b894; margin-top: 0.3rem; }

/* Selected Doctor */
.medico-selected { background: #f0f7ff; border-color: #0984e3; }
.selected-info { flex: 1; }
.selected-especialidad { display: block; font-size: 0.8rem; color: #0984e3; }
.btn-change { background: none; border: 1px solid #dfe6e9; color: #636e72; padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
.btn-change:hover { border-color: #0984e3; color: #0984e3; }
.medico-availability { margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #b8daff; }
.availability-header { font-size: 0.8rem; color: #2d3436; font-weight: 600; margin-bottom: 0.5rem; }
.availability-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.availability-slot { display: flex; gap: 0.3rem; align-items: center; background: white; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; border: 1px solid #dfe6e9; }
.slot-fecha { color: #2d3436; }
.slot-estado { font-weight: 600; text-transform: capitalize; }
.availability-hint { font-size: 0.75rem; color: #e17055; margin-top: 0.5rem; }

/* Pestaña de Médicos */
.medico-search-box { margin-bottom: 1.5rem; }
.medico-search-box .search-input-wrapper {
  position: relative; display: flex; align-items: center;
  background: white; border: 2px solid #e0e0e0; border-radius: 12px;
  padding: 0; transition: border-color 0.2s, box-shadow 0.2s;
}
.medico-search-box .search-input-wrapper:focus-within {
  border-color: #0984e3; box-shadow: 0 0 0 3px rgba(9,132,227,0.1);
}
.search-icon { position: absolute; left: 14px; width: 20px; height: 20px; color: #b2bec3; pointer-events: none; }
.medico-search-box input {
  width: 100%; padding: 0.9rem 2.5rem 0.9rem 2.8rem; border: none; border-radius: 12px;
  font-size: 1rem; outline: none; background: transparent;
}
.search-spinner {
  position: absolute; right: 14px; width: 20px; height: 20px;
  border: 2px solid #e0e0e0; border-top-color: #0984e3; border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.search-clear {
  position: absolute; right: 14px; width: 22px; height: 22px; display: flex;
  align-items: center; justify-content: center; background: #e0e0e0; color: #636e72;
  border-radius: 50%; cursor: pointer; font-size: 1rem; line-height: 1;
}
.search-clear:hover { background: #d63031; color: white; }

.results-count { font-size: 0.8rem; color: #636e72; margin-bottom: 0.75rem; font-weight: 500; }

.medico-search-results { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
.medico-result-card {
  display: flex; align-items: center; gap: 1rem; padding: 1rem 1.2rem;
  background: white; border: 1px solid #e8ecef; border-radius: 14px;
  transition: all 0.2s; cursor: default;
}
.medico-result-card:hover { border-color: #0984e3; box-shadow: 0 4px 16px rgba(9,132,227,0.1); transform: translateY(-1px); }
.medico-card-avatar {
  width: 52px; height: 52px; border-radius: 14px; display: flex;
  align-items: center; justify-content: center; color: white;
  font-weight: 700; font-size: 1rem; flex-shrink: 0; overflow: hidden;
}
.medico-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { line-height: 1; }
.medico-card-body { flex: 1; min-width: 0; cursor: pointer; }
.medico-card-name { font-size: 1rem; font-weight: 600; color: #2d3436; margin-bottom: 2px; }
.medico-card-specialty { font-size: 0.85rem; color: #0984e3; font-weight: 500; margin-bottom: 4px; }
.medico-card-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.meta-item { font-size: 0.78rem; color: #636e72; display: flex; align-items: center; gap: 4px; }
.meta-item svg { flex-shrink: 0; }
.medico-card-actions {
  display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0;
}
.medico-card-stat { text-align: center; }
.stat-num { display: block; font-size: 1.1rem; font-weight: 700; color: #2d3436; line-height: 1.2; }
.stat-text { font-size: 0.7rem; color: #636e72; }
.btn-card-edit, .btn-card-view {
  padding: 0.3rem 0.7rem; border-radius: 6px; font-size: 0.78rem;
  cursor: pointer; font-weight: 500; border: none; transition: all 0.15s;
}
.btn-card-edit { background: #f0f7ff; color: #0984e3; }
.btn-card-edit:hover { background: #0984e3; color: white; }
.btn-card-view { background: #f0fff4; color: #00b894; }
.btn-card-view:hover { background: #00b894; color: white; }

.empty-results { text-align: center; padding: 3rem 1rem; color: #636e72; }
.empty-results svg { color: #dfe6e9; margin-bottom: 1rem; }
.empty-results p { font-size: 1rem; color: #2d3436; margin: 0 0 0.3rem; }
.empty-results span { font-size: 0.85rem; color: #b2bec3; }

/* Perfil del médico */
.medico-perfil { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #dfe6e9; }
.btn-back { background: none; border: none; color: #0984e3; cursor: pointer; font-size: 0.9rem; margin-bottom: 1rem; padding: 0; }
.btn-back:hover { text-decoration: underline; }

.perfil-header { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f0f2f5; }
.perfil-avatar {
  width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: white; font-weight: bold; font-size: 1.5rem; flex-shrink: 0; overflow: hidden;
}
.perfil-avatar img { width: 100%; height: 100%; object-fit: cover; }
.perfil-info h2 { margin: 0 0 0.3rem; color: #2d3436; }
.perfil-especialidad { color: #0984e3; font-weight: 500; display: block; margin-bottom: 0.5rem; }
.perfil-meta { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: #636e72; }

.perfil-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.perfil-card { background: #f8f9fa; border-radius: 8px; padding: 1rem; }
.perfil-card h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #2d3436; }
.perfil-card p { margin: 0; font-size: 0.9rem; color: #636e72; }

.perfil-stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.stat-box { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 1rem; text-align: center; }
.stat-number { display: block; font-size: 1.5rem; font-weight: bold; color: #2d3436; }
.stat-label { font-size: 0.8rem; color: #636e72; }

.perfil-citas h3 { margin: 0 0 1rem; color: #2d3436; }
.citas-timeline { position: relative; padding-left: 1.5rem; }
.citas-timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #dfe6e9; }
.timeline-item { position: relative; margin-bottom: 1rem; }
.timeline-dot { position: absolute; left: -1.5rem; top: 0.3rem; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; }
.timeline-content { background: #f8f9fa; border-radius: 8px; padding: 0.8rem 1rem; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
.timeline-fecha { font-size: 0.85rem; color: #2d3436; font-weight: 500; }
.timeline-estado { padding: 0.15rem 0.5rem; border-radius: 10px; color: white; font-size: 0.7rem; font-weight: 600; text-transform: capitalize; }
.timeline-paciente { font-size: 0.9rem; color: #2d3436; }
.timeline-paciente span { margin-left: 0.5rem; font-size: 0.8rem; color: #636e72; }
.timeline-notas { font-size: 0.8rem; color: #636e72; margin-top: 0.3rem; font-style: italic; }
.citas-empty { text-align: center; padding: 2rem; color: #636e72; background: #f8f9fa; border-radius: 8px; }
.empty-state { text-align: center; padding: 3rem; color: #636e72; }

/* New sections styles */
.search-box { margin-bottom: 1rem; }
.search-box input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; }
.results-list { display: flex; flex-direction: column; gap: 0.5rem; }
.result-card { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 1rem; border: 1px solid #dfe6e9; border-radius: 10px; transition: all 0.15s; }
.result-card:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.result-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.85rem; flex-shrink: 0; }
.result-avatar.green { background: #00b894; }
.result-avatar.blue { background: #0984e3; }
.result-avatar.orange { background: #e17055; }
.result-info { flex: 1; display: flex; flex-direction: column; }
.result-info strong { font-size: 0.95rem; color: #2d3436; }
.result-info span { font-size: 0.8rem; color: #636e72; }
.result-date { font-size: 0.8rem; color: #b2bec3; white-space: nowrap; }
.result-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.btn-edit { padding: 0.3rem 0.7rem; border: 1px solid #0984e3; background: white; color: #0984e3; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 500; transition: all 0.15s; }
.btn-edit:hover { background: #0984e3; color: white; }
.btn-sm { padding: 0.3rem 0.6rem; border: 1px solid #dfe6e9; background: white; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-sm.blue { border-color: #0984e3; color: #0984e3; }
.btn-sm.green { border-color: #00b894; color: #00b894; }
.btn-sm.red { border-color: #d63031; color: #d63031; }
.btn-sm:hover { opacity: 0.8; }
.success-msg { color: #00b894; background: #e6fcf5; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.error-msg { color: #c62828; background: #ffebee; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.section-label { font-size: 0.85rem; font-weight: 600; color: #636e72; margin-bottom: 0.5rem; }
.search-input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #dfe6e9; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; box-sizing: border-box; }
.pacientes-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 200px; overflow-y: auto; }
.paciente-row { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; border: 1px solid #f0f2f5; border-radius: 6px; }
.paciente-info { display: flex; flex-direction: column; gap: 0.1rem; }
.paciente-info strong { font-size: 0.9rem; }
.paciente-info span { font-size: 0.8rem; color: #636e72; }

/* Autocomplete styles */
.autocomplete-wrapper { position: relative; }
.autocomplete-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #b2bec3; pointer-events: none; }
.autocomplete-input { width: 100%; padding: 0.75rem 0.75rem 0.75rem 2.5rem; border: 1.5px solid #dfe6e9; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; transition: border-color 0.2s; background: #fff; }
.autocomplete-input:focus { outline: none; border-color: #0984e3; box-shadow: 0 0 0 3px rgba(9,132,227,0.1); }
.autocomplete-spinner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; border: 2px solid #dfe6e9; border-top-color: #0984e3; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
.autocomplete-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #e0e6ed; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; max-height: 320px; overflow-y: auto; margin-top: 4px; }
.autocomplete-count { padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #636e72; border-bottom: 1px solid #f0f2f5; background: #fafbfc; border-radius: 8px 8px 0 0; }
.autocomplete-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f8f9fa; }
.autocomplete-item:last-child { border-bottom: none; border-radius: 0 0 8px 8px; }
.autocomplete-item:hover { background: #f0f7ff; }
.autocomplete-avatar { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; overflow: hidden; }
.autocomplete-avatar img { width: 100%; height: 100%; object-fit: cover; }
.autocomplete-avatar.green { background: #00b894; }
.autocomplete-info { flex: 1; min-width: 0; }
.autocomplete-name { font-size: 0.88rem; font-weight: 600; color: #2d3436; }
.autocomplete-meta { display: flex; gap: 0.5rem; font-size: 0.76rem; color: #636e72; margin-top: 2px; flex-wrap: wrap; }
.autocomplete-meta span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.meta-specialty { background: #e8f8f5; color: #00b894; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
.autocomplete-stats { display: flex; gap: 0.4rem; margin-top: 4px; }
.stat-badge { font-size: 0.7rem; padding: 1px 5px; border-radius: 4px; font-weight: 500; }
.stat-badge.blue { background: #f0f7ff; color: #0984e3; }
.stat-badge.yellow { background: #ffeaa7; color: #d35400; }
.stat-badge.orange { background: #ffeaa7; color: #fdcb6e; }
.autocomplete-arrow { flex-shrink: 0; color: #b2bec3; }
.autocomplete-empty { padding: 0.75rem; text-align: center; color: #636e72; font-size: 0.85rem; background: #fafbfc; border: 1px solid #e0e6ed; border-radius: 8px; margin-top: 4px; }

/* CURP & Plan Assignment */
.curp-row { display: flex; gap: 0.75rem; align-items: flex-end; }
.btn-validate { background: #0984e3; color: white; border: none; padding: 0.55rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap; min-width: 90px; display: flex; align-items: center; justify-content: center; height: fit-content; }
.btn-validate:hover:not(:disabled) { background: #0770c2; }
.btn-validate:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spinCurp 0.6s linear infinite; display: inline-block; }
@keyframes spinCurp { to { transform: rotate(360deg); } }
.curp-success { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; font-size: 0.82rem; color: #2e7d32; background: #e8f5e9; padding: 0.4rem 0.75rem; border-radius: 6px; }
.check-icon { width: 20px; height: 20px; background: #2e7d32; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
.form-section-label { font-size: 0.72rem; color: #00b894; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0.75rem 0 0.5rem; padding-top: 0.75rem; border-top: 1px solid #f0f2f5; }
.form-section-label:first-child { border-top: none; margin-top: 0; padding-top: 0; }
.success { background: #e8f5e9; color: #2e7d32; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.colonias-list { margin-top: 0.35rem; max-height: 140px; overflow-y: auto; border: 1px solid #dfe6e9; border-radius: 6px; background: white; }
.colonia-item { padding: 0.45rem 0.7rem; font-size: 0.82rem; cursor: pointer; border-bottom: 1px solid #f0f2f5; }
.colonia-item:hover { background: #eafaf6; }
.confirm-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: #fff8e1; border: 1px solid #ffe082; border-left: 4px solid #f39c12; color: #7a5c00; padding: 0.75rem 1rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem; }
.confirm-banner .btn-confirm { background: #f39c12; color: white; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
.confirm-banner .btn-confirm:hover:not(:disabled) { opacity: 0.85; }
.confirm-banner .btn-confirm.sms { background: #00b894; }
.confirm-banner .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.confirm-banner-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.confirm-banner-close { background: transparent; border: none; color: #7a5c00; font-size: 1.2rem; cursor: pointer; }
.badge-confirmado { color: #00b894; font-weight: 700; }
@media (max-width: 640px) {
  .curp-row { flex-direction: column; }
}

/* Consultorios multi-ubicacion */
.section-divider { margin: 0.75rem 0 0.5rem; padding-bottom: 0.4rem; border-bottom: 2px solid #e0e0e0; }
.section-divider span { font-size: 0.75rem; font-weight: 700; color: #2d3436; text-transform: uppercase; letter-spacing: 0.5px; }
.consultorios-list { margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.consultorio-item { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; gap: 0.75rem; }
.consultorio-item.principal { border-color: #00b894; background: #f0fff4; }
.consultorio-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
.consultorio-info strong { font-size: 0.85rem; color: #2d3436; }
.consultorio-info span { font-size: 0.78rem; color: #636e72; }
.consultorio-actions { display: flex; gap: 0.35rem; flex-shrink: 0; }
.badge-principal { display: inline-block; background: #00b894; color: white; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-left: 0.35rem; vertical-align: middle; }
.btn-add-consultorio { background: #00b894; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
.btn-add-consultorio:hover { background: #00a884; }
.btn-maps { background: #4285f4; color: white; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.78rem; white-space: nowrap; }
.btn-maps:hover { background: #3367d6; }
.btn-remove { background: none; border: 1px solid #d63031; color: #d63031; border-radius: 4px; cursor: pointer; font-size: 0.7rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-remove:hover { background: #ffebee; }
.btn-sm { padding: 0.25rem 0.5rem; border: 1px solid #dfe6e9; border-radius: 4px; cursor: pointer; font-size: 0.75rem; background: white; }
.btn-sm:hover { background: #f5f5f5; }
.maps-link { color: #4285f4; font-size: 0.78rem; text-decoration: none; font-weight: 500; }
.maps-link:hover { text-decoration: underline; }
.checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: #2d3436; cursor: pointer; }
.consultorio-form { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; }
</style>
