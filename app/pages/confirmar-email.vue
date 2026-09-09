<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = route.query.token as string
const tipo = route.query.tipo as string

const tokenCookie = useCookie('token')
const usuarioCookie = useCookie('usuario')

const status = ref<'loading' | 'success' | 'error' | 'already' | 'no-token'>('loading')
const mensaje = ref('')

onMounted(async () => {
  if (!token || !tipo) {
    status.value = 'no-token'
    mensaje.value = 'Enlace de confirmación no válido'
    return
  }

  try {
    const data: any = await $fetch(`/api/auth/confirmar-email?token=${token}&tipo=${tipo}`)
    if (data.usuario) {
      tokenCookie.value = data.token
      usuarioCookie.value = { ...data.usuario, tipo }
    }
    if (data.already_confirmed) {
      status.value = 'already'
    } else {
      status.value = 'success'
    }
    mensaje.value = data.mensaje

    // Auto-redirect al panel del paciente si hay cita pendiente
    if (tipo === 'paciente') {
      const pendingDoctor = localStorage.getItem('agendar_doctor')
      if (pendingDoctor) {
        setTimeout(() => {
          navigateTo('/dashboard/paciente')
        }, 2000)
      }
    }
  } catch (e: any) {
    status.value = 'error'
    mensaje.value = e?.data?.message || 'Error al confirmar el correo'
  }
})

function irADashboard() {
  const pendingDoctor = localStorage.getItem('agendar_doctor')
  if (pendingDoctor && tipo === 'paciente') {
    return navigateTo('/dashboard/paciente')
  }
  if (tipo === 'medico') navigateTo('/dashboard/medico')
  else if (tipo === 'paciente') navigateTo('/dashboard/paciente')
  else navigateTo('/')
}

function irALogin() {
  navigateTo('/login')
}
</script>

<template>
  <div class="confirm-page">
    <div class="confirm-card">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>

      <div v-if="status === 'loading'" class="status-box loading">
        <div class="spinner"></div>
        <p>Confirmando tu correo electrónico...</p>
      </div>

      <div v-else-if="status === 'success'" class="status-box success">
        <div class="icon-success">✓</div>
        <h2>¡Correo confirmado!</h2>
        <p>{{ mensaje }}</p>
        <p v-if="tipo === 'paciente' && localStorage.getItem('agendar_doctor')" class="pending-msg">
          📋 Tienes una cita pendiente. Te llevaremos a tu panel...
        </p>
        <button @click="irADashboard" class="btn-primary">
          Ir a mi panel
        </button>
      </div>

      <div v-else-if="status === 'already'" class="status-box already">
        <div class="icon-already">ℹ</div>
        <h2>Ya confirmado</h2>
        <p>{{ mensaje }}</p>
        <button @click="irADashboard" class="btn-primary">
          Ir a mi panel
        </button>
      </div>

      <div v-else class="status-box error">
        <div class="icon-error">✕</div>
        <h2>Error</h2>
        <p>{{ mensaje }}</p>
        <button @click="irALogin" class="btn-primary">Ir al inicio</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
  padding: 2rem;
}
.confirm-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.logo { height: 40px; margin-bottom: 2rem; }
.status-box { margin-top: 1.5rem; }
.status-box h2 { margin: 0.8rem 0 0.5rem; color: #2d3436; }
.status-box p { color: #636e72; font-size: 0.95rem; line-height: 1.5; }

.icon-success {
  width: 64px; height: 64px; border-radius: 50%;
  background: #e8f5e9; color: #2e7d32;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
}
.icon-already {
  width: 64px; height: 64px; border-radius: 50%;
  background: #e3f2fd; color: #1565c0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
}
.icon-error {
  width: 64px; height: 64px; border-radius: 50%;
  background: #ffebee; color: #c62828;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
}

.spinner {
  width: 36px; height: 36px;
  border: 3px solid #dfe6e9; border-top-color: #00b894;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

.btn-primary {
  margin-top: 1.5rem;
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: white; border: none; padding: 0.75rem 2rem;
  border-radius: 8px; font-size: 1rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,184,148,0.3); }
.pending-msg { color: #00b894; font-weight: 600; font-size: 0.9rem; margin-top: 0.5rem; }
</style>