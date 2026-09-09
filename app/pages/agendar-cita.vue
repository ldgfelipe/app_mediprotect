<script setup>
const route = useRoute()
const doctorName = ref(route.query.doctor || '')
const usuario = ref(null)
const yaRedirigio = ref(false)
const creandoCita = ref(false)
const showModal = ref(false)
const pendingCurp = ref('')

const tokenCookie = useCookie('token')

onMounted(async () => {
  const token = tokenCookie.value
  const saved = localStorage.getItem('usuario')
  if (token && saved) {
    usuario.value = JSON.parse(saved)
    await crearCitaYWhatsApp()
    return
  }

  // Verificar si hay CURP pendiente en localStorage
  const savedCurp = localStorage.getItem('pending_curp')
  if (savedCurp) {
    pendingCurp.value = savedCurp
  }

  // Mostrar modal de auth
  showModal.value = true
})

function abrirWhatsApp() {
  if (yaRedirigio.value || !doctorName.value) return
  yaRedirigio.value = true
  const nombre = usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido}` : ''
  const userId = usuario.value?.id || ''
  const msg = `Hola, quiero una cita con el médico ${doctorName.value}.\n\nMi nombre es: ${nombre}\nMi ID de usuario es: ${userId}`
  const whatsappNum = '522228021933'
  window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank')
}

async function crearCitaYWhatsApp() {
  creandoCita.value = true
  try {
    const token = tokenCookie.value
    await $fetch('/api/citas/crear', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { medico_nombre: doctorName.value }
    })
  } catch (e) {
    console.error('Error creando cita:', e)
  }
  localStorage.removeItem('agendar_doctor')
  localStorage.removeItem('agendar_pendiente')
  localStorage.removeItem('pending_curp')
  creandoCita.value = false
  abrirWhatsApp()
  return navigateTo('/dashboard/paciente')
}

function onLogged(user) {
  usuario.value = user
  showModal.value = false
  localStorage.removeItem('pending_curp')
  crearCitaYWhatsApp()
}
</script>

<template>
  <div class="agendar-page">
    <header class="header">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>
    </header>

    <main class="content">
      <h1>Agendar Cita</h1>
      <p class="doctor-name" v-if="doctorName">Médico: <strong>{{ doctorName }}</strong></p>

      <!-- Ya logueado - procesando -->
      <div v-if="usuario && !yaRedirigio" class="redirect-section">
        <div class="spinner"></div>
        <p>{{ creandoCita ? 'Creando tu cita...' : 'Abriendo WhatsApp...' }}</p>
      </div>

      <!-- Modal de autenticación -->
      <AuthModal
        :show="showModal"
        :doctorName="doctorName"
        :initialCurp="pendingCurp"
        @close="showModal = false"
        @logged="onLogged"
      />
    </main>
  </div>
</template>

<style scoped>
.agendar-page { min-height: 100vh; background: #f8f9fa; }
.header { background: white; padding: 1rem 2rem; border-bottom: 1px solid #e0e0e0; }
.logo { height: 40px; }
.content { max-width: 700px; margin: 2rem auto; padding: 0 1rem; text-align: center; }
h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.5rem; }
.doctor-name { font-size: 1.1rem; color: #636e72; margin-bottom: 1.5rem; }
.redirect-section { padding: 3rem 0; }
.spinner { width: 40px; height: 40px; border: 4px solid #dfe6e9; border-top-color: #25d366; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
