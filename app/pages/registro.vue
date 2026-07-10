<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const tipo = ref<'paciente' | 'medico'>('paciente')
const paquetes = ref<any[]>([])
const paqueteSeleccionado = ref<string>('')

const formPaciente = ref({ nombre: '', apellido: '', email: '', password: '', telefono: '', genero: '', fecha_nacimiento: '', direccion: '', id_paquete: '' })
const formMedico = ref({ nombre: '', apellido: '', email: '', password: '', telefono: '', cedula_profesional: '', id_especialidad: '', consultorio_direccion: '', consultorio_ciudad: '', consultorio_estado: '', bio: '', titulo: 'Dr.' })

const especialidades = ref<any[]>([])

async function cargarDatos() {
  try {
    const [esp, paq] = await Promise.all([
      $fetch('/api/especialidades'),
      $fetch('/api/paquetes')
    ])
    especialidades.value = esp.especialidades || []
    paquetes.value = paq.paquetes || []
    const basico = paquetes.value.find(p => p.slug === 'basico')
    if (basico) {
      paqueteSeleccionado.value = basico.id
      formPaciente.value.id_paquete = basico.id
    }
  } catch (e) {
    console.error('Error cargando datos:', e)
  }
}

onMounted(cargarDatos)

function seleccionarPaquete(id: string) {
  paqueteSeleccionado.value = id
  formPaciente.value.id_paquete = id
}

