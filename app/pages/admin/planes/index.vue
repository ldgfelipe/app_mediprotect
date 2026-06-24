<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const planes = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const form = ref({ nombre: '', descripcion: '', precio: 0, duracion_dias: 30 })

onMounted(async () => {
  const { data } = await useFetch('/api/admin/planes')
  planes.value = (data.value as any)?.planes || []
  loading.value = false
})

async function crearPlan() {
  const { error: err } = await useFetch('/api/admin/planes', {
    method: 'POST',
    body: form.value,
  })
  if (err.value) { alert(err.value.message); return }
  showForm.value = false
  form.value = { nombre: '', descripcion: '', precio: 0, duracion_dias: 30 }
  const { data } = await useFetch('/api/admin/planes')
  planes.value = (data.value as any)?.planes || []
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Médicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes" class="active">Planes</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesión</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>Planes</h1><p>Gestión de planes de suscripción</p></div>
        <button @click="showForm = true" class="btn-primary">+ Nuevo Plan</button>
      </header>

      <div v-if="showForm" class="modal">
        <div class="modal-content">
          <h2>Nuevo Plan</h2>
          <form @submit.prevent="crearPlan" class="plan-form">
            <div class="form-group"><label>Nombre</label><input v-model="form.nombre" required /></div>
            <div class="form-group"><label>Descripción</label><textarea v-model="form.descripcion" rows="3"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>Precio ($)</label><input v-model="form.precio" type="number" min="0" step="0.01" required /></div>
              <div class="form-group"><label>Duración (días)</label><input v-model="form.duracion_dias" type="number" min="1" required /></div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary">Guardar</button>
              <button type="button" @click="showForm=false" class="btn-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="planes-grid">
        <div v-for="plan in planes" :key="plan.id" class="plan-card">
          <h3>{{ plan.nombre }}</h3>
          <p class="precio">${{ Number(plan.precio).toLocaleString() }}<span>/mes</span></p>
          <p class="descripcion">{{ plan.descripcion || 'Sin descripción' }}</p>
          <div class="beneficios">
            <h4>Beneficios</h4>
            <ul v-if="plan.beneficios?.length">
              <li v-for="b in plan.beneficios" :key="b.id">{{ b.beneficio }}</li>
            </ul>
            <p v-else class="empty-list">Sin beneficios registrados</p>
          </div>
          <span class="duracion">{{ plan.duracion_dias }} días</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-brand h2 { font-size: 1.1rem; margin: 0; }
.sidebar-brand .rol { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; text-align: center; text-decoration: none; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 1.5rem; }
.btn-primary { padding: 0.5rem 1rem; background: #00b894; color: white; border: none; border-radius: 6px; cursor: pointer; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.planes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.plan-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; }
.plan-card h3 { margin: 0 0 0.5rem; color: #2d3436; font-size: 1.15rem; }
.precio { font-size: 1.8rem; font-weight: 700; color: #00b894; margin: 0 0 0.5rem; }
.precio span { font-size: 0.85rem; color: #636e72; font-weight: 400; }
.descripcion { color: #636e72; font-size: 0.85rem; margin-bottom: 1rem; }
.beneficios h4 { font-size: 0.85rem; color: #2d3436; margin: 0 0 0.5rem; }
.beneficios ul { margin: 0; padding-left: 1.2rem; }
.beneficios li { font-size: 0.8rem; color: #636e72; margin-bottom: 0.25rem; }
.empty-list { font-size: 0.8rem; color: #b2bec3; }
.duracion { display: block; margin-top: 1rem; font-size: 0.75rem; color: #b2bec3; text-transform: uppercase; letter-spacing: 0.5px; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { background: white; padding: 2rem; border-radius: 12px; width: 480px; max-width: 90vw; }
.modal-content h2 { margin: 0 0 1rem; }
.plan-form .form-group { margin-bottom: 0.75rem; }
.plan-form .form-row { display: flex; gap: 1rem; }
.plan-form .form-row .form-group { flex: 1; }
.plan-form label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #636e72; }
.plan-form input, .plan-form textarea { width: 100%; padding: 0.5rem 0.7rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box; }
.form-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
.btn-cancel { padding: 0.5rem 1rem; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; }
</style>
