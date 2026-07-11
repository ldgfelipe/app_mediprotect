<script setup>
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
const medicosSearch = ref([])
const pacienteSeleccionado = ref(null)
const medicoSeleccionado = ref(null)
const creandoCita = ref(false)
const errorCita = ref('')
const parseando = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('usuario')
  if (!saved) { navigateTo('/login-asistente'); return }
  usuario.value = JSON.parse(saved)
  cargarCitas()
})

async function cargarCitas() {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (filtroEstado.value) qs.set('estado', filtroEstado.value)
    if (busqueda.value) qs.set('search', busqueda.value)
    const { data } = await useFetch('/api/asistente/citas?' + qs.toString(), {
      headers: { Authorization: 'Bearer ' + useCookie('token').value }
    })
    citas.value = data.value?.citas || []
  } catch (e) { console.error(e) }
  loading.value = false
}

// Parse WhatsApp message
async function parsearMensaje() {
  const text = nuevaCita.value.wa_text
  if (!text.trim()) return
  parseando.value = true
  errorCita.value = ''

  // Extract doctor name
  const medicoMatch = text.match(/médico\s+([^\n.]+)/i) || text.match(/doctor\s+([^\n.]+)/i) || text.match(/con\s+(?:el\s+)?(?:médico|doctor)\s+([^\n.]+)/i)
  if (medicoMatch) {
    nuevaCita.value.medico_search = medicoMatch[1].trim().replace(/^(Dr\.?\s*|Dra\.?\s*)/i, '')
    await buscarMedicos()
  }

  // Extract patient ID
  const idMatch = text.match(/ID\s+de\s+usuario\s+es:\s*([a-f0-9-]+)/i) || text.match(/ID\s*[:=]\s*([a-f0-9-]+)/i)
  if (idMatch) {
    nuevaCita.value.paciente_search = idMatch[1].trim()
    await buscarPacientesById()
  } else {
    // Try name
    const nombreMatch = text.match(/nombre\s+es:\s*(.+?)(?:\.|\n|$)/i) || text.match(/nombre\s*[:=]\s*(.+?)(?:\.|\n|$)/i)
    if (nombreMatch) {
      nuevaCita.value.paciente_search = nombreMatch[1].trim()
      await buscarPacientes()
    }
  }
  parseando.value = false
}

async function buscarPacientesById() {
  if (!nuevaCita.value.paciente_search.trim()) { pacientesSearch.value = []; return }
  try {
    const data = await $fetch('/api/asistente/pacientes?search=' + encodeURIComponent(nuevaCita.value.paciente_search), {
      headers: { Authorization: 'Bearer ' + useCookie('token').value }
    })
    pacientesSearch.value = data.pacientes || []
    if (pacientesSearch.value.length === 1) {
      seleccionarPaciente(pacientesSearch.value[0])
    }
  } catch (e) { pacientesSearch.value = [] }
}

async function buscarPacientes() {
  if (!nuevaCita.value.paciente_search.trim()) { pacientesSearch.value = []; return }
  try {
    const data = await $fetch('/api/asistente/pacientes?search=' + encodeURIComponent(nuevaCita.value.paciente_search), {
      headers: { Authorization: 'Bearer ' + useCookie('token').value }
    })
    pacientesSearch.value = data.pacientes || []
    if (pacientesSearch.value.length === 1) {
      seleccionarPaciente(pacientesSearch.value[0])
    }
  } catch (e) { pacientesSearch.value = [] }
}

async function buscarMedicos() {
  if (!nuevaCita.value.medico_search.trim()) { medicosSearch.value = []; return }
  try {
    const data = await $fetch('/api/medicos?search=' + encodeURIComponent(nuevaCita.value.medico_search))
    medicosSearch.value = data.medicos || []
    if (medicosSearch.value.length === 1) {
      seleccionarMedico(medicosSearch.value[0])
    }
  } catch (e) { medicosSearch.value = [] }
}