async function handleSubmit() {
  error.value = ''
  if (tipo.value === 'paciente') {
    if (!formPaciente.value.nombre || !formPaciente.value.apellido || !formPaciente.value.email || !formPaciente.value.password || !formPaciente.value.id_paquete) {
      error.value = 'Completa todos los campos y selecciona un plan'
      return
    }
  } else {
    if (!formMedico.value.nombre || !formMedico.value.apellido || !formMedico.value.email || !formMedico.value.password || !formMedico.value.id_especialidad) {
      error.value = 'Completa todos los campos requeridos'
      return
    }
  }
  loading.value = true
  try {
    const endpoint = tipo.value === 'paciente' ? '/api/auth/registro-paciente' : '/api/auth/registro-medico'
    const body = tipo.value === 'paciente' ? formPaciente.value : formMedico.value
    const { data, error: err } = await useFetch(endpoint, { method: 'POST', body })
    if (err.value) throw new Error(err.value.message || 'Error al registrarse')

    const tokenCookie = useCookie('token')
    const usuarioCookie = useCookie('usuario')
    tokenCookie.value = (data.value as any).token
    usuarioCookie.value = (data.value as any).usuario

    // Login automático
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: tipo.value === 'paciente' ? formPaciente.value.email : formMedico.value.email, password: tipo.value === 'paciente' ? formPaciente.value.password : formMedico.value.password }
    })

    const doctor = route.query.doctor as string | undefined
    if (doctor && tipo.value === 'paciente') {
      router.push({ path: '/agendar-cita', query: { doctor } })
    } else {
      router.push('/dashboard/paciente')
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>
        <h1>Crear tu Cuenta</h1>
        <p>Únete a MediProtect gratis</p>
      </div>
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="tipo-selector">
          <button type="button" :class="['tipo-btn', { active: tipo === 'paciente' }]" @click="tipo = 'paciente'">Soy Paciente</button>
          <button type="button" :class="['tipo-btn', { active: tipo === 'medico' }]" @click="tipo = 'medico'">Soy Médico</button>
        </div>

        <template v-if="tipo === 'paciente'">
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input v-model="formPaciente.nombre" type="text" placeholder="Juan" required /></div>
            <div class="form-group"><label>Apellido</label><input v-model="formPaciente.apellido" type="text" placeholder="Pérez" required /></div>
          </div>
          <div class="form-group"><label>Correo electrónico</label><input v-model="formPaciente.email" type="email" placeholder="correo@ejemplo.com" required /></div>
          <div class="form-group"><label>Contraseña</label><input v-model="formPaciente.password" type="password" placeholder="Mínimo 6 caracteres" required /></div>

          <!-- Selección de Plan -->
          <div class="form-group">
            <label>Selecciona tu Plan <span class="required">*</span></label>
            <p class="plan-hint">Elige el plan que mejor se adapte a tus necesidades</p>
            <div class="planes-grid">
              <div v-for="p in paquetes" :key="p.id" class="plan-card" :class="{ selected: paqueteSeleccionado === p.id }" @click="seleccionarPaquete(p.id)">
                <div class="plan-header">
                  <span class="plan-nombre">{{ p.nombre }}</span>
                  <span class="plan-precio">{{ p.precio > 0 ? '$' + p.precio.toLocaleString() + '/mes' : 'Gratis' }}</span>
                </div>
                <ul class="plan-beneficios">
                  <li v-for="b in p.beneficios" :key="b.beneficio">{{ b.beneficio }}</li>
                </ul>
                <div class="plan-check" v-if="paqueteSeleccionado === p.id">✓ Seleccionado</div>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input v-model="formPaciente.telefono" type="tel" placeholder="2221234567" /></div>
            <div class="form-group"><label>Fecha de Nacimiento</label><input v-model="formPaciente.fecha_nacimiento" type="date" /></div>
          </div>
          <div class="form-group">
            <label>Género</label>
            <select v-model="formPaciente.genero">
              <option value="">Seleccionar...</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </template>

        <template v-else>
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input v-model="formMedico.nombre" type="text" placeholder="Dr. Juan" required /></div>
            <div class="form-group"><label>Apellido</label><input v-model="formMedico.apellido" type="text" placeholder="Pérez" required /></div>
          </div>
          <div class="form-group"><label>Correo electrónico</label><input v-model="formMedico.email" type="email" placeholder="correo@ejemplo.com" required /></div>
          <div class="form-group"><label>Contraseña</label><input v-model="formMedico.password" type="password" placeholder="Mínimo 6 caracteres" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input v-model="formMedico.telefono" type="tel" placeholder="2221234567" /></div>
            <div class="form-group"><label>Cédula Profesional</label><input v-model="formMedico.cedula_profesional" type="text" placeholder="12345678" /></div>
          </div>
          <div class="form-group">
            <label>Especialidad</label>
            <select v-model="formMedico.id_especialidad">
              <option value="">Seleccionar especialidad...</option>
              <option v-for="esp in especialidades" :key="esp.id" :value="esp.id">{{ esp.nombre }}</option>
            </select>
          </div>
          <div class="form-group"><label>Dirección del Consultorio</label><input v-model="formMedico.consultorio_direccion" type="text" placeholder="Calle, número, colonia" /></div>
          <div class="form-row">
            <div class="form-group"><label>Ciudad</label><input v-model="formMedico.consultorio_ciudad" type="text" placeholder="Puebla" /></div>
            <div class="form-group"><label>Estado</label><input v-model="formMedico.consultorio_estado" type="text" placeholder="Puebla" /></div>
          </div>
          <div class="form-group"><label>Sobre ti</label><textarea v-model="formMedico.bio" placeholder="Breve descripción profesional..." rows="3"></textarea></div>
        </template>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Registrando...' : 'Crear Cuenta Gratis' }}</button>
        <p class="auth-footer">¿Ya tienes cuenta? <NuxtLink to="/login">Inicia sesión</NuxtLink></p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.planes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 0.8rem;
}
.plan-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
  position: relative;
}
.plan-card:hover {
  border-color: #0984e3;
  box-shadow: 0 4px 12px rgba(9,132,227,0.1);
}
.plan-card.selected {
  border-color: #00b894;
  background: #f0fff4;
  box-shadow: 0 4px 12px rgba(0,184,148,0.15);
}
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.8rem;
}
.plan-nombre {
  font-weight: 700;
  font-size: 1.1rem;
  color: #2d3436;
}
.plan-precio {
  font-size: 1rem;
  color: #636e72;
  font-weight: 500;
}
.plan-beneficios {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
}
.beneficio-tag {
  background: #e8f4fd;
  color: #0984e3;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}
.plan-detalle a {
  color: #0984e3;
  font-size: 0.85rem;
  text-decoration: none;
}
.plan-detalle a:hover {
  text-decoration: underline;
}
.check-mark {
  position: absolute;
  bottom: 0.8rem;
  right: 0.8rem;
  color: #00b894;
  font-weight: 700;
  font-size: 0.9rem;
}
.plan-hint {
  font-size: 0.8rem;
  color: #636e72;
  margin: 0 0 0.5rem 0;
}
.required {
  color: #d63031;
}
</style>
