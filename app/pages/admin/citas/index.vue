<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const adminToken = useCookie('admin_token')
const citas = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const filterEstado = ref('')
const activeTab = ref('citas')

const vistaCitas = ref('calendar')
if (process.client) {
  const savedView = localStorage.getItem('adminVistaCitas')
  vistaCitas.value = savedView || 'calendar'
}

watchEffect(() => {
  if (process.client) localStorage.setItem('adminVistaCitas', vistaCitas.value)
})

const showNuevaCita = ref(false)
const creandoCita = ref(false)
const errorCita = ref('')
const pasoActual = ref(1)
const pacienteSeleccionado = ref<any>(null)
const medicoSeleccionado = ref<any>(null)
const pacientesSearch = ref<any[]>([])
const medicosSearch = ref<any[]>([])
const buscandoMedico = ref(false)
const parseando = ref(false)

const nuevaCita = ref({
  wa_text: '', paciente_search: '', medico_search: '', fecha: '', hora: '', notas: ''
})

const medicoBusqueda = ref('')
const medicoResults = ref<any[]>([])
const medicoSeleccionadoPerfil = ref<any>(null)
const buscandoPerfilMedico = ref(false)

const citaSeleccionada = ref<any>(null)
const showModal = ref(false)
const bitacora = ref<any[]>([])
const mensajesWA = ref<any[]>([])
const notaText = ref('')
const newMsg = ref({ remitente: '', destinatario: '', telefono: '', mensaje: '' })

onMounted(async () => {
  await cargarCitas()
})

async function cargarCitas() {
  try {
    const data: any = await $fetch('/api/admin/citas', { headers: { Authorization: 'Bearer ' + adminToken.value } })
    citas.value = data?.citas || []
  } catch (e) { console.error(e) }
  loading.value = false
}

const filtered = computed(() => {
  let r = citas.value
  if (filterEstado.value) r = r.filter(c => c.estado === filterEstado.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    r = r.filter(c => c.paciente_nombre?.toLowerCase().includes(s) || c.medico_nombre?.toLowerCase().includes(s))
  }
  return r
})

function estadoColor(estado: string) {
  const colors: Record<string, string> = {
    pendiente: '#fdcb6e', confirmada: '#00b894', paciente_llego: '#0984e3',
    en_atencion: '#6c5ce7', asistida: '#00cec9', no_asistida: '#d63031',
    cancelada: '#b2bec3', reagendada: '#e17055'
  }
  return colors[estado] || '#636e72'
}

function formatearFecha(fechaISO: string) {
  const fecha = new Date(fechaISO)
  return fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function abrirWA(telefono: string) {
  if (!telefono) return
  const num = telefono.replace(/[^0-9]/g, '')
  window.open('https://wa.me/52' + num, '_blank')
}

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

function seleccionarPaciente(p: any) {
  pacienteSeleccionado.value = { ...p }
  nuevaCita.value.paciente_search = p.nombre + ' ' + p.apellido
  pacientesSearch.value = []
  pasoActual.value = 2
}

function seleccionarMedico(m: any) {
  medicoSeleccionado.value = m
  nuevaCita.value.medico_search = `${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}`
  medicosSearch.value = []
}

let searchTimeout: any = null
async function buscarMedico() {
  const termino = nuevaCita.value.medico_search.trim()
  if (!termino || termino.length < 2) { medicosSearch.value = []; return }
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    buscandoMedico.value = true
    try {
      const data: any = await $fetch('/api/medicos/buscar?q=' + encodeURIComponent(termino), { headers: { Authorization: 'Bearer ' + adminToken.value } })
      medicosSearch.value = data.medicos || []
    } catch { medicosSearch.value = [] }
    buscandoMedico.value = false
  }, 400)
}

