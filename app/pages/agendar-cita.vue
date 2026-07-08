<script setup>
const route = useRoute()
const doctorName = ref(route.query.doctor || '')
const searchResults = ref([])
const loading = ref(false)
const selectedDoctor = ref(null)
const usuario = ref(null)
const showLogin = ref(false)
const showRegister = ref(false)

// Login form
const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

// Register form
const regForm = reactive({ nombre: '', apellido: '', email: '', telefono: '', password: '' })
const regError = ref('')
const regLoading = ref(false)

onMounted(() => {
  const token = useCookie('token').value
  const saved = localStorage.getItem('usuario')
  if (token && saved) {
    usuario.value = JSON.parse(saved)
  }
  if (doctorName.value) {
    buscarDoctor()
  }
})

async function buscarDoctor() {
  if (!doctorName.value.trim()) return
  loading.value = true
  try {
    const { data } = await useFetch(`/api/medicos?search=${encodeURIComponent(doctorName.value)}`)
    searchResults.value = data.value?.medicos || []
  } catch (e) {
    searchResults.value = []
  }
  loading.value = false
}

function seleccionarDoctor(medico) {
  selectedDoctor.value = medico
}

function agendarWhatsApp() {
  if (!selectedDoctor.value) return
  const m = selectedDoctor.value
  const whatsappNum = m.whatsapp || '522228021933'
  const patientName = usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido}` : ''
  const userId = usuario.value?.id || ''
  const msg = `Hola, me gustaría agendar una cita con el ${m.titulo || 'Dr.'} ${m.nombre} ${m.apellido}.\n\nPaciente: ${patientName}\nID Usuario: ${userId}`
  const url = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
  navigateTo('/dashboard/paciente')
}

async function doLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: loginForm.email, password: loginForm.password, tipo: 'paciente' }
    })
    useCookie('token').value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    usuario.value = res.usuario
    showLogin.value = false
    if (doctorName.value) buscarDoctor()
  } catch (e) {
    loginError.value = e.data?.message || 'Credenciales incorrectas'
  }
  loginLoading.value = false
}

async function doRegister() {
  regError.value = ''
  regLoading.value = true
  try {
    const res = await $fetch('/api/auth/registro-paciente', {
      method: 'POST',
      body: { nombre: regForm.nombre, apellido: regForm.apellido, email: regForm.email, telefono: regForm.telefono, password: regForm.password }
    })
    useCookie('token').value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    usuario.value = res.usuario
    showRegister.value = false
    if (doctorName.value) buscarDoctor()
  } catch (e) {
    regError.value = e.data?.message || 'Error al registrar'
  }
  regLoading.value = false
}

function irLogin() { showLogin.value = true; showRegister.value = false }
function irRegister() { showRegister.value = true; showLogin.value = false }
</script>

<template>
  <div class="agendar-page">
    <header class="header">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>
    </header>

    <main class="content">
      <h1>Agendar Cita</h1>
      <p class="subtitle">Busca tu médico y agenda tu consulta por WhatsApp</p>

      <!-- Not logged in -->
      <div v-if="!usuario" class="auth-section">
        <p>Para agendar una cita, primero inicia sesión o crea una cuenta.</p>
        <div class="auth-buttons">
          <button @click="irLogin" class="btn-primary">Iniciar Sesión</button>
          <button @click="irRegister" class="btn-secondary">Crear Cuenta</button>
        </div>

        <!-- Login form -->
        <div v-if="showLogin" class="auth-form">
          <h2>Iniciar Sesión</h2>
          <div v-if="loginError" class="error">{{ loginError }}</div>
          <input v-model="loginForm.email" type="text" placeholder="Correo o teléfono" />
          <input v-model="loginForm.password" type="password" placeholder="Contraseña" />
          <button @click="doLogin" :disabled="loginLoading" class="btn-primary">
            {{ loginLoading ? 'Entrando...' : 'Entrar' }}
          </button>
          <p class="switch-text">¿No tienes cuenta? <a @click="irRegister">Regístrate</a></p>
        </div>

        <!-- Register form -->
        <div v-if="showRegister" class="auth-form">
          <h2>Crear Cuenta</h2>
          <div v-if="regError" class="error">{{ regError }}</div>
          <input v-model="regForm.nombre" placeholder="Nombre" />
          <input v-model="regForm.apellido" placeholder="Apellido" />
          <input v-model="regForm.email" type="email" placeholder="Correo electrónico" />
          <input v-model="regForm.telefono" placeholder="Teléfono" />
          <input v-model="regForm.password" type="password" placeholder="Contraseña" />
          <button @click="doRegister" :disabled="regLoading" class="btn-primary">
            {{ regLoading ? 'Creando...' : 'Crear Cuenta' }}
          </button>
          <p class="switch-text">¿Ya tienes cuenta? <a @click="irLogin">Inicia sesión</a></p>
        </div>
      </div>

      <!-- Logged in -->
      <div v-else>
        <p class="welcome">Hola, <strong>{{ usuario.nombre }}</strong></p>

        <!-- Search -->
        <div class="search-box">
          <input v-model="doctorName" placeholder="Nombre del médico..." @keyup.enter="buscarDoctor" />
          <button @click="buscarDoctor" class="btn-primary" :disabled="loading">
            {{ loading ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>

        <!-- Results -->
        <div v-if="searchResults.length" class="results">
          <div v-for="m in searchResults" :key="m.id" class="card-doctor" :class="{ selected: selectedDoctor?.id === m.id }" @click="seleccionarDoctor(m)">
            <div class="doctor-info">
              <div class="avatar" v-if="!m.foto_url">{{ m.nombre[0] }}{{ m.apellido[0] }}</div>
              <img v-else :src="m.foto_url" :alt="m.nombre" class="avatar" />
              <div>
                <h3>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</h3>
                <p class="specialty">{{ m.especialidad_nombre || m.subespecialidad }}</p>
                <p v-if="m.ciudad" class="location">{{ m.ciudad }}</p>
              </div>
            </div>
          </div>
        </div>

        <p v-else-if="!loading && doctorName && searchResults.length === 0" class="empty">
          No se encontró ningún médico con ese nombre.
        </p>

        <!-- Agendar button -->
        <div v-if="selectedDoctor" class="action-section">
          <p>Vas a agendar cita con: <strong>{{ selectedDoctor.titulo || 'Dr.' }} {{ selectedDoctor.nombre }} {{ selectedDoctor.apellido }}</strong></p>
          <button @click="agendarWhatsApp" class="btn-whatsapp">
            Agendar Cita por WhatsApp
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.agendar-page { min-height: 100vh; background: #f8f9fa; }
.header { background: white; padding: 1rem 2rem; border-bottom: 1px solid #e0e0e0; }
.logo { height: 40px; }
.content { max-width: 700px; margin: 2rem auto; padding: 0 1rem; }
h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.3rem; }
.subtitle { color: #636e72; margin-bottom: 2rem; }
.welcome { margin-bottom: 1.5rem; color: #2d3436; }

.auth-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.auth-buttons { display: flex; gap: 1rem; margin: 1rem 0; }
.auth-form { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
.auth-form h2 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.auth-form input { padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; }
.switch-text { font-size: 0.85rem; color: #636e72; }
.switch-text a { color: #0984e3; cursor: pointer; text-decoration: underline; }

.search-box { display: flex; gap: 0.8rem; margin-bottom: 1.5rem; }
.search-box input { flex: 1; padding: 0.8rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 1rem; }

.results { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1.5rem; }
.card-doctor { background: white; padding: 1rem 1.2rem; border-radius: 10px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-doctor:hover { border-color: #0984e3; }
.card-doctor.selected { border-color: #00b894; background: #f0fff4; }
.doctor-info { display: flex; align-items: center; gap: 1rem; }
.avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; background: #dfe6e9; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #636e72; flex-shrink: 0; }
.doctor-info h3 { font-size: 1rem; margin: 0; color: #2d3436; }
.specialty { font-size: 0.85rem; color: #0984e3; margin: 0.2rem 0 0; }
.location { font-size: 0.8rem; color: #b2bec3; margin: 0.1rem 0 0; }

.action-section { background: white; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.action-section p { margin-bottom: 1rem; font-size: 1rem; }
.btn-whatsapp { background: #25d366; color: white; border: none; padding: 0.9rem 2rem; border-radius: 8px; font-size: 1.05rem; cursor: pointer; font-weight: 600; }
.btn-whatsapp:hover { background: #1da851; }

.btn-primary { background: #0984e3; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-primary:hover { background: #0770c2; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: white; color: #0984e3; border: 2px solid #0984e3; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-secondary:hover { background: #f0f8ff; }

.error { background: #ffeaa7; color: #d63031; padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.85rem; }
.empty { color: #b2bec3; text-align: center; padding: 2rem; }
</style>
