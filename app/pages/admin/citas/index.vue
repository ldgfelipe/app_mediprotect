<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const citas = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const filterEstado = ref('')

const adminToken = useCookie('admin_token')

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/admin/citas', {
      headers: { Authorization: 'Bearer ' + adminToken.value }
    })
    citas.value = data?.citas || []
  } catch (e) { console.error(e) }
  loading.value = false
})

const filtered = computed(() => {
  let r = citas.value
  if (filterEstado.value) r = r.filter(c => c.estado === filterEstado.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    r = r.filter(c => c.paciente_nombre?.toLowerCase().includes(s) || c.medico_nombre?.toLowerCase().includes(s))
  }
  return r
})

const estadoColors: Record<string, string> = {
  pendiente: '#f39c12',
  confirmada: '#00b894',
  reagendada: '#3498db',
  cancelada: '#d63031',
  asistida: '#00b894',
  no_asistida: '#636e72',
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
        <NuxtLink to="/admin/citas" class="active">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuración</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesión</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <h1>Citas</h1>
        <div class="search-bar">
          <input v-model="search" placeholder="Buscar por paciente o médico..." />
          <select v-model="filterEstado" class="filter-select">
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="asistida">Asistidas</option>
            <option value="cancelada">Canceladas</option>
            <option value="no_asistida">No Asistidas</option>
          </select>
          <span class="count">{{ filtered.length }} citas</span>
        </div>
      </header>
      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead><tr><th>Paciente</th><th>Médico</th><th>Fecha y Hora</th><th>Estado</th><th>Registro</th></tr></thead>
          <tbody>
            <tr v-for="c in filtered" :key="c.id">
              <td><strong>{{ c.paciente_nombre || '—' }}</strong></td>
              <td>{{ c.medico_nombre || '—' }}</td>
              <td>{{ new Date(c.fecha_hora).toLocaleString('es-MX') }}</td>
              <td><span class="badge" :style="{ background: estadoColors[c.estado] || '#636e72' }">{{ c.estado }}</span></td>
              <td>{{ new Date(c.created_at).toLocaleDateString('es-MX') }}</td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="5" class="empty">Sin resultados</td></tr>
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
.search-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
.search-bar input { flex: 1; min-width: 200px; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.filter-select { padding: 0.6rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; }
.count { font-size: 0.85rem; color: #636e72; white-space: nowrap; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 600px; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; white-space: nowrap; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; color: white; font-size: 0.75rem; text-transform: capitalize; }
</style>