async function buscarPacientesAdmin() {
  const termino = nuevaCita.value.paciente_search.trim()
  if (!termino || termino.length < 2) { pacientesSearch.value = []; return }
  try {
    const data: any = await $fetch('/api/admin/pacientes', { headers: { Authorization: 'Bearer ' + adminToken.value } })
    const all = data?.pacientes || []
    const s = termino.toLowerCase()
    pacientesSearch.value = all.filter((p: any) =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)
    ).slice(0, 10)
  } catch { pacientesSearch.value = [] }
}

async function parsearMensaje() {
  const text = nuevaCita.value.wa_text
  if (!text.trim()) return
  parseando.value = true
  errorCita.value = ''

  const medicoMatch = text.match(/(?:con\s+(?:el\s+)?|atención\s+(?:con\s+)?)?(?:médico|doctor|dra?\.?)\s+([^\n.,;]+)/i)
  if (medicoMatch) {
    const nombreMedico = medicoMatch[1].trim().replace(/^(dra?\.?\s*)/i, '').trim()
    nuevaCita.value.medico_search = nombreMedico
    await buscarMedico()
  }

  const idMatch = text.match(/ID\s+de\s+usuario\s+es:\s*([a-f0-9-]+)/i) || text.match(/ID\s*[:=]\s*([a-f0-9-]+)/i)
  if (idMatch) {
    nuevaCita.value.paciente_search = idMatch[1].trim()
  } else {
    const nombreMatch = text.match(/nombre\s+es:\s*(.+?)(?:\.|\n|$)/i) || text.match(/nombre\s*[:=]\s*(.+?)(?:\.|\n|$)/i)
    if (nombreMatch) {
      nuevaCita.value.paciente_search = nombreMatch[1].trim()
    }
  }
  if (nuevaCita.value.paciente_search) {
    await buscarPacientesAdmin()
  }

  parseando.value = false
  if (pacienteSeleccionado.value) {
    pasoActual.value = 2
  }
}

async function crearCita() {
  errorCita.value = ''
  if (!pacienteSeleccionado.value) { errorCita.value = 'Selecciona un paciente en el paso 1'; pasoActual.value = 1; return }
  if (!nuevaCita.value.medico_search.trim()) { errorCita.value = 'Escribe el nombre del médico'; pasoActual.value = 2; return }
  if (!nuevaCita.value.fecha || !nuevaCita.value.hora) { errorCita.value = 'Selecciona fecha y hora'; return }
  creandoCita.value = true
  try {
    const fecha_hora = nuevaCita.value.fecha + 'T' + nuevaCita.value.hora + ':00'
    const body: any = {
      id_paciente: pacienteSeleccionado.value.id,
      medico_nombre: nuevaCita.value.medico_search.trim(),
      fecha_hora,
      notas_asistente: nuevaCita.value.notas || nuevaCita.value.wa_text
    }
    if (medicoSeleccionado.value) body.id_medico = medicoSeleccionado.value.id
    await $fetch('/api/asistente/citas', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body })
    showNuevaCita.value = false
    await cargarCitas()
  } catch (e: any) { errorCita.value = e.data?.message || 'Error al crear cita' }
  creandoCita.value = false
}

async function abrirCita(cita: any) {
  citaSeleccionada.value = cita
  showModal.value = true
  try {
    const data: any = await $fetch('/api/asistente/citas/' + cita.id + '/bitacora', {
      headers: { Authorization: 'Bearer ' + adminToken.value }
    })
    bitacora.value = data?.bitacora || []
    mensajesWA.value = data?.mensajes_whatsapp || []
  } catch (e) { console.error(e) }
}

async function cambiarEstado(estado: string, descripcion: string) {
  if (!citaSeleccionada.value) return
  try {
    await $fetch('/api/asistente/citas/' + citaSeleccionada.value.id + '/estado', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + adminToken.value },
      body: { estado, descripcion }
    })
    await abrirCita(citaSeleccionada.value)
    await cargarCitas()
  } catch (e: any) { alert(e.data?.message || 'Error') }
}

