<script setup lang="ts">
const route = useRoute()
const token = useCookie('token')
const usuario = useCookie('usuario')

const medico = ref<any>(null)
const disponibilidad = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const mostrarModal = ref(false)
const paso = ref<'elegir' | 'login' | 'registro' | 'whatsapp'>('elegir')

const loginForm = ref({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

const regForm = ref({ nombre: '', telefono: '', email: '' })
const regError = ref('')
const regLoading = ref(false)

const resultado = ref<{ folio: string; wa_link: string; es_nuevo: boolean } | null>(null)
const copiado = ref(false)

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

function abrirModal() {
  if (esPaciente.value) {
    paso.value = 'whatsapp'
    resultado.value = null
  } else {
    paso.value = 'elegir'
  }
  loginError.value = ''
  regError.value = ''
  loginForm.value = { email: '', password: '' }
  regForm.value = { nombre: '', telefono: '', email: '' }
  mostrarModal.value = true
}

function cerrarModal() {
  mostrarModal.value = false
  resultado.value = null
  copiado.value = false
}

async function iniciarSesion() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const d: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: loginForm.value.email, password: loginForm.value.password, tipo: 'paciente' },
    })
    token.value = d.token
    usuario.value = d.usuario
    paso.value = 'whatsapp'
    resultado.value = null
  } catch (e: any) {
    loginError.value = e?.data?.message || e?.message || 'Error al iniciar sesión'
  } finally {
    loginLoading.value = false
  }
}

async function registrar() {
  regError.value = ''
  regLoading.value = true
  try {
    const res: any = await $fetch('/api/auth/pre-registro', {
      method: 'POST',
      body: {
        nombre: regForm.value.nombre,
        telefono: regForm.value.telefono,
        email: regForm.value.email || undefined,
        id_medico: route.params.id,
      },
    })
    resultado.value = res
    paso.value = 'whatsapp'
  } catch (e: any) {
    regError.value = e?.data?.message || e?.message || 'Error al registrarse'
  } finally {
    regLoading.value = false
  }
}

async function generarWhatsApp() {
  paso.value = 'whatsapp'
  resultado.value = null
  try {
    const res: any = await $fetch('/api/auth/pre-registro', {
      method: 'POST',
      body: { nombre: '', telefono: '', id_medico: route.params.id },
    })
    resultado.value = res
  } catch {}
}

function irAWhatsApp() {
  if (resultado.value?.wa_link) {
    window.open(resultado.value.wa_link, '_blank')
  }
}

function copiarFolio() {
  if (resultado.value?.folio) {
    navigator.clipboard.writeText(resultado.value.folio)
    copiado.value = true
    setTimeout(() => { copiado.value = false }, 2000)
  }
}
</script>

