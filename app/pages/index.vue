<script setup lang="ts">
const token = useCookie('token')
const usuario = useCookie('usuario')
const estaAutenticado = computed(() => !!token.value)

function cerrarSesion() {
  token.value = null
  usuario.value = null
  navigateTo('/')
}
</script>

<template>
  <div class="app-landing">
    <header class="app-header">
      <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="app-logo" />
      <nav v-if="estaAutenticado">
        <NuxtLink :to="usuario?.tipo === 'medico' ? '/dashboard/medico' : '/dashboard/paciente'" class="btn-primary">Ir a mi Panel</NuxtLink>
        <button @click="cerrarSesion" class="btn-outline" style="cursor:pointer">Salir</button>
      </nav>
      <nav v-else>
        <NuxtLink to="/login" class="btn-outline">Iniciar Sesión</NuxtLink>
        <NuxtLink to="/registro" class="btn-primary">Crear Cuenta</NuxtLink>
      </nav>
    </header>
    <main class="app-main">
      <div class="app-hero">
        <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="hero-logo" />
        <h1>Sistema de Gestión MediProtect</h1>
        <p>Plataforma para pacientes, médicos y administración</p>
        <div v-if="!estaAutenticado" class="hero-actions">
          <NuxtLink to="/login" class="btn-primary btn-lg">Iniciar Sesión</NuxtLink>
          <NuxtLink to="/registro" class="btn-outline btn-lg">Registrarse</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-landing { min-height: 100vh; display: flex; flex-direction: column; background: #ffffff; }
.app-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid #eaeaea; }
.app-logo { height: 40px; }
.app-header nav { display: flex; gap: 1rem; align-items: center; }
.app-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.app-hero { text-align: center; max-width: 500px; }
.hero-logo { height: 80px; margin-bottom: 1.5rem; }
.app-hero h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #2d3436; }
.app-hero p { font-size: 1.1rem; color: #636e72; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 1rem; justify-content: center; }
.btn-lg { padding: 0.9rem 2rem; font-size: 1.05rem; }
</style>