async function agregarNota() {
  if (!notaText.value.trim() || !citaSeleccionada.value) return
  try {
    await $fetch('/api/asistente/citas/' + citaSeleccionada.value.id + '/estado', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + adminToken.value },
      body: { estado: citaSeleccionada.value.estado, descripcion: notaText.value }
    })
    notaText.value = ''
    await abrirCita(citaSeleccionada.value)
  } catch (e: any) { alert(e.data?.message || 'Error') }
}

async function registrarMensaje() {
  if (!newMsg.value.mensaje.trim()) return
  try {
    await $fetch('/api/asistente/whatsapp', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken.value },
      body: { id_cita: citaSeleccionada.value?.id, ...newMsg.value }
    })
    newMsg.value = { remitente: '', destinatario: '', telefono: '', mensaje: '' }
    await abrirCita(citaSeleccionada.value)
  } catch (e: any) { alert(e.data?.message || 'Error') }
}

async function buscarPerfilMedico() {
  const termino = medicoBusqueda.value.trim()
  if (!termino || termino.length < 2) { medicoResults.value = []; return }
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    buscandoPerfilMedico.value = true
    try {
      const data: any = await $fetch('/api/medicos/buscar?q=' + encodeURIComponent(termino), { headers: { Authorization: 'Bearer ' + adminToken.value } })
      medicoResults.value = data.medicos || []
    } catch { medicoResults.value = [] }
    buscandoPerfilMedico.value = false
  }, 400)
}

