<script setup lang="ts">
const email = ref('')
const password = ref('')
const tipo = ref('paciente')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { data, error: err } = await useFetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value, tipo: tipo.value },
    })
    if (err.value) throw new Error(err.value.message || 'Error al iniciar sesión')

    const tokenCookie = useCookie('token')
    const usuarioCookie = useCookie('usuario')
    tokenCookie.value = (data.value as any).token
    usuarioCookie.value = (data.value as any).usuario

    navigateTo(tipo.value === 'medico' ? '/dashboard/medico' : '/dashboard/paciente')
  } catch (e: any) {
    error.value = e.message || 'Error al iniciar sesión'
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
        <h1>Iniciar Sesión</h1>
        <p>Accede a tu cuenta de MediProtect</p>
      </div>
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="tipo-selector">
          <button type="button" :class="['tipo-btn', { active: tipo === 'paciente' }]" @click="tipo = 'paciente'">Paciente</button>
          <button type="button" :class="['tipo-btn', { active: tipo === 'medico' }]" @click="tipo = 'medico'">Médico</button>
        </div>
        <div class="form-group">
          <label>Correo electrónico</label>
          <input v-model="email" type="email" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Entrando...' : 'Iniciar Sesión' }}</button>
        <p class="auth-footer">¿No tienes cuenta? <NuxtLink to="/registro">Regístrate gratis</NuxtLink></p>
      </form>
    </div>
  </div>
</template>