<template>
  <div class="detalle-page">
    <header class="detalle-header">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo-sm" /></NuxtLink>
      <nav>
        <NuxtLink to="/medicos">&larr; Volver a Médicos</NuxtLink>
        <NuxtLink to="/paquetes">Planes</NuxtLink>
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
          <button @click="abrirModal" class="btn-agendar">
            Agendar Cita por WhatsApp
          </button>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="mostrarModal" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-container">
          <button class="modal-close" @click="cerrarModal">&times;</button>

          <div v-if="paso === 'elegir'" class="modal-body">
            <h2>Agendar Cita</h2>
            <p class="modal-sub">¿Ya eres afiliado de MediProtect?</p>
            <div class="modal-actions">
              <button @click="paso = 'login'" class="btn-primary btn-block">Sí, ya soy afiliado</button>
              <button @click="paso = 'registro'" class="btn-outline btn-block">No, quiero afiliarme</button>
            </div>
            <p class="modal-footer-text">
              Al agendar aceptas nuestros <NuxtLink to="/terminos">Términos y Condiciones</NuxtLink>
            </p>
          </div>

          <div v-if="paso === 'login'" class="modal-body">
            <h2>Iniciar Sesión</h2>
            <p class="modal-sub">Ingresa con tu correo y contraseña</p>
            <form @submit.prevent="iniciarSesion" class="modal-form">
              <div class="form-group">
                <label>Correo electrónico</label>
                <input v-model="loginForm.email" type="email" placeholder="correo@ejemplo.com" required />
              </div>
              <div class="form-group">
                <label>Contraseña</label>
                <input v-model="loginForm.password" type="password" placeholder="••••••••" required />
              </div>
              <p v-if="loginError" class="error-msg">{{ loginError }}</p>
              <button type="submit" class="btn-primary btn-block" :disabled="loginLoading">
                {{ loginLoading ? 'Entrando...' : 'Iniciar Sesión' }}
              </button>
            </form>
            <p class="modal-back" @click="paso = 'elegir'">&larr; Volver</p>
          </div>

          <div v-if="paso === 'registro'" class="modal-body">
            <h2>Afíliate gratis</h2>
            <p class="modal-sub">Completa tus datos y recibe descuentos en consultas</p>
            <form @submit.prevent="registrar" class="modal-form">
              <div class="form-group">
                <label>Nombre completo</label>
                <input v-model="regForm.nombre" placeholder="Ej: Juan Pérez" required />
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input v-model="regForm.telefono" type="tel" placeholder="+52 55 1234 5678" required />
              </div>
              <div class="form-group">
                <label>Correo electrónico (opcional)</label>
                <input v-model="regForm.email" type="email" placeholder="correo@ejemplo.com" />
                <small style="color:#636e72;font-size:0.8rem">Para enviarte tu comprobante de afiliación</small>
              </div>
              <p v-if="regError" class="error-msg">{{ regError }}</p>
              <button type="submit" class="btn-primary btn-block" :disabled="regLoading">
                {{ regLoading ? 'Registrando...' : 'Afiliarme y agendar' }}
              </button>
            </form>
            <p class="modal-back" @click="paso = 'elegir'">&larr; Volver</p>
          </div>

          <div v-if="paso === 'whatsapp'" class="modal-body">
            <div v-if="resultado" class="whatsapp-step">
              <div class="check-icon">&#10003;</div>
              <h2>¡Listo!</h2>
              <p class="modal-sub">Tu folio de solicitud: <strong class="folio">{{ resultado.folio }}</strong></p>
              <button @click="copiarFolio" class="btn-outline btn-small">
                {{ copiado ? 'Copiado' : 'Copiar folio' }}
              </button>
              <div class="wa-note">
                <p>Envía este folio por WhatsApp para que el médico te confirme el horario.</p>
              </div>
              <button @click="irAWhatsApp" class="btn-primary btn-block btn-wa">
                Abrir WhatsApp
              </button>
              <p class="modal-footer-text" style="margin-top:0.5rem">
                ¿No te abrió WhatsApp? <button @click="irAWhatsApp" class="link-btn">haz clic aquí</button>
              </p>
            </div>
            <div v-else>
              <h2>Agendar Cita</h2>
              <p class="modal-sub">Generando tu folio...</p>
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.detalle-page { min-height: 100vh; background: #ffffff; }
.detalle-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 2rem; border-bottom: 1px solid #eaeaea; }
.detalle-header nav { flex: 1; display: flex; gap: 1rem; }
.detalle-content { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
.loading { text-align: center; padding: 3rem; color: #636e72; }
.medico-grid { display: grid; grid-template-columns: 1fr; max-width: 800px; margin: 0 auto; }
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
.disponibilidad { border-top: 1px solid #eaeaea; padding-top: 1rem; margin-bottom: 1.5rem; }
.disponibilidad h3 { font-size: 1rem; margin-bottom: 0.8rem; }
.disp-item { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.9rem; }
.slot-chip { background: #f5f5f5; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }

.btn-agendar {
  display: block; width: 100%; max-width: 400px; margin: 0 auto;
  background: #25D366; color: white; border: none;
  padding: 1rem 2rem; border-radius: 8px; font-size: 1.1rem;
  font-weight: 600; cursor: pointer; transition: background 0.2s;
}
.btn-agendar:hover { background: #1da851; }

.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); display: flex; align-items: center;
  justify-content: center; z-index: 1000; padding: 1rem;
}
.modal-container {
  background: white; border-radius: 16px; padding: 2rem;
  width: 100%; max-width: 420px; position: relative;
  max-height: 90vh; overflow-y: auto;
}
.modal-close {
  position: absolute; top: 0.8rem; right: 1rem; background: none;
  border: none; font-size: 1.5rem; cursor: pointer; color: #636e72;
}
.modal-body { text-align: center; }
.modal-body h2 { font-size: 1.3rem; margin-bottom: 0.3rem; }
.modal-sub { color: #636e72; font-size: 0.95rem; margin-bottom: 1.5rem; }
.modal-actions { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem; }
.btn-block { width: 100%; }
.modal-form { display: flex; flex-direction: column; gap: 1rem; text-align: left; }
.modal-form .form-group { text-align: left; }
.modal-back { color: #636e72; font-size: 0.85rem; cursor: pointer; margin-top: 1rem; }
.modal-back:hover { color: #2d3436; }
.modal-footer-text { font-size: 0.8rem; color: #636e72; margin-top: 1rem; }
.modal-footer-text a { color: #00b894; font-weight: 600; }

.whatsapp-step { text-align: center; }
.check-icon {
  width: 50px; height: 50px; border-radius: 50%; background: #25D366;
  color: white; font-size: 1.5rem; display: flex; align-items: center;
  justify-content: center; margin: 0 auto 1rem;
}
.folio { font-size: 1.2rem; color: #2d3436; letter-spacing: 1px; }
.btn-small { font-size: 0.85rem; padding: 0.4rem 1rem; margin-top: 0.5rem; }
.wa-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.8rem; margin: 1rem 0; font-size: 0.85rem; color: #166534; }
.btn-wa { background: #25D366; margin-top: 0.5rem; }
.btn-wa:hover { background: #1da851; }
.link-btn { background: none; border: none; color: #00b894; font-weight: 600; cursor: pointer; font-size: inherit; padding: 0; text-decoration: underline; }

.spinner {
  width: 30px; height: 30px; border: 3px solid #f0f0f0; border-top-color: #2d3436;
  border-radius: 50%; animation: spin 0.6s linear infinite; margin: 1rem auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