function seleccionarPerfilMedico(m: any) { medicoSeleccionadoPerfil.value = m; medicoResults.value = [] }
function cerrarPerfilMedico() { medicoSeleccionadoPerfil.value = null; medicoBusqueda.value = '' }
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas" class="active">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/facturacion">Facturacion</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
    </aside>
    <main class="admin-content">
      <div class="tabs">
        <button :class="{ active: activeTab === 'citas' }" @click="activeTab = 'citas'">Citas</button>
        <button :class="{ active: activeTab === 'medicos' }" @click="activeTab = 'medicos'">Medicos</button>
      </div>

      <div v-if="activeTab === 'citas'">
        <header class="content-header">
          <h1>Gestion de Citas</h1>
          <div class="header-actions">
            <div class="view-toggle">
              <button :class="{ active: vistaCitas === 'calendar' }" @click="vistaCitas = 'calendar'" title="Vista calendario">Calendario</button>
              <button :class="{ active: vistaCitas === 'list' }" @click="vistaCitas = 'list'" title="Vista lista">Lista</button>
            </div>
            <button @click="abrirNuevaCita" class="btn-primary">+ Nueva Cita</button>
          </div>
        </header>

        <div class="filters">
          <input v-model="search" placeholder="Buscar por paciente o medico..." />
          <select v-model="filterEstado">
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="asistida">Asistidas</option>
            <option value="cancelada">Canceladas</option>
            <option value="no_asistida">No Asistidas</option>
          </select>
          <span class="count">{{ filtered.length }} citas</span>
        </div>

        <p v-if="loading" class="loading">Cargando...</p>

        <CalendarioCitas v-if="vistaCitas === 'calendar' && !loading" :citas="filtered" @seleccionar-cita="abrirCita" />

        <div v-if="vistaCitas === 'list' && !loading" class="table-container">
          <table>
            <thead><tr><th>Paciente</th><th>Medico</th><th>Fecha y Hora</th><th>Estado</th></tr></thead>
            <tbody>
              <tr v-for="c in filtered" :key="c.id" class="cita-row" @click="abrirCita(c)">
                <td><strong>{{ c.paciente_nombre || '—' }}</strong></td>
                <td>{{ c.medico_nombre || '—' }}</td>
                <td>{{ new Date(c.fecha_hora).toLocaleString('es-MX') }}</td>
                <td><span class="badge" :style="{ background: estadoColor(c.estado) }">{{ c.estado }}</span></td>
              </tr>
              <tr v-if="!filtered.length"><td colspan="4" class="empty">Sin resultados</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'medicos'">
        <header class="content-header"><h1>Directorio de Medicos</h1></header>
        <div class="search-box"><input v-model="medicoBusqueda" placeholder="Buscar medico por nombre..." @input="buscarPerfilMedico" /></div>
        <div v-if="medicoResults.length > 0 && !medicoSeleccionadoPerfil" class="results-list">
          <div v-for="m in medicoResults" :key="m.id" class="result-card" @click="seleccionarPerfilMedico(m)">
            <div class="result-avatar blue"><span>{{ m.nombre?.charAt(0) }}{{ m.apellido?.charAt(0) }}</span></div>
            <div class="result-info"><strong>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</strong><span>{{ m.especialidad_nombre || 'Sin especialidad' }}</span></div>
          </div>
        </div>
        <div v-if="medicoSeleccionadoPerfil" class="medico-perfil">
          <button class="btn-back" @click="cerrarPerfilMedico">&larr; Volver</button>
          <div class="perfil-header">
            <div class="result-avatar blue"><span>{{ medicoSeleccionadoPerfil.nombre?.charAt(0) }}{{ medicoSeleccionadoPerfil.apellido?.charAt(0) }}</span></div>
            <div class="perfil-info">
              <h2>{{ medicoSeleccionadoPerfil.titulo || 'Dr.' }} {{ medicoSeleccionadoPerfil.nombre }} {{ medicoSeleccionadoPerfil.apellido }}</h2>
              <span>{{ medicoSeleccionadoPerfil.especialidad_nombre }}</span>
              <span v-if="medicoSeleccionadoPerfil.cedula_profesional">Cedula: {{ medicoSeleccionadoPerfil.cedula_profesional }}</span>
              <span v-if="medicoSeleccionadoPerfil.email">{{ medicoSeleccionadoPerfil.email }}</span>
              <span v-if="medicoSeleccionadoPerfil.telefono">{{ medicoSeleccionadoPerfil.telefono }}</span>
            </div>
          </div>
        </div>
        <div v-if="!medicoSeleccionadoPerfil && medicoResults.length === 0 && medicoBusqueda.length >= 2" class="empty">No se encontraron medicos</div>
        <div v-if="medicoBusqueda.length < 2" class="empty">Escribe al menos 2 caracteres para buscar</div>
      </div>
    </main>

    <div v-if="showNuevaCita" class="modal-overlay" @click.self="showNuevaCita = false">
      <div class="modal">
        <div class="modal-header"><h2>Nueva Cita</h2><button class="modal-close" @click="showNuevaCita = false">&times;</button></div>
        <div class="modal-body">
          <div v-if="errorCita" class="error">{{ errorCita }}</div>
          <div class="stepper">
            <div class="step" :class="{ active: pasoActual === 1, done: pacienteSeleccionado }"><span class="step-num">1</span> Paciente</div>
            <div class="step-line" :class="{ done: pacienteSeleccionado }"></div>
            <div class="step" :class="{ active: pasoActual === 2, done: nuevaCita.medico_search.trim() }"><span class="step-num">2</span> Medico</div>
            <div class="step-line" :class="{ done: nuevaCita.medico_search.trim() }"></div>
            <div class="step" :class="{ active: pasoActual === 3 }"><span class="step-num">3</span> Fecha/Hora</div>
          </div>

          <div v-if="pasoActual === 1">
            <div class="form-group">
              <label>Pegar mensaje de WhatsApp (opcional)</label>
              <textarea v-model="nuevaCita.wa_text" rows="3" placeholder="Pega aqui el mensaje de WhatsApp para auto-detectar paciente y medico..."></textarea>
              <button @click="parsearMensaje" :disabled="parseando || !nuevaCita.wa_text.trim()" class="btn-secondary mt-2">{{ parseando ? 'Analizando...' : 'Analizar mensaje' }}</button>
            </div>
            <div class="form-group"><label>Buscar paciente</label><input v-model="nuevaCita.paciente_search" placeholder="Nombre o email..." @input="buscarPacientesAdmin" />
              <div v-if="pacientesSearch.length > 0 && !pacienteSeleccionado" class="search-results">
                <div v-for="p in pacientesSearch" :key="p.id" class="search-item" @click="seleccionarPaciente(p)"><strong>{{ p.nombre }} {{ p.apellido }}</strong><span>{{ p.email }}</span></div>
              </div>
            </div>
            <div v-if="pacienteSeleccionado" class="selected-card"><span class="check">✓</span><strong>{{ pacienteSeleccionado.nombre }} {{ pacienteSeleccionado.apellido }}</strong></div>
            <button @click="pasoActual = 2" class="btn-primary" :disabled="!pacienteSeleccionado">Siguiente</button>
          </div>

          <div v-if="pasoActual === 2">
            <div class="form-group"><label>Nombre del medico</label><input v-model="nuevaCita.medico_search" placeholder="Ej. Carlos Ramirez" @input="buscarMedico" /></div>
            <div v-if="medicosSearch.length > 0 && !medicoSeleccionado" class="results-list">
              <div v-for="m in medicosSearch" :key="m.id" class="result-card" @click="seleccionarMedico(m)">
                <div class="result-info"><strong>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</strong><span>{{ m.especialidad_nombre || '' }}</span></div>
              </div>
            </div>
            <div v-if="medicoSeleccionado" class="selected-card"><span class="check">✓</span><strong>{{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellido }}</strong></div>
            <div class="btn-row"><button @click="pasoActual = 1" class="btn-cancel">Atras</button><button @click="pasoActual = 3" class="btn-primary">Siguiente</button></div>
          </div>

          <div v-if="pasoActual === 3">
            <div class="form-row"><div class="form-group"><label>Fecha</label><input v-model="nuevaCita.fecha" type="date" /></div><div class="form-group"><label>Hora</label><input v-model="nuevaCita.hora" type="time" /></div></div>
            <div class="form-group"><label>Notas</label><textarea v-model="nuevaCita.notas" rows="2"></textarea></div>
            <div class="btn-row"><button @click="pasoActual = 2" class="btn-cancel">Atras</button><button @click="crearCita" :disabled="creandoCita" class="btn-primary">{{ creandoCita ? 'Creando...' : 'Crear Cita' }}</button></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Detalle de Cita</h2>
          <button @click="showModal = false" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" v-if="citaSeleccionada">
          <div class="info-grid">
            <div><strong>Estado:</strong> <span class="badge" :style="{ background: estadoColor(citaSeleccionada.estado) }">{{ citaSeleccionada.estado }}</span></div>
            <div><strong>Fecha:</strong> {{ new Date(citaSeleccionada.fecha_hora).toLocaleString('es-MX') }}</div>
            <div>
              <strong>Paciente:</strong> {{ citaSeleccionada.paciente_nombre }} {{ citaSeleccionada.paciente_apellido }}
              <a v-if="citaSeleccionada.paciente_telefono" class="link-wa" @click="abrirWA(citaSeleccionada.paciente_telefono)">WhatsApp</a>
            </div>
            <div>
              <strong>Medico:</strong> {{ citaSeleccionada.medico_nombre }} {{ citaSeleccionada.medico_apellido }}
              <a v-if="citaSeleccionada.medico_whatsapp" class="link-wa" @click="abrirWA(citaSeleccionada.medico_whatsapp)">WhatsApp</a>
            </div>
          </div>

          <div class="acciones">
            <h3>Acciones</h3>
            <div class="btn-group">
              <button v-if="citaSeleccionada.estado === 'pendiente'" @click="cambiarEstado('confirmada', 'Confirmada por admin')" class="btn-action btn-confirm">Confirmar</button>
              <button v-if="citaSeleccionada.estado === 'confirmada'" @click="cambiarEstado('paciente_llego', 'Paciente llego (reportado por admin)')" class="btn-action btn-arrival">Paciente Llego</button>
              <button v-if="citaSeleccionada.estado === 'paciente_llego'" @click="cambiarEstado('en_atencion', 'Iniciando atencion')" class="btn-action btn-attention">Iniciar Atencion</button>
              <button v-if="['en_atencion','paciente_llego'].includes(citaSeleccionada.estado)" @click="cambiarEstado('asistida', 'Cita completada')" class="btn-action btn-success">Marcar Asistida</button>
              <button v-if="['pendiente','confirmada','paciente_llego'].includes(citaSeleccionada.estado)" @click="cambiarEstado('cancelada', 'Cancelada por admin')" class="btn-action btn-cancel-action">Cancelar</button>
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
            <h3>Bitacora de Cambios</h3>
            <div v-if="bitacora.length === 0" class="empty">Sin registros</div>
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
            <div v-if="mensajesWA.length === 0" class="empty">Sin mensajes registrados</div>
            <div v-for="wm in mensajesWA" :key="wm.id" class="wa-entry">
              <span class="wa-dir" :class="wm.direccion">{{ wm.direccion === 'saliente' ? '→' : '←' }}</span>
              <span class="wa-from">{{ wm.remitente || 'Desconocido' }}</span>
              <span class="wa-msg">{{ wm.mensaje }}</span>
              <span class="wa-time">{{ new Date(wm.created_at).toLocaleTimeString('es-MX') }}</span>
            </div>
            <div class="wa-new">
              <input v-model="newMsg.remitente" placeholder="Remitente" />
              <input v-model="newMsg.telefono" placeholder="Telefono" />
              <input v-model="newMsg.mensaje" placeholder="Mensaje..." @keyup.enter="registrarMensaje" />
              <button @click="registrarMensaje" class="btn-secondary">Registrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-brand h2 { font-size: 1.1rem; margin: 0; }