function seleccionarPaciente(p) {
  pacienteSeleccionado.value = { ...p }
  nuevaCita.value.paciente_search = p.nombre + ' ' + p.apellido
  pacientesSearch.value = []
}

function seleccionarMedico(m) {
  medicoSeleccionado.value = { ...m }
  nuevaCita.value.medico_search = (m.titulo || 'Dr.') + ' ' + m.nombre + ' ' + m.apellido
  medicosSearch.value = []
}

async function crearCita() {
  errorCita.value = ''
  if (!pacienteSeleccionado.value || !medicoSeleccionado.value || !nuevaCita.value.fecha || !nuevaCita.value.hora) {
    errorCita.value = 'Selecciona paciente, médico, fecha y hora'
    return
  }
  creandoCita.value = true
  try {
    const fecha_hora = nuevaCita.value.fecha + 'T' + nuevaCita.value.hora + ':00'
    await $fetch('/api/asistente/citas', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + useCookie('token').value },
      body: {
        id_paciente: pacienteSeleccionado.value.id,
        id_medico: medicoSeleccionado.value.id,
        fecha_hora,
        notas_asistente: nuevaCita.value.notas || nuevaCita.value.wa_text,
      }
    })
    showNuevaCita.value = false
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
    const { data } = await useFetch('/api/asistente/citas/' + cita.id + '/bitacora', {
      headers: { Authorization: 'Bearer ' + useCookie('token').value }
    })
    bitacora.value = data.value?.bitacora || []
    mensajesWA.value = data.value?.mensajes_whatsapp || []
  } catch (e) { console.error(e) }
}

async function cambiarEstado(estado, descripcion) {
  if (!citaSeleccionada.value) return
  try {
    await $fetch('/api/asistente/citas/' + citaSeleccionada.value.id + '/estado', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + useCookie('token').value },
      body: { estado, descripcion }
    })
    await abrirCita(citaSeleccionada.value)
    await cargarCitas()
  } catch (e) { alert(e.data?.message || 'Error') }
}

