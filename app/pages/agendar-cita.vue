<script setup>
const route = useRoute()
const doctorName = ref(route.query.doctor || '')
const showModal = ref(false)
const pendingCurp = ref('')

const tokenCookie = useCookie('token')

onMounted(() => {
  const token = tokenCookie.value
  const saved = localStorage.getItem('usuario')

  if (doctorName.value) {
    localStorage.setItem('agendar_doctor', doctorName.value)
    localStorage.setItem('agendar_pendiente', '1')
  }

  if (token && saved) {
    navigateTo('/dashboard/paciente')
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

function onLogged() {
  showModal.value = false
  navigateTo('/dashboard/paciente')
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

      <div class="redirect-section">
        <div class="spinner"></div>
        <p>Redirigiendo a tu panel...</p>
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
