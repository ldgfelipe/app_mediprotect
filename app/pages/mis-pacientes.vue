<script setup>
definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')

const pacientes = ref([])
const loading = ref(true)
const error = ref('')

const totalPacientes = computed(() => pacientes.value.length)
const totalCitas = computed(() => pacientes.value.reduce((acc, p) => acc + (Number(p.total_citas) || 0), 0))
const totalAsistidas = computed(() => pacientes.value.reduce((acc, p) => acc + (Number(p.citas_asistidas) || 0), 0))

const estadisticas = computed(() => [
  { label: 'Pacientes', valor: totalPacientes.value },
  { label: 'Citas totales', valor: totalCitas.value },
  { label: 'Citas atendidas', valor: totalAsistidas.value },
])

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/citas/mis-pacientes', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    pacientes.value = (data.value && data.value.pacientes) || []
  } catch (e) {
    error.value = e.message || 'Error al cargar tus pacientes'
  } finally {
    loading.value = false
  }
})

function iniciales(nombre, apellido) {
  return `${(nombre || '?').charAt(0)}${(apellido || '?').charAt(0)}`.toUpperCase()
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function cerrarSesion() {
  token.value = null
  usuario.value = null
  navigateTo('/')
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="dashboard-header-inner">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo-sm" /></NuxtLink>
        <nav>
          <NuxtLink to="/dashboard/medico">Inicio</NuxtLink>
          <NuxtLink to="/mi-agenda">Mi Agenda</NuxtLink>
          <NuxtLink to="/mis-pacientes" class="router-link-active">Mis Pacientes</NuxtLink>
          <NuxtLink to="/mis-comisiones">Comisiones</NuxtLink>
        </nav>
        <div class="user-info">
          <NotificationBell />
          <span>Dr. {{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <h1>Mis Pacientes</h1>
      <p class="subtitle">Pacientes que han agendado una cita contigo</p>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="stats-grid">
        <div v-for="est in estadisticas" :key="est.label" class="stat-card">
          <p class="stat-label">{{ est.label }}</p>
          <p class="stat-value">{{ est.valor }}</p>
        </div>
      </div>

      <div v-if="loading" class="loading">Cargando tus pacientes...</div>

      <div v-else-if="pacientes.length === 0" class="empty">
        <p>Aún no tienes pacientes registrados.</p>
        <p class="empty-hint">Cuando un paciente agende una cita contigo aparecerá aquí.</p>
      </div>

      <div v-else class="pacientes-grid">
        <div v-for="p in pacientes" :key="p.id" class="paciente-card">
          <div class="paciente-top">
            <div class="avatar">{{ iniciales(p.nombre, p.apellido) }}</div>
            <div class="paciente-nombre">
              <strong>{{ p.nombre }} {{ p.apellido }}</strong>
              <span v-if="p.telefono" class="contacto">Tel: {{ p.telefono }}</span>
              <span v-if="p.email" class="contacto">{{ p.email }}</span>
            </div>
          </div>
          <div class="paciente-datos">
            <div class="dato">
              <span class="dato-label">Citas</span>
              <span class="dato-valor">{{ p.total_citas }}</span>
            </div>
            <div class="dato">
              <span class="dato-label">Atendidas</span>
              <span class="dato-valor green">{{ p.citas_asistidas }}</span>
            </div>
            <div class="dato">
              <span class="dato-label">Pendientes</span>
              <span class="dato-valor yellow">{{ p.citas_pendientes }}</span>
            </div>
          </div>
          <div class="ultima-cita">
            <span>Última cita</span>
            <strong>{{ formatearFecha(p.ultima_cita) }}</strong>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; color: #636e72; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; padding: 1rem 1.25rem; }
.stat-label { margin: 0 0 0.25rem; font-size: 0.8rem; color: #636e72; }
.stat-value { margin: 0; font-size: 1.6rem; font-weight: 700; color: #2d3436; }

.loading, .empty { text-align: center; padding: 3rem; color: #636e72; }
.empty-hint { margin-top: 0.5rem; font-size: 0.85rem; color: #b2bec3; }

.pacientes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
.paciente-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.paciente-top { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 46px; height: 46px; border-radius: 50%; background: #2d3436; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
.paciente-nombre { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.paciente-nombre strong { font-size: 1rem; }
.contacto { font-size: 0.8rem; color: #636e72; }
.paciente-datos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.dato { background: #f8f9fa; border-radius: 8px; padding: 0.5rem; text-align: center; }
.dato-label { display: block; font-size: 0.72rem; color: #636e72; margin-bottom: 0.15rem; }
.dato-valor { font-size: 1.1rem; font-weight: 700; color: #2d3436; }
.dato-valor.green { color: #00b894; }
.dato-valor.yellow { color: #f39c12; }
.ultima-cita { border-top: 1px solid #f0f0f0; padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
.ultima-cita span { color: #636e72; }
.ultima-cita strong { color: #2d3436; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
