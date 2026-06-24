<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const medicos = ref<any[]>([])
const loading = ref(true)
const search = ref('')

onMounted(async () => {
  const { data } = await useFetch('/api/admin/medicos')
  medicos.value = (data.value as any)?.medicos || []
  loading.value = false
})

const filtered = computed(() => {
  if (!search.value) return medicos.value
  const s = search.value.toLowerCase()
  return medicos.value.filter(m =>
    m.nombre?.toLowerCase().includes(s) || m.apellido?.toLowerCase().includes(s) ||
    m.email?.toLowerCase().includes(s) || m.especialidad?.toLowerCase().includes(s)
  )
})
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos" class="active">Médicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesión</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <h1>Médicos</h1>
        <div class="search-bar">
          <input v-model="search" placeholder="Buscar médico..." />
          <span class="count">{{ filtered.length }} médicos</span>
        </div>
      </header>
      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Especialidad</th><th>Cédula</th><th>Activo</th><th>Registro</th></tr></thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.id">
              <td><strong>{{ m.nombre }} {{ m.apellido }}</strong></td>
              <td>{{ m.email }}</td><td>{{ m.especialidad || '—' }}</td><td>{{ m.cedula_profesional || '—' }}</td>
              <td>{{ m.activo ? '✓' : '✗' }}</td>
              <td>{{ new Date(m.created_at).toLocaleDateString('es-MX') }}</td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="6" class="empty">Sin resultados</td></tr>
          </tbody>
        </table>
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
.content-header h1 { margin: 0 0 1rem; color: #2d3436; font-size: 1.5rem; }
.search-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
.search-bar input { flex: 1; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.count { font-size: 0.85rem; color: #636e72; white-space: nowrap; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
</style>
