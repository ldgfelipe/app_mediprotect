<script setup>
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function doLogin() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/auth/login-asistente', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    useCookie('token').value = res.token
    localStorage.setItem('usuario', JSON.stringify({ ...res.asistente, tipo: 'asistente' }))
    navigateTo('/asistente')
  } catch (e) {
    error.value = e.data?.message || 'Credenciales incorrectas'
  }
  loading.value = false
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" />
      <h1>Panel de Asistente</h1>
      <div v-if="error" class="error">{{ error }}</div>
      <form @submit.prevent="doLogin">
        <input v-model="email" type="email" placeholder="Correo electrónico" required />
        <input v-model="password" type="password" placeholder="Contraseña" required />
        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
      <p class="back"><NuxtLink to="/login">← Volver al login general</NuxtLink></p>
    </div>
  </div>
</template>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5; }
.login-card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 100%; max-width: 400px; text-align: center; }
.logo { height: 45px; margin-bottom: 1.5rem; }
h1 { font-size: 1.3rem; color: #2d3436; margin-bottom: 1.5rem; }
form { display: flex; flex-direction: column; gap: 0.8rem; }
input { padding: 0.8rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; }
.btn-primary { background: #0984e3; color: white; border: none; padding: 0.8rem; border-radius: 8px; font-size: 1rem; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }
.error { background: #ffeaa7; color: #d63031; padding: 0.6rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; }
.back { margin-top: 1.5rem; font-size: 0.85rem; }
.back a { color: #0984e3; text-decoration: none; }
</style>
