<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const tipo = ref<'paciente' | 'medico'>('paciente')
const paquetes = ref<any[]>([])
const paqueteSeleccionado = ref('')
const paso = ref<'datos' | 'plan'>('datos')

const formPaciente = ref({
  nombre: '', apellido: '', email: '', password: '', telefono: '',
  fecha_nacimiento: '', genero: '', ciudad: '', como_nos_conociste: '',
  acepta_terminos: false, acepta_marketing: false,
  id_paquete: '',
  curp: '', estado_civil: '', ocupacion: '',
  beneficiario_nombre: '', beneficiario_parentesco: '', beneficiario_telefono: '',
  identificacion_tipo: 'INE', identificacion_numero: '', acepta_seguro: false
})

const formMedico = ref({
  nombre: '', apellido: '', email: '', password: '', telefono: '',
  cedula_profesional: '', id_especialidad: '', consultorio_direccion: '',
  consultorio_ciudad: '', consultorio_estado: '', bio: '', titulo: 'Dr.'
})

const especialidades = ref<any[]>([])

const esPlanPago = computed(() => {
  const p = paquetes.value.find((p: any) => p.id === paqueteSeleccionado.value)
  return p && p.precio > 0
})

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

function continuarAlPlan() {
  if (!formPaciente.value.nombre || !formPaciente.value.telefono || !formPaciente.value.email || !formPaciente.value.password || !formPaciente.value.acepta_terminos) {
    error.value = 'Completa nombre, teléfono, correo, contraseña y acepta los Términos'
    return
  }
  error.value = ''
  paso.value = 'plan'
}

