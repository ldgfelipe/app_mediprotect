<script setup lang="ts">
const route = useRoute()
const token = useCookie('token')
const usuario = useCookie('usuario')

const medico = ref<any>(null)
const disponibilidad = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const booking = ref({ fecha: '', hora: '', notas: '' })
const bookingLoading = ref(false)
const bookingError = ref('')
const bookingSuccess = ref('')

const estaAutenticado = computed(() => !!token.value)
const esPaciente = computed(() => usuario.value?.tipo === 'paciente')

onMounted(async () => {
  try {
    const id = route.params.id
    const [medRes, dispRes] = await Promise.all([
      useFetch(`/api/medicos/${id}`),
      useFetch(`/api/disponibilidad/${id}`),
    ])
    medico.value = (medRes.data.value as any)?.medico
    disponibilidad.value = (dispRes.data.value as any)?.disponibilidad || []
    if (!medico.value) throw new Error('Médico no encontrado')
  } catch (e: any) {
    error.value = e.message || 'Error al cargar datos'
  } finally {
    loading.value = false
  }
})

function obtenerFechaMinima() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function obtenerDiaSemana(fechaStr: string) {
  return new Date(fechaStr + 'T12:00:00').getDay()
}

function disponibleElDia(fechaStr: string) {
  const dia = obtenerDiaSemana(fechaStr)
  return disponibilidad.value.some(d => {
    const idx = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].indexOf(d.dia)
    return idx === dia
  })
}

function slotsDelDia(fechaStr: string) {
  const dia = obtenerDiaSemana(fechaStr)
  const d = disponibilidad.value.find(d => {
    const idx = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].indexOf(d.dia)
    return idx === dia
  })
  return d?.slots || []
}

async function agendar() {
  bookingError.value = ''
  bookingSuccess.value = ''
  bookingLoading.value = true
  try {
    if (!booking.value.fecha || !booking.value.hora) {
      throw new Error('Selecciona fecha y hora')
    }
    const fecha_hora = `${booking.value.fecha}T${booking.value.hora}:00`
    await useFetch('/api/citas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { id_medico: route.params.id, fecha_hora, notas_paciente: booking.value.notas || undefined },
    })
    bookingSuccess.value = 'Cita agendada exitosamente'
    booking.value = { fecha: '', hora: '', notas: '' }
  } catch (e: any) {
    bookingError.value = e.message || 'Error al agendar cita'
  } finally {
    bookingLoading.value = false
  }
}
</script>

