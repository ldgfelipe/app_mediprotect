<script setup>
const route = useRoute()
const doctorName = ref(route.query.doctor || '')
const usuario = ref(null)
const showLogin = ref(false)
const showRegister = ref(false)
const yaRedirigio = ref(false)

const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

const regForm = reactive({ nombre: '', apellido: '', email: '', telefono: '', password: '' })
const regError = ref('')
const regLoading = ref(false)

onMounted(() => {
  const token = useCookie('token').value
  const saved = localStorage.getItem('usuario')
  if (token && saved) {
    usuario.value = JSON.parse(saved)
    abrirWhatsApp()
  }
})

function abrirWhatsApp() {
  if (yaRedirigio.value || !doctorName.value) return
  yaRedirigio.value = true
  const nombre = usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido}` : ''
  const userId = usuario.value?.id || ''
  const msg = `Hola, quiero una cita con el médico ${doctorName.value}.\n\nMi nombre es: ${nombre}\nMi ID de usuario es: ${userId}`
  const whatsappNum = '522228021933'
  window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank')
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
    abrirWhatsApp()
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
    abrirWhatsApp()
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
      <p class="doctor-name" v-if="doctorName">Médico: <strong>{{ doctorName }}</strong></p>

      <!-- Not logged in -->
      <div v-if="!usuario" class="auth-section">
        <p>Para agendar una cita con <strong>{{ doctorName }}</strong>, primero inicia sesión o crea una cuenta.</p>
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

      <!-- Logged in: redirecting -->
      <div v-else class="redirect-section">
        <div class="spinner"></div>
        <p>Abriendo WhatsApp...</p>
        <p class="small">Se abrirá una ventana de WhatsApp con tu solicitud.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.agendar-page { min-height: 100vh; background: #f8f9fa; }
.header { background: white; padding: 1rem 2rem; border-bottom: 1px solid #e0e0e0; }
.logo { height: 40px; }
.content { max-width: 600px; margin: 3rem auto; padding: 0 1rem; text-align: center; }
h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.5rem; }
.doctor-name { font-size: 1.1rem; color: #636e72; margin-bottom: 2rem; }

.auth-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: left; }
.auth-buttons { display: flex; gap: 1rem; margin: 1rem 0; }
.auth-form { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
.auth-form h2 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.auth-form input { padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; }
.switch-text { font-size: 0.85rem; color: #636e72; }
.switch-text a { color: #0984e3; cursor: pointer; text-decoration: underline; }

.redirect-section { padding: 3rem 0; }
.spinner { width: 40px; height: 40px; border: 4px solid #dfe6e9; border-top-color: #25d366; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.small { font-size: 0.85rem; color: #b2bec3; }

.btn-primary { background: #0984e3; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-primary:hover { background: #0770c2; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: white; color: #0984e3; border: 2px solid #0984e3; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-secondary:hover { background: #f0f8ff; }

.error { background: #ffeaa7; color: #d63031; padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.85rem; }
</style>