async function agregarNota() {
  if (!notaText.value.trim() || !citaSeleccionada.value) return
  try {
    await $fetch('/api/asistente/citas/' + citaSeleccionada.value.id + '/estado', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + useCookie('token').value },
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
      headers: { Authorization: 'Bearer ' + useCookie('token').value },
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
  localStorage.removeItem('usuario')
  useCookie('token').value = null
  navigateTo('/login-asistente')
}

function estadoColor(estado) {
  const colors = { pendiente: '#fdcb6e', confirmada: '#0984e3', paciente_llego: '#00b894', en_atencion: '#6c5ce7', asistida: '#00b894', no_asistida: '#d63031', cancelada: '#b2bec3', reagendada: '#e17055' }
  return colors[estado] || '#dfe6e9'
}
</script>

<template>
  <div class="dashboard" v-if="usuario">
    <header class="header">
      <div class="header-inner">
        <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" />
        <nav>
          <NuxtLink to="/asistente" class="active">Citas</NuxtLink>
        </nav>
        <div class="user-info">
          <span>{{ usuario.nombre }} {{ usuario.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>

    <main class="content">
      <div class="content-header">
        <h1>Gestión de Citas</h1>
        <button @click="showNuevaCita = true" class="btn-primary">+ Nueva Cita</button>
      </div>

      <!-- Filtros -->
      <div class="filters">
        <input v-model="busqueda" placeholder="Buscar por nombre, apellido, ID o UUID..." @keyup.enter="cargarCitas" />
        <select v-model="filtroEstado" @change="cargarCitas">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="paciente_llego">Paciente llegó</option>
          <option value="en_atencion">En atención</option>
          <option value="asistida">Asistida</option>
          <option value="no_asistida">No asistida</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button @click="cargarCitas" class="btn-secondary">Actualizar</button>
      </div>

      <div v-if="loading" class="loading">Cargando...</div>
      <div v-else-if="citas.length === 0" class="empty">No hay citas con esos filtros.</div>

      <div v-else class="citas-list">
        <div v-for="c in citas" :key="c.id" class="cita-card" @click="abrirCita(c)">
          <div class="cita-header">
            <span class="estado-badge" :style="{ background: estadoColor(c.estado) }">{{ c.estado }}</span>
            <span class="fecha">{{ new Date(c.fecha_hora).toLocaleString('es-MX') }}</span>
          </div>
          <div class="cita-body">
            <div class="cita-col">
              <strong>Paciente:</strong> {{ c.paciente_nombre }} {{ c.paciente_apellido }}
              <span v-if="c.paciente_telefono" class="phone" @click.stop="abrirWA(c.paciente_telefono)">📱 WhatsApp</span>
            </div>
            <div class="cita-col">
              <strong>Médico:</strong> {{ c.medico_nombre }} {{ c.medico_apellido }}
              <span v-if="c.medico_whatsapp" class="phone" @click.stop="abrirWA(c.medico_whatsapp)">📱 WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal NUEVA CITA -->
    <div v-if="showNuevaCita" class="modal-overlay" @click.self="showNuevaCita = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Alta Cita (desde WhatsApp)</h2>
          <button @click="showNuevaCita = false" class="close">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="errorCita" class="error">{{ errorCita }}</div>

          <!-- Paso 1: Pegar mensaje de WhatsApp -->
          <div class="field">
            <label>Mensaje de WhatsApp (copia y pega)</label>
            <textarea v-model="nuevaCita.wa_text" rows="5" placeholder="Pega aquí el mensaje que llegó por WhatsApp..."></textarea>
            <button @click="parsearMensaje" :disabled="parseando || !nuevaCita.wa_text.trim()" class="btn-parse">
              {{ parseando ? 'Analizando...' : '🔍 Analizar mensaje' }}
            </button>
          </div>

          <!-- Paso 2: Paciente -->
          <div class="field">
            <label>Paciente (ID o nombre)</label>
            <input v-model="nuevaCita.paciente_search" placeholder="ID del paciente o nombre..." @input="buscarPacientes" />
            <div v-if="pacientesSearch.length > 0 && !pacienteSeleccionado" class="search-results">
              <div v-for="p in pacientesSearch" :key="p.id" class="search-item" @click="seleccionarPaciente(p)">
                <strong>{{ p.nombre }} {{ p.apellido }}</strong>
                <span>{{ p.telefono || p.email }}</span>
              </div>
            </div>
            <div v-if="pacienteSeleccionado" class="selected-card">
              <div class="selected-header">
                <span class="check">✓</span>
                <strong>{{ pacienteSeleccionado.nombre }} {{ pacienteSeleccionado.apellido }}</strong>
                <button @click="pacienteSeleccionado = null; nuevaCita.paciente_search = ''" class="btn-remove">✕</button>
              </div>
              <div class="selected-details">
                <span v-if="pacienteSeleccionado.telefono">📱 {{ pacienteSeleccionado.telefono }}</span>
                <span v-if="pacienteSeleccionado.email">✉️ {{ pacienteSeleccionado.email }}</span>
                <span v-if="pacienteSeleccionado.id">🔑 ID: {{ pacienteSeleccionado.id.substring(0,8) }}...</span>
              </div>
            </div>
          </div>

          <!-- Paso 3: Médico -->
          <div class="field">
            <label>Médico</label>
            <input v-model="nuevaCita.medico_search" placeholder="Nombre del médico..." @input="buscarMedicos" />
            <div v-if="medicosSearch.length > 0 && !medicoSeleccionado" class="search-results">
              <div v-for="m in medicosSearch" :key="m.id" class="search-item" @click="seleccionarMedico(m)">
                <strong>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</strong>
                <span>{{ m.especialidad_nombre || m.subespecialidad || m.especialidad }}</span>
              </div>
            </div>
            <div v-if="medicoSeleccionado" class="selected-card">
              <div class="selected-header">
                <span class="check">✓</span>
                <strong>{{ medicoSeleccionado.titulo || 'Dr.' }} {{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellido }}</strong>
                <button @click="medicoSeleccionado = null; nuevaCita.medico_search = ''" class="btn-remove">✕</button>
              </div>
              <div class="selected-details">
                <span v-if="medicoSeleccionado.especialidad_nombre">🩺 {{ medicoSeleccionado.especialidad_nombre }}</span>
                <span v-if="medicoSeleccionado.subespecialidad">| {{ medicoSeleccionado.subespecialidad }}</span>
              </div>
            </div>
          </div>

          <!-- Paso 4: Fecha y hora -->
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

          <!-- Notas -->
          <div class="field">
            <label>Notas (opcional)</label>
            <textarea v-model="nuevaCita.notas" placeholder="Notas adicionales..." rows="2"></textarea>
          </div>

          <button @click="crearCita" :disabled="creandoCita || !pacienteSeleccionado || !medicoSeleccionado || !nuevaCita.fecha || !nuevaCita.hora" class="btn-primary full">
            {{ creandoCita ? 'Creando...' : 'Crear Cita' }}
          </button>
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

          <div class="acciones">
            <h3>Acciones</h3>
            <div class="btn-group">
              <button v-if="citaSeleccionada.estado === 'pendiente'" @click="cambiarEstado('confirmada', 'Confirmada por asistente')" class="btn-action btn-confirm">Confirmar</button>
              <button v-if="citaSeleccionada.estado === 'confirmada'" @click="cambiarEstado('paciente_llego', 'Paciente llegó (reportado por asistente)')" class="btn-action btn-arrival">Paciente Llegó</button>
              <button v-if="citaSeleccionada.estado === 'paciente_llego'" @click="cambiarEstado('en_atencion', 'Iniciando atención')" class="btn-action btn-attention">Iniciar Atención</button>
              <button v-if="['en_atencion','paciente_llego'].includes(citaSeleccionada.estado)" @click="cambiarEstado('asistida', 'Cita completada')" class="btn-action btn-success">Marcar Asistida</button>
              <button v-if="['pendiente','confirmada','paciente_llego'].includes(citaSeleccionada.estado)" @click="cambiarEstado('cancelada', 'Cancelada por asistente')" class="btn-action btn-cancel">Cancelar</button>
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
  </div>
</template>

<style scoped>
.dashboard { min-height: 100vh; background: #f0f2f5; }
.header { background: white; padding: 0.8rem 2rem; border-bottom: 1px solid #e0e0e0; }
.header-inner { display: flex; align-items: center; gap: 2rem; max-width: 1200px; margin: 0 auto; }
.logo { height: 35px; }
nav { display: flex; gap: 1rem; }
nav a { text-decoration: none; color: #636e72; padding: 0.4rem 0.8rem; border-radius: 6px; }
nav a.active { background: #0984e3; color: white; }
.user-info { margin-left: auto; display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #dfe6e9; padding: 0.3rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }

.content { max-width: 1200px; margin: 1.5rem auto; padding: 0 1rem; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
h1 { font-size: 1.5rem; color: #2d3436; }

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

.acciones { margin-bottom: 1.5rem; }
.acciones h3, .nota-section h3, .bitacora-section h3, .wa-section h3 { font-size: 1rem; margin-bottom: 0.8rem; color: #2d3436; }
.btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-action { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: white; }
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
.btn-secondary { background: white; color: #0984e3; border: 1px solid #0984e3; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.error { background: #ffeaa7; color: #d63031; padding: 0.6rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; }
.loading, .empty { text-align: center; padding: 2rem; color: #636e72; }
</style>
