<script setup lang="ts">
import { useSocket } from '~/composables/useSocket'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')
const citas = ref<any[]>([])
const disponibilidad = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const actionLoading = ref<string | null>(null)
const mostrarDisponibilidad = ref(false)
const nuevoSlot = ref({ dia_semana: 1, hora_inicio: '09:00', hora_fin: '17:00' })

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const estados: Record<string, string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', reagendada: 'Reagendada',
  cancelada: 'Cancelada', asistida: 'Asistida', no_asistida: 'No Asistida',
}

const colores: Record<string, string> = {
  pendiente: '#f39c12', confirmada: '#00b894', reagendada: '#0984e3',
  cancelada: '#d63031', asistida: '#2d3436', no_asistida: '#636e72',
}

async function cargarDatos() {
  loading.value = true
  try {
    const [agenda, disp] = await Promise.all([
      useFetch('/api/citas/mi-agenda', { headers: { Authorization: `Bearer ${token.value}` } }),
      useFetch(`/api/disponibilidad/${usuario.value?.id}`, { headers: { Authorization: `Bearer ${token.value}` } }),
    ])
    citas.value = (agenda.data.value as any)?.citas || []
    disponibilidad.value = (disp.data.value as any)?.disponibilidad || []
  } catch (e: any) {
    error.value = e.message || 'Error al cargar datos'
  } finally {
    loading.value = false
  }
}

const { on } = useSocket()
const { agregar } = useNotifications()

onMounted(() => {
  cargarDatos()

  on('cita:created', (cita) => {
    cargarDatos()
    agregar({ tipo: 'cita_created', titulo: 'Nueva cita', mensaje: `Nueva cita: ${cita.paciente_nombre || 'Paciente'}`, timestamp: new Date() })
  })
  on('cita:confirmed', (cita) => {
    cargarDatos()
    agregar({ tipo: 'cita_confirmed', titulo: 'Cita confirmada', mensaje: `Cita confirmada: ${cita.paciente_nombre || 'Paciente'}`, timestamp: new Date() })
  })
  on('cita:cancelled', (cita) => {
    cargarDatos()
    agregar({ tipo: 'cita_cancelled', titulo: 'Cita cancelada', mensaje: `Cita cancelada: ${cita.paciente_nombre || 'Paciente'}`, timestamp: new Date() })
  })
  on('cita:updated', (cita) => {
    cargarDatos()
  })
})

