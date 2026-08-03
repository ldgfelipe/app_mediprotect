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
const pacienteSeleccionado = ref(null)
const medicoSeleccionado = ref(null)
const pacientesSearch = ref([])
const medicosSearch = ref([])
const buscandoMedico = ref(false)

const nuevaCita = ref({
  wa_text: '', paciente_search: '', medico_search: '', fecha: '', hora: '', notas: ''
})

const medicoBusqueda = ref('')
const medicoResults = ref([])
const medicoSeleccionadoPerfil = ref(null)
const buscandoPerfilMedico = ref(false)

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/admin/citas', { headers: { Authorization: 'Bearer ' + adminToken.value } })
    citas.value = data?.citas || []
  } catch (e) { console.error(e) }
  loading.value = false
})

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

async function crearCita() {
  errorCita.value = ''
  if (!pacienteSeleccionado.value) { errorCita.value = 'Selecciona un paciente'; pasoActual.value = 1; return }
  if (!nuevaCita.value.medico_search.trim()) { errorCita.value = 'Escribe el nombre del médico'; return }
  if (!nuevaCita.value.fecha || !nuevaCita.value.hora) { errorCita.value = 'Selecciona fecha y hora'; return }
  creandoCita.value = true
  try {
    const fecha_hora = nuevaCita.value.fecha + 'T' + nuevaCita.value.hora + ':00'
    const body: any = {
      id_paciente: (pacienteSeleccionado.value as any).id,
      medico_nombre: nuevaCita.value.medico_search.trim(),
      fecha_hora,
      notas_asistente: nuevaCita.value.notas
    }
    if (medicoSeleccionado.value) body.id_medico = (medicoSeleccionado.value as any).id
    await $fetch('/api/asistente/citas', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body })
    showNuevaCita.value = false
    const data: any = await $fetch('/api/admin/citas', { headers: { Authorization: 'Bearer ' + adminToken.value } })
    citas.value = data?.citas || []
  } catch (e: any) { errorCita.value = e.data?.message || 'Error al crear cita' }
  creandoCita.value = false
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
          <input v-model="search" placeholder="Buscar por paciente o medico..." @input="() => {}" />
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

        <CalendarioCitas v-if="vistaCitas === 'calendar' && !loading" :citas="filtered" />

        <div v-if="vistaCitas === 'list' && !loading" class="table-container">
          <table>
            <thead><tr><th>Paciente</th><th>Medico</th><th>Fecha y Hora</th><th>Estado</th></tr></thead>
            <tbody>
              <tr v-for="c in filtered" :key="c.id">
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
            <div class="form-group"><label>Buscar paciente</label><input v-model="nuevaCita.paciente_search" placeholder="Nombre o email..." @input="buscarPacientesAdmin" />
              <div v-if="pacientesSearch.length > 0 && !pacienteSeleccionado" class="search-results">
                <div v-for="p in pacientesSearch" :key="p.id" class="search-item" @click="seleccionarPaciente(p)"><strong>{{ p.nombre }} {{ p.apellido }}</strong><span>{{ p.email }}</span></div>
              </div>
            </div>
            <div v-if="pacienteSeleccionado" class="selected-card"><span class="check">✓</span><strong>{{ (pacienteSeleccionado as any).nombre }} {{ (pacienteSeleccionado as any).apellido }}</strong></div>
            <button @click="pasoActual = 2" class="btn-primary" :disabled="!pacienteSeleccionado">Siguiente</button>
          </div>

          <div v-if="pasoActual === 2">
            <div class="form-group"><label>Nombre del medico</label><input v-model="nuevaCita.medico_search" placeholder="Ej. Carlos Ramirez" @input="buscarMedico" /></div>
            <div v-if="medicosSearch.length > 0 && !medicoSeleccionado" class="results-list">
              <div v-for="m in medicosSearch" :key="m.id" class="result-card" @click="seleccionarMedico(m)">
                <div class="result-info"><strong>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</strong><span>{{ m.especialidad_nombre || '' }}</span></div>
              </div>
            </div>
            <div v-if="medicoSeleccionado" class="selected-card"><span class="check">✓</span><strong>{{ (medicoSeleccionado as any).nombre }} {{ (medicoSeleccionado as any).apellido }}</strong></div>
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
.filters { display: flex; gap: 0.8rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
.filters input { flex: 1; min-width: 200px; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
.filters select { padding: 0.6rem; border: 1px solid #e0e0e0; border-radius: 8px; }
.count { font-size: 0.85rem; color: #636e72; }
.loading { text-align: center; padding: 2rem; color: #636e72; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
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
.modal { background: white; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.15rem; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-body { padding: 1.5rem; }
.form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; position: relative; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group textarea { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.form-group input:focus { outline: none; border-color: #00b894; }
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
</style>
