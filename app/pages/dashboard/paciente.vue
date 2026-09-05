<script setup lang="ts">
const token = useCookie('token')
const usuario = useCookie('usuario')
const plan = ref<any>(null)

definePageMeta({
  middleware: 'auth',
})

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/paquetes/mi-plan')
    plan.value = (data.value as any)?.plan
  } catch {}
})

function cerrarSesion() {
  token.value = null
  usuario.value = null
  navigateTo('/')
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="dashboard-header-inner">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo-sm" /></NuxtLink>
        <nav>
          <NuxtLink to="/dashboard/paciente">Inicio</NuxtLink>
          <a href="https://www.mediprotect.com.mx/red-medica" target="_blank">Buscar Médicos</a>
          <NuxtLink to="/mis-citas">Mis Citas</NuxtLink>
          <NuxtLink to="/paquetes">Mi Plan</NuxtLink>
        </nav>
        <div class="user-info">
          <span>{{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <EmailConfirmBanner />
      <SmsConfirmBanner />
      <h1>Bienvenido, {{ usuario?.nombre }}</h1>
      <p class="subtitle">Panel de Paciente — MediProtect</p>

      <div v-if="plan" class="plan-badge" :class="plan.slug">
        <strong>{{ plan.nombre }}</strong>
        <span v-if="plan.precio > 0">${{ plan.precio.toLocaleString() }}/año</span>
        <span v-else>Gratuito</span>
      </div>

      <div class="cards">
        <div class="card">
          <h3>Buscar Especialistas</h3>
          <p>Encuentra médicos en nuestra red y agenda tu consulta.</p>
          <a href="https://www.mediprotect.com.mx/red-medica" target="_blank" class="btn-card">Buscar</a>
        </div>
        <div class="card">
          <h3>Mis Citas</h3>
          <p>Revisa y administra tus citas agendadas.</p>
          <NuxtLink to="/mis-citas" class="btn-card">Ver Citas</NuxtLink>
        </div>
        <div class="card">
          <h3>Mi Plan</h3>
          <p>Conoce los beneficios de tu plan o mejora a uno superior.</p>
          <NuxtLink to="/paquetes" class="btn-card">Ver Planes</NuxtLink>
        </div>
        <div class="card">
          <h3>Mi Perfil</h3>
          <p>Actualiza tus datos personales.</p>
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
