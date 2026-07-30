<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const tokenCookie = useCookie('admin_token')
const usuarioCookie = useCookie('admin_usuario')

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const res: any = await $fetch('/api/auth/login-admin', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })

    tokenCookie.value = res.token
    usuarioCookie.value = res.usuario

    return navigateTo('/admin')
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al iniciar sesión'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container" style="max-width:400px">
      <div class="auth-header">
        <h1>Admin MediProtect</h1>
        <p>Acceso al panel administrativo</p>
      </div>
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>Correo electrónico</label>
          <input v-model="email" type="email" placeholder="admin@mediprotect.com" required />
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Entrando...' : 'Iniciar Sesión' }}</button>
      </form>
    </div>
  </div>
</template>
