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
const showWA = ref(false)
const notaText = ref('')
const newMsg = ref({ remitente: '', destinatario: '', telefono: '', mensaje: '' })

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
    const { data } = await useFetch(`/api/asistente/citas?${qs}`, {
      headers: { Authorization: `Bearer ${useCookie('token').value}` }
    })
    citas.value = data.value?.citas || []
  } catch (e) { console.error(e) }
  loading.value = false
}

async function abrirCita(cita) {
  citaSeleccionada.value = cita
  showModal.value = true
  try {
    const { data } = await useFetch(`/api/asistente/citas/${cita.id}/bitacora`, {
      headers: { Authorization: `Bearer ${useCookie('token').value}` }
    })
    bitacora.value = data.value?.bitacora || []
    mensajesWA.value = data.value?.mensajes_whatsapp || []
  } catch (e) { console.error(e) }
}

async function cambiarEstado(estado, descripcion) {
  if (!citaSeleccionada.value) return
  try {
    await $fetch(`/api/asistente/citas/${citaSeleccionada.value.id}/estado`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${useCookie('token').value}` },
      body: { estado, descripcion }
    })
    await abrirCita(citaSeleccionada.value)
    await cargarCitas()
  } catch (e) { alert(e.data?.message || 'Error') }
}

async function agregarNota() {
  if (!notaText.value.trim() || !citaSeleccionada.value) return
  try {
    await $fetch(`/api/asistente/citas/${citaSeleccionada.value.id}/estado`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${useCookie('token').value}` },
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
      headers: { Authorization: `Bearer ${useCookie('token').value}` },
      body: { id_cita: citaSeleccionada.value?.id, ...newMsg.value }
    })
    newMsg.value = { remitente: '', destinatario: '', telefono: '', mensaje: '' }
    await abrirCita(citaSeleccionada.value)
  } catch (e) { alert(e.data?.message || 'Error') }
}

function abrirWA(tel) {
  window.open(`https://wa.me/${tel.replace(/[^0-9]/g, '')}`, '_blank')
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
      <h1>Gestión de Citas</h1>

      <!-- Filtros -->
      <div class="filters">
        <input v-model="busqueda" placeholder="Buscar paciente o médico..." @keyup.enter="cargarCitas" />
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

      <!-- Lista de citas -->
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

    <!-- Modal detalle de cita -->
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

          <!-- Acciones -->
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

          <!-- Nota -->
          <div class="nota-section">
            <h3>Agregar Nota</h3>
            <div class="nota-input">
              <input v-model="notaText" placeholder="Escribe una nota..." @keyup.enter="agregarNota" />
              <button @click="agregarNota" class="btn-secondary">Guardar</button>
            </div>
          </div>

          <!-- Bitácora -->
          <div class="bitacora-section">
            <h3>Bitácora de Cambios</h3>
            <div v-for="b in bitacora" :key="b.id" class="bitacora-entry">
              <span class="bit-time">{{ new Date(b.created_at).toLocaleString('es-MX') }}</span>
              <span class="bit-user">{{ b.tipo_usuario }}{{ b.asistente_nombre ? ` (${b.asistente_nombre})` : '' }}</span>
              <span class="bit-action">{{ b.accion }}</span>
              <span v-if="b.estado_anterior" class="bit-from">{{ b.estado_anterior }} →</span>
              <span v-if="b.estado_nuevo" class="bit-to">{{ b.estado_nuevo }}</span>
              <p v-if="b.descripcion" class="bit-desc">{{ b.descripcion }}</p>
            </div>
          </div>

          <!-- WhatsApp log -->
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
h1 { font-size: 1.5rem; color: #2d3436; margin-bottom: 1rem; }

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
.modal { background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-body { padding: 1.5rem; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.link-wa { color: #25d366; margin-left: 0.5rem; cursor: pointer; font-size: 0.85rem; text-decoration: underline; }

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

.btn-primary { background: #0984e3; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-secondary { background: white; color: #0984e3; border: 1px solid #0984e3; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.loading, .empty { text-align: center; padding: 2rem; color: #636e72; }
</style>