.sidebar-brand .rol { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.tabs { display: flex; gap: 0.25rem; margin-bottom: 1.5rem; border-bottom: 2px solid #e0e0e0; }
.tabs button { background: none; border: none; padding: 0.75rem 1.5rem; cursor: pointer; font-size: 0.95rem; color: #636e72; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tabs button.active { color: #00b894; border-bottom-color: #00b894; font-weight: 600; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.header-actions { display: flex; align-items: center; gap: 0.75rem; }
.view-toggle { display: flex; background: #dfe6e9; border-radius: 8px; overflow: hidden; }
.view-toggle button { background: none; border: none; padding: 0.45rem 0.75rem; cursor: pointer; font-size: 0.85rem; }
.view-toggle button.active { background: #00b894; color: white; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #0984e3; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.mt-2 { margin-top: 0.5rem; }
.filters { display: flex; gap: 0.8rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
.filters input { flex: 1; min-width: 200px; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
.filters select { padding: 0.6rem; border: 1px solid #e0e0e0; border-radius: 8px; }
.count { font-size: 0.85rem; color: #636e72; }
.loading { text-align: center; padding: 2rem; color: #636e72; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.cita-row { cursor: pointer; transition: background 0.1s; }
.cita-row:hover { background: #f0fff4; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; color: white; font-size: 0.75rem; text-transform: capitalize; }
.search-box { margin-bottom: 1rem; }
.search-box input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; }
.results-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.result-card { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 1rem; border: 1px solid #e0e0e0; border-radius: 10px; cursor: pointer; transition: 0.15s; }
.result-card:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.result-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.85rem; flex-shrink: 0; }
.result-avatar.blue { background: #0984e3; }
.result-info { display: flex; flex-direction: column; }
.result-info strong { font-size: 0.95rem; color: #2d3436; }
.result-info span { font-size: 0.8rem; color: #636e72; }
.medico-perfil { background: white; border-radius: 10px; border: 1px solid #e0e0e0; padding: 1.5rem; }
.btn-back { background: none; border: none; color: #00b894; cursor: pointer; font-size: 0.9rem; margin-bottom: 1rem; }
.perfil-header { display: flex; gap: 1rem; align-items: center; }
.perfil-info { display: flex; flex-direction: column; gap: 0.2rem; }
.perfil-info h2 { margin: 0; font-size: 1.2rem; color: #2d3436; }
.perfil-info span { font-size: 0.85rem; color: #636e72; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.15rem; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-body { padding: 1.5rem; }
.form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; position: relative; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group textarea { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: #00b894; }
.form-row { display: flex; gap: 1rem; }
.form-row > .form-group { flex: 1; }
.search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e0e0e0; border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.search-item { padding: 0.6rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
.search-item:hover { background: #f8f9fa; }
.search-item strong { display: block; font-size: 0.9rem; }
.search-item span { font-size: 0.8rem; color: #636e72; }
.selected-card { background: #f0fff4; border: 1px solid #00b894; border-radius: 8px; padding: 0.8rem 1rem; margin: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; }
.selected-card .check { color: #00b894; font-weight: bold; }
.error { background: #ffebee; color: #c62828; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
.step { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #b2bec3; font-weight: 500; }
.step.active { color: #00b894; font-weight: 700; }
.step.done { color: #00b894; }
.step-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e0e0e0; font-size: 0.75rem; font-weight: 700; }
.step.active .step-num { background: #00b894; color: white; border-color: #00b894; }
.step.done .step-num { background: #00b894; color: white; border-color: #00b894; }
.step-line { width: 40px; height: 2px; background: #e0e0e0; margin: 0 0.3rem; }
.step-line.done { background: #00b894; }
.btn-row { display: flex; gap: 0.75rem; margin-top: 1rem; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #f0f0f0; }
.info-grid div { font-size: 0.9rem; }
.info-grid strong { color: #636e72; }
.link-wa { color: #25d366; cursor: pointer; font-size: 0.8rem; margin-left: 0.5rem; text-decoration: underline; }
.acciones { margin-bottom: 1.25rem; }
.acciones h3, .nota-section h3, .bitacora-section h3, .wa-section h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #2d3436; }
.btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.btn-action { border: none; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; color: white; }
.btn-confirm { background: #00b894; }
.btn-arrival { background: #0984e3; }
.btn-attention { background: #6c5ce7; }
.btn-success { background: #00cec9; }
.btn-cancel-action { background: #d63031; }
.nota-section { margin-bottom: 1.25rem; }
.nota-input { display: flex; gap: 0.5rem; }
.nota-input input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.bitacora-section { margin-bottom: 1.25rem; max-height: 200px; overflow-y: auto; }
.bitacora-entry { padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.8rem; }
.bit-time { color: #b2bec3; margin-right: 0.5rem; }
.bit-user { color: #636e72; margin-right: 0.5rem; }
.bit-action { font-weight: 600; color: #2d3436; }
.bit-from { color: #d63031; margin-right: 0.25rem; }
.bit-to { color: #00b894; }
.bit-desc { margin: 0.25rem 0 0; color: #636e72; font-style: italic; }
.wa-section { margin-bottom: 0.5rem; }
.wa-entry { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.8rem; }
.wa-dir { font-weight: bold; width: 20px; text-align: center; }
.wa-dir.entrante { color: #00b894; }
.wa-dir.saliente { color: #0984e3; }
.wa-from { color: #636e72; min-width: 80px; }
.wa-msg { flex: 1; color: #2d3436; }
.wa-time { color: #b2bec3; font-size: 0.75rem; }
.wa-new { display: flex; gap: 0.4rem; margin-top: 0.75rem; flex-wrap: wrap; }
.wa-new input { flex: 1; min-width: 80px; padding: 0.4rem 0.6rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.8rem; }
</style>