async function handleSubmit() {
  error.value = ''
  if (tipo.value === 'medico') {
    if (!formMedico.value.nombre || !formMedico.value.apellido || !formMedico.value.email || !formMedico.value.password || !formMedico.value.id_especialidad) {
      error.value = 'Completa todos los campos requeridos'
      return
    }
  }

  if (tipo.value === 'paciente') {
    if (!formPaciente.value.id_paquete) { error.value = 'Selecciona un plan'; return }
    if (esPlanPago.value && (!formPaciente.value.curp || !formPaciente.value.beneficiario_nombre || !formPaciente.value.acepta_seguro)) {
      error.value = 'Para planes de pago completa CURP, beneficiario y acepta condiciones del seguro'
      return
    }
  }

  loading.value = true
  try {
    const endpoint = tipo.value === 'paciente' ? '/api/auth/registro-paciente' : '/api/auth/registro-medico'
    const body = tipo.value === 'paciente' ? { ...formPaciente.value } : { ...formMedico.value }
    const { data, error: err } = await useFetch(endpoint, { method: 'POST', body })
    if (err.value) throw new Error(err.value.message || 'Error al registrarse')

    const tokenCookie = useCookie('token')
    const usuarioCookie = useCookie('usuario')
    tokenCookie.value = (data.value as any).token
    usuarioCookie.value = (data.value as any).usuario

    const doctor = route.query.doctor as string | undefined
    if (doctor && tipo.value === 'paciente') {
      router.push({ path: '/agendar-cita', query: { doctor } })
    } else {
      router.push(tipo.value === 'medico' ? '/dashboard/medico' : '/dashboard/paciente')
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
        <p>Únete a MediProtect</p>
      </div>

      <!-- Selector Paciente / Médico -->
      <div class="tipo-selector">
        <button type="button" :class="['tipo-btn', { active: tipo === 'paciente' }]" @click="tipo = 'paciente'; paso = 'datos'">Soy Paciente</button>
        <button type="button" :class="['tipo-btn', { active: tipo === 'medico' }]" @click="tipo = 'medico'">Soy Médico</button>
      </div>

      <!-- PASO 1: AFILIACIÓN GRATUITA -->
      <form v-if="tipo === 'paciente' && paso === 'datos'" @submit.prevent="continuarAlPlan" class="auth-form">
        <h2 class="form-section-title">Afiliación Gratuita</h2>

        <div class="form-group">
          <label>Nombre completo *</label>
          <div class="form-row">
            <input v-model="formPaciente.nombre" type="text" placeholder="Nombre(s)" required />
            <input v-model="formPaciente.apellido" type="text" placeholder="Apellido(s)" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Fecha de nacimiento</label><input v-model="formPaciente.fecha_nacimiento" type="date" /></div>
          <div class="form-group"><label>Teléfono / WhatsApp *</label><input v-model="formPaciente.telefono" type="tel" placeholder="2221234567" required /></div>
        </div>

        <div class="form-group"><label>Correo electrónico *</label><input v-model="formPaciente.email" type="email" placeholder="correo@ejemplo.com" required /></div>
        <div class="form-group"><label>Contraseña *</label><input v-model="formPaciente.password" type="password" placeholder="Mínimo 6 caracteres" required /></div>

        <div class="form-group"><label>Ciudad o municipio</label><input v-model="formPaciente.ciudad" type="text" placeholder="Puebla" /></div>

        <div class="form-group">
          <label>¿Cómo nos conociste?</label>
          <select v-model="formPaciente.como_nos_conociste">
            <option value="">Seleccionar...</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="google">Google</option>
            <option value="amigo">Recomendación de amigo</option>
            <option value="medico">Recomendación de médico</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formPaciente.acepta_terminos" />
            <span>Acepto <a href="/terminos" target="_blank">Términos y Condiciones</a> y <a href="/privacidad" target="_blank">Política de Privacidad</a> *</span>
          </label>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formPaciente.acepta_marketing" />
            <span>Autorizo contacto por WhatsApp/correo para información y promociones</span>
          </label>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary full">Continuar: Elegir Plan →</button>
        <p class="auth-footer">¿Ya tienes cuenta? <NuxtLink to="/login">Inicia sesión</NuxtLink></p>
      </form>

      <!-- PASO 2: SELECCIÓN DE PLAN -->
      <form v-if="tipo === 'paciente' && paso === 'plan'" @submit.prevent="handleSubmit" class="auth-form">
        <h2 class="form-section-title">Elige tu Plan</h2>

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

        <!-- Campos adicionales para planes de pago -->
        <div v-if="esPlanPago" class="seguro-section">
          <div class="seguro-banner">
            <p><strong>Seguro por Accidentes Personales</strong></p>
            <p class="seguro-text">Respaldo por <strong>VRIM</strong> en convenio con <strong>Grupo Financiero Inbursa</strong></p>
          </div>

          <h3 class="form-section-subtitle">Datos para la póliza de seguro</h3>

          <div class="form-group"><label>CURP *</label><input v-model="formPaciente.curp" type="text" placeholder="18 caracteres" maxlength="18" required /></div>
          <div class="form-group"><label>Domicilio completo</label><input v-model="formPaciente.direccion" type="text" placeholder="Calle, número, colonia, CP" /></div>

          <div class="form-row">
            <div class="form-group">
              <label>Estado civil</label>
              <select v-model="formPaciente.estado_civil">
                <option value="">Seleccionar...</option>
                <option value="soltero">Soltero(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viudo">Viudo(a)</option>
                <option value="union_libre">Unión libre</option>
              </select>
            </div>
            <div class="form-group"><label>Ocupación</label><input v-model="formPaciente.ocupacion" type="text" placeholder="Ej: Ingeniero" /></div>
          </div>

          <h3 class="form-section-subtitle">Beneficiario</h3>
          <div class="form-group"><label>Nombre completo *</label><input v-model="formPaciente.beneficiario_nombre" type="text" placeholder="Nombre del beneficiario" /></div>
          <div class="form-row">
            <div class="form-group"><label>Parentesco</label><input v-model="formPaciente.beneficiario_parentesco" type="text" placeholder="Ej: Esposo/a" /></div>
            <div class="form-group"><label>Teléfono</label><input v-model="formPaciente.beneficiario_telefono" type="tel" placeholder="2221234567" /></div>
          </div>

          <h3 class="form-section-subtitle">Identificación oficial</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo</label>
              <select v-model="formPaciente.identificacion_tipo">
                <option value="INE">INE</option>
                <option value="pasaporte">Pasaporte</option>
                <option value="licencia">Licencia</option>
              </select>
            </div>
            <div class="form-group"><label>Número</label><input v-model="formPaciente.identificacion_numero" type="text" placeholder="Número de identificación" /></div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formPaciente.acepta_seguro" />
              <span>Acepto las condiciones específicas del seguro por accidentes personales respaldado por VRIM / Grupo Financiero Inbursa *</span>
            </label>
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <div class="btn-row">
          <button type="button" @click="paso = 'datos'" class="btn-secondary">← Atrás</button>
          <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Registrando...' : 'Crear Cuenta' }}</button>
        </div>
      </form>

      <!-- FORMULARIO MÉDICO (sin cambios) -->
      <form v-if="tipo === 'medico'" @submit.prevent="handleSubmit" class="auth-form">
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
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Registrando...' : 'Crear Cuenta' }}</button>
        <p class="auth-footer">¿Ya tienes cuenta? <NuxtLink to="/login">Inicia sesión</NuxtLink></p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-section-title { font-size: 1.1rem; color: #2d3436; margin-bottom: 1rem; font-weight: 700; }
.form-section-subtitle { font-size: 0.95rem; color: #2d3436; margin: 1.2rem 0 0.6rem; font-weight: 600; border-top: 1px solid #eee; padding-top: 0.8rem; }
.form-row { display: flex; gap: 1rem; }
.form-row > .form-group { flex: 1; }
.checkbox-group { margin-top: 0.3rem; }
.checkbox-label { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.85rem; color: #636e72; cursor: pointer; }
.checkbox-label input[type="checkbox"] { margin-top: 0.2rem; width: auto; }
.checkbox-label a { color: #0984e3; }
.btn-row { display: flex; gap: 0.8rem; }
.btn-secondary { background: #dfe6e9; color: #2d3436; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-primary.full { width: 100%; }
.planes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.8rem; margin-bottom: 1rem; }
.plan-card { border: 2px solid #e0e0e0; border-radius: 10px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: #fafafa; position: relative; }
.plan-card:hover { border-color: #0984e3; }
.plan-card.selected { border-color: #00b894; background: #f0fff4; }
.plan-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
.plan-nombre { font-weight: 700; font-size: 1rem; }
.plan-precio { font-size: 0.9rem; color: #636e72; }
.plan-beneficios { list-style: none; padding: 0; margin: 0 0 0.5rem 0; }
.plan-beneficios li { font-size: 0.78rem; color: #636e72; padding: 0.15rem 0; }
.plan-check { position: absolute; top: 0.5rem; right: 0.5rem; color: #00b894; font-weight: 700; font-size: 0.85rem; }
.seguro-section { margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
.seguro-banner { background: #f0f4ff; border: 1px solid #d0d9ff; border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; }
.seguro-banner p { margin: 0.2rem 0; }
.seguro-text { color: #636e72; font-size: 0.8rem; }
</style>
