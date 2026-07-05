<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')
const citas = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const cancelando = ref<string | null>(null)

const estados: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada',
  asistida: 'Asistida',
  no_asistida: 'No Asistida',
}

const colores: Record<string, string> = {
  pendiente: '#f39c12',
  confirmada: '#00b894',
  reagendada: '#0984e3',
  cancelada: '#d63031',
  asistida: '#00b894',
  no_asistida: '#636e72',
}

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/citas/mis-citas', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    citas.value = (data.value as any)?.citas || []
  } catch (e: any) {
    error.value = e.message || 'Error al cargar citas'
  } finally {
    loading.value = false
  }
})

async function cancelar(id: string) {
  cancelando.value = id
  try {
    await useFetch(`/api/citas/${id}/cancelar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    const cita = citas.value.find(c => c.id === id)
    if (cita) cita.estado = 'cancelada'
  } catch (e: any) {
    error.value = e.message || 'Error al cancelar'
  } finally {
    cancelando.value = null
  }
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function puedeCancelar(estado: string) {
  return ['pendiente', 'confirmada', 'reagendada'].includes(estado)
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
          <NuxtLink to="/dashboard/paciente">Inicio</NuxtLink>
          <a href="https://www.mediprotect.com.mx/red-medica" target="_blank">Buscar Médicos</a>
          <NuxtLink to="/mis-citas" class="router-link-active">Mis Citas</NuxtLink>
        </nav>
        <div class="user-info">
          <span>{{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <h1>Mis Citas</h1>
      <p class="subtitle">Todas tus citas agendadas en MediProtect</p>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div v-if="loading" class="loading">Cargando citas...</div>

      <div v-else-if="citas.length === 0" class="empty">
        <p>No tienes citas agendadas.</p>
        <a href="https://www.mediprotect.com.mx/red-medica" target="_blank" class="btn-primary" style="display:inline-block;margin-top:1rem">Buscar Médicos</a>
      </div>

      <div v-else class="citas-list">
        <div v-for="cita in citas" :key="cita.id" class="cita-card">
          <div class="cita-header">
            <div class="cita-medico">
              <strong>{{ cita.medico_nombre }} {{ cita.medico_apellido }}</strong>
              <span class="especialidad">{{ cita.especialidad }}</span>
            </div>
            <span class="cita-estado" :style="{ background: colores[cita.estado] || '#636e72' }">
              {{ estados[cita.estado] || cita.estado }}
            </span>
          </div>
          <div class="cita-body">
            <span class="cita-fecha">{{ formatearFecha(cita.fecha_hora) }}</span>
          </div>
          <div v-if="cita.notas_paciente" class="cita-notas">
            <small>Notas: {{ cita.notas_paciente }}</small>
          </div>
          <div v-if="puedeCancelar(cita.estado)" class="cita-actions">
            <button @click="cancelar(cita.id)" :disabled="cancelando === cita.id" class="btn-cancelar">
              {{ cancelando === cita.id ? 'Cancelando...' : 'Cancelar Cita' }}
            </button>
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
.loading { text-align: center; padding: 3rem; color: #636e72; }
.empty { text-align: center; padding: 3rem; color: #636e72; }
.citas-list { display: flex; flex-direction: column; gap: 1rem; }
.cita-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; padding: 1.2rem 1.5rem; }
.cita-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
.cita-medico strong { display: block; font-size: 1.05rem; }
.especialidad { font-size: 0.85rem; color: #636e72; }
.cita-estado { color: white; padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
.cita-body { margin: 0.5rem 0; }
.cita-fecha { color: #2d3436; font-size: 0.95rem; }
.cita-notas { color: #636e72; margin: 0.3rem 0; }
.cita-actions { margin-top: 0.7rem; }
.btn-cancelar { background: none; border: 1px solid #d63031; color: #d63031; padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.btn-cancelar:hover { background: #d63031; color: white; }
.btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
