<script setup lang="ts">
const usuario = useCookie('usuario')

definePageMeta({
  middleware: 'auth',
})

function cerrarSesion() {
  const t = useCookie('token')
  const u = useCookie('usuario')
  t.value = null
  u.value = null
  navigateTo('/')
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="dashboard-header-inner">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo-sm" /></NuxtLink>
        <nav>
          <NuxtLink to="/dashboard/medico">Inicio</NuxtLink>
          <NuxtLink to="/mi-agenda">Mi Agenda</NuxtLink>
          <NuxtLink to="/mis-pacientes">Mis Pacientes</NuxtLink>
          <NuxtLink to="/mis-comisiones">Comisiones</NuxtLink>
        </nav>
        <div class="user-info">
          <span>Dr. {{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <EmailConfirmBanner />
      <SmsConfirmBanner />
      <h1>Bienvenido, Dr. {{ usuario?.nombre }}</h1>
      <p class="subtitle">Panel del Médico — MediProtect</p>
      <div class="cards">
        <div class="card">
          <h3>Mi Agenda</h3>
          <p>Configura tu disponibilidad y revisa tus citas.</p>
          <NuxtLink to="/mi-agenda" class="btn-card">Gestionar</NuxtLink>
        </div>
        <div class="card">
          <h3>Mis Pacientes</h3>
          <p>Pacientes que han agendado contigo.</p>
          <NuxtLink to="/mis-pacientes" class="btn-card">Ver</NuxtLink>
        </div>
        <div class="card">
          <h3>Comisiones</h3>
          <p>Revisa tus consultas y comisiones generadas.</p>
          <NuxtLink to="/mis-comisiones" class="btn-card">Ver</NuxtLink>
        </div>
        <div class="card">
          <h3>Mi Perfil</h3>
          <p>Actualiza tu información profesional.</p>
          <NuxtLink to="/perfil" class="btn-card">Editar</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; color: #636e72; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }
</style>