async function confirmar(id: string) {
  actionLoading.value = id
  try {
    await $fetch(`/api/citas/${id}/confirmar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    await cargarDatos()
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al confirmar'
  } finally {
    actionLoading.value = null
  }
}

async function cancelar(id: string) {
  actionLoading.value = id
  try {
    await $fetch(`/api/citas/${id}/cancelar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    await cargarDatos()
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al cancelar'
  } finally {
    actionLoading.value = null
  }
}

async function finalizar(id: string, resultado: string) {
  actionLoading.value = id
  try {
    await $fetch(`/api/citas/${id}/finalizar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { resultado },
    })
    await cargarDatos()
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al finalizar'
  } finally {
    actionLoading.value = null
  }
}

async function agregarSlot() {
  try {
    await useFetch('/api/disponibilidad', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: nuevoSlot.value,
    })
    nuevoSlot.value = { dia_semana: 1, hora_inicio: '09:00', hora_fin: '17:00' }
    await cargarDatos()
  } catch (e: any) {
    error.value = e.message || 'Error al agregar disponibilidad'
  }
}

async function eliminarSlot(id: number) {
  try {
    await useFetch(`/api/disponibilidad/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    await cargarDatos()
  } catch (e: any) {
    error.value = e.message || 'Error al eliminar disponibilidad'
  }
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
          <NuxtLink to="/mi-agenda" class="router-link-active">Mi Agenda</NuxtLink>
          <NuxtLink to="/mis-pacientes">Mis Pacientes</NuxtLink>
          <NuxtLink to="/mis-comisiones">Comisiones</NuxtLink>
        </nav>
        <div class="user-info">
          <span>Dr. {{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <h1>Mi Agenda</h1>
      <p class="subtitle">Gestiona tus citas y disponibilidad</p>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="agenda-actions" style="margin-bottom:1.5rem">
        <button @click="mostrarDisponibilidad = !mostrarDisponibilidad" class="btn-outline">
          {{ mostrarDisponibilidad ? 'Ocultar Disponibilidad' : 'Gestionar Disponibilidad' }}
        </button>
      </div>

      <div v-if="mostrarDisponibilidad" class="disponibilidad-section" style="margin-bottom:2rem;border:1px solid #eaeaea;border-radius:12px;padding:1.5rem">
        <h3 style="margin-bottom:1rem">Horarios de Disponibilidad</h3>
        <div v-if="disponibilidad.length === 0" style="color:#636e72;margin-bottom:1rem;font-size:0.9rem">
          No has configurado horarios de disponibilidad.
        </div>
        <div v-for="d in disponibilidad" :key="d.dia" class="slot-item" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;font-size:0.9rem">
          <strong style="min-width:100px">{{ d.dia }}:</strong>
          <span v-for="s in d.slots" :key="s.id" style="background:#f5f5f5;padding:0.2rem 0.6rem;border-radius:4px">
            {{ s.inicio }} - {{ s.fin }}
            <button @click="eliminarSlot(s.id)" style="background:none;border:none;color:#d63031;cursor:pointer;margin-left:4px" title="Eliminar">&times;</button>
          </span>
        </div>
        <div class="add-slot" style="display:flex;gap:0.5rem;align-items:end;margin-top:1rem;flex-wrap:wrap">
          <div class="form-group" style="flex:1;min-width:120px">
            <label style="font-size:0.8rem">Día</label>
            <select v-model="nuevoSlot.dia_semana" style="padding:0.4rem;border:1.5px solid #e0e0e0;border-radius:6px;font-size:0.85rem">
              <option v-for="(dia, i) in diasSemana" :key="i" :value="i">{{ dia }}</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:100px">
            <label style="font-size:0.8rem">Desde</label>
            <input v-model="nuevoSlot.hora_inicio" type="time" style="padding:0.4rem;border:1.5px solid #e0e0e0;border-radius:6px;font-size:0.85rem" />
          </div>
          <div class="form-group" style="flex:1;min-width:100px">
            <label style="font-size:0.8rem">Hasta</label>
            <input v-model="nuevoSlot.hora_fin" type="time" style="padding:0.4rem;border:1.5px solid #e0e0e0;border-radius:6px;font-size:0.85rem" />
          </div>
          <button @click="agregarSlot" class="btn-primary" style="padding:0.4rem 1rem;font-size:0.85rem">Agregar</button>
        </div>
      </div>

      <div v-if="loading" class="loading">Cargando agenda...</div>

      <div v-else-if="citas.length === 0" class="empty">
        <p>No tienes citas agendadas.</p>
      </div>

      <div v-else class="citas-list">
        <div v-for="cita in citas" :key="cita.id" class="cita-card">
          <div class="cita-header">
            <div>
              <strong>{{ cita.paciente_nombre }} {{ cita.paciente_apellido }}</strong>
              <span v-if="cita.paciente_telefono" style="display:block;font-size:0.85rem;color:#636e72">Tel: {{ cita.paciente_telefono }}</span>
            </div>
            <span class="cita-estado" :style="{ background: colores[cita.estado] || '#636e72' }">
              {{ estados[cita.estado] || cita.estado }}
            </span>
          </div>
          <div class="cita-body">
            <span class="cita-fecha">{{ formatearFecha(cita.fecha_hora) }}</span>
          </div>
          <div v-if="cita.notas_paciente" class="cita-notas">
            <small>Notas del paciente: {{ cita.notas_paciente }}</small>
          </div>
          <div class="cita-actions" style="margin-top:0.7rem;display:flex;gap:0.5rem;flex-wrap:wrap">
            <button v-if="cita.estado === 'pendiente'" @click="confirmar(cita.id)" :disabled="actionLoading === cita.id" class="btn-aceptar">
              {{ actionLoading === cita.id ? '...' : 'Confirmar' }}
            </button>
            <button v-if="cita.estado === 'pendiente'" @click="cancelar(cita.id)" :disabled="actionLoading === cita.id" class="btn-cancelar">
              {{ actionLoading === cita.id ? '...' : 'Cancelar' }}
            </button>
            <button v-if="cita.estado === 'confirmada'" @click="finalizar(cita.id, 'asistida')" :disabled="actionLoading === cita.id" class="btn-aceptar">
              {{ actionLoading === cita.id ? '...' : 'Asistió' }}
            </button>
            <button v-if="cita.estado === 'confirmada'" @click="finalizar(cita.id, 'no_asistida')" :disabled="actionLoading === cita.id" class="btn-cancelar">
              {{ actionLoading === cita.id ? '...' : 'No Asistió' }}
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
.loading, .empty { text-align: center; padding: 3rem; color: #636e72; }
.citas-list { display: flex; flex-direction: column; gap: 1rem; }
.cita-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; padding: 1.2rem 1.5rem; }
.cita-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
.cita-estado { color: white; padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
.cita-fecha { color: #2d3436; font-size: 0.95rem; }
.cita-notas { color: #636e72; margin: 0.3rem 0; font-size: 0.85rem; }
.btn-aceptar { background: #00b894; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.btn-aceptar:hover { background: #00a381; }
.btn-cancelar { background: none; border: 1px solid #d63031; color: #d63031; padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.btn-cancelar:hover { background: #d63031; color: white; }
.btn-aceptar:disabled, .btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