<template>
  <div class="detalle-page">
    <header class="detalle-header">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo-sm" /></NuxtLink>
      <nav>
        <NuxtLink to="/medicos">&larr; Volver a Médicos</NuxtLink>
      </nav>
    </header>
    <main class="detalle-content">
      <div v-if="loading" class="loading">Cargando información del médico...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>
      <div v-else-if="medico" class="medico-grid">
        <div class="medico-info">
          <div class="medico-avatar">
            <div v-if="!medico.foto_url" class="avatar-placeholder">{{ medico.nombre[0] }}{{ medico.apellido[0] }}</div>
            <img v-else :src="medico.foto_url" :alt="medico.nombre" class="avatar-img" />
          </div>
          <h1>{{ medico.nombre }} {{ medico.apellido }}</h1>
          <span class="medico-especialidad">{{ medico.especialidad }}</span>
          <div class="medico-score">
            <span class="stars">&#9733;</span> {{ medico.score_confianza }}
          </div>
          <p v-if="medico.bio" class="medico-bio">{{ medico.bio }}</p>
          <div class="medico-detalles">
            <div v-if="medico.cedula_profesional" class="detalle-item">
              <strong>Cédula:</strong> {{ medico.cedula_profesional }}
            </div>
            <div v-if="medico.consultorio_direccion" class="detalle-item">
              <strong>Dirección:</strong> {{ medico.consultorio_direccion }}
            </div>
            <div v-if="medico.consultorio_ciudad || medico.consultorio_estado" class="detalle-item">
              <strong>Ubicación:</strong> {{ [medico.consultorio_ciudad, medico.consultorio_estado].filter(Boolean).join(', ') }}
            </div>
            <div v-if="medico.telefono" class="detalle-item">
              <strong>Teléfono:</strong> {{ medico.telefono }}
            </div>
          </div>
          <div v-if="disponibilidad.length > 0" class="disponibilidad">
            <h3>Horarios de Atención</h3>
            <div v-for="d in disponibilidad" :key="d.dia" class="disp-item">
              <strong>{{ d.dia }}:</strong>
              <span v-for="s in d.slots" :key="s.id" class="slot-chip">{{ s.inicio }} - {{ s.fin }}</span>
            </div>
          </div>
        </div>
        <div v-if="esPaciente" class="booking-section">
          <h2>Agendar Cita</h2>
          <div v-if="bookingSuccess" class="success-msg">{{ bookingSuccess }}</div>
          <div v-if="bookingError" class="error-msg">{{ bookingError }}</div>
          <form @submit.prevent="agendar" class="booking-form">
            <div class="form-group">
              <label>Fecha</label>
              <input v-model="booking.fecha" type="date" :min="obtenerFechaMinima()" required />
            </div>
            <div v-if="booking.fecha" class="form-group">
              <label>Hora</label>
              <select v-model="booking.hora" required>
                <option value="">Seleccionar horario</option>
                <option v-if="!disponibleElDia(booking.fecha)" value="" disabled>
                  No hay disponibilidad en esta fecha
                </option>
                <template v-else>
                  <option v-for="s in slotsDelDia(booking.fecha)" :key="s.id" :value="s.inicio">
                    {{ s.inicio }} - {{ s.fin }}
                  </option>
                </template>
              </select>
              <small v-if="!disponibleElDia(booking.fecha) && booking.fecha" style="color:#d63031;font-size:0.8rem">
                El médico no atiende este día. Elige otra fecha.
              </small>
            </div>
            <div class="form-group">
              <label>Notas (opcional)</label>
              <textarea v-model="booking.notas" rows="2" placeholder="Describe el motivo de tu consulta..."></textarea>
            </div>
            <button type="submit" class="btn-primary" :disabled="bookingLoading || !booking.fecha || !booking.hora">
              {{ bookingLoading ? 'Agendando...' : 'Agendar Cita' }}
            </button>
            <p v-if="!estaAutenticado" class="auth-warning">
              <NuxtLink to="/login">Inicia sesión</NuxtLink> como paciente para agendar una cita.
            </p>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.detalle-page { min-height: 100vh; background: #ffffff; }
.detalle-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 2rem; border-bottom: 1px solid #eaeaea; }
.detalle-header nav { flex: 1; }
.detalle-content { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
.loading { text-align: center; padding: 3rem; color: #636e72; }
.medico-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
@media (max-width: 768px) { .medico-grid { grid-template-columns: 1fr; } }
.medico-info { }
.medico-avatar { margin-bottom: 1rem; }
.avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background: #2d3436; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; }
.avatar-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
.medico-info h1 { font-size: 1.5rem; margin-bottom: 0.3rem; }
.medico-especialidad { display: inline-block; background: #f5f5f5; padding: 0.25rem 0.8rem; border-radius: 20px; font-size: 0.85rem; color: #2d3436; margin-bottom: 0.5rem; }
.medico-score { color: #f39c12; font-size: 0.9rem; margin-bottom: 0.8rem; }
.stars { color: #f39c12; }
.medico-bio { color: #636e72; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.2rem; }
.medico-detalles { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.2rem; }
.detalle-item { font-size: 0.9rem; color: #2d3436; }
.detalle-item strong { font-weight: 600; }
.disponibilidad { border-top: 1px solid #eaeaea; padding-top: 1rem; }
.disponibilidad h3 { font-size: 1rem; margin-bottom: 0.8rem; }
.disp-item { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.9rem; }
.slot-chip { background: #f5f5f5; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
.booking-section { background: #fafafa; border: 1px solid #eaeaea; border-radius: 12px; padding: 1.5rem; }
.booking-section h2 { font-size: 1.2rem; margin-bottom: 1rem; }
.booking-form { display: flex; flex-direction: column; gap: 1rem; }
.success-msg { color: #00b894; background: #e6fcf5; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; border: 1px solid #b2dfdb; }
.auth-warning { text-align: center; font-size: 0.85rem; color: #636e72; }
.auth-warning a { color: #00b894; font-weight: 600; }
</style>
