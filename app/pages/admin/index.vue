<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const admin = useCookie('admin_usuario')
const stats = ref<any>(null)
const loading = ref(true)
const activeTab = ref('resumen')

onMounted(async () => {
  const { data } = await useFetch('/api/admin/estadisticas')
  stats.value = (data.value as any)?.stats
  loading.value = false
})

function cerrarSesion() {
  const t = useCookie('admin_token')
  const u = useCookie('admin_usuario')
  t.value = null; u.value = null
  navigateTo('/admin/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h2>MediProtect</h2>
        <span class="rol">{{ admin?.rol_nombre || admin?.rol || 'Admin' }}</span>
      </div>
      <nav>
        <NuxtLink to="/admin" class="active">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Médicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
      </nav>
      <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div>
          <h1>Panel de Administración</h1>
          <p>Bienvenido, {{ admin?.nombre }} — {{ new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
        </div>
      </header>

      <p v-if="loading" class="loading">Cargando estadísticas...</p>

      <template v-else>
        <div class="stats-grid">
          <div class="stat-card"><span class="num">{{ stats?.total_pacientes || 0 }}</span><span class="label">Pacientes</span></div>
          <div class="stat-card"><span class="num">{{ stats?.total_medicos || 0 }}</span><span class="label">Médicos</span></div>
          <div class="stat-card"><span class="num">{{ stats?.total_citas || 0 }}</span><span class="label">Citas</span><small>{{ stats?.citas_pendientes || 0 }} pendientes</small></div>
          <div class="stat-card accent-green"><span class="num">${{ (stats?.ingresos_totales || 0).toLocaleString() }}</span><span class="label">Ingresos</span></div>
          <div class="stat-card"><span class="num">{{ stats?.total_empresas || 0 }}</span><span class="label">Empresas</span></div>
          <div class="stat-card"><span class="num">{{ stats?.pagos_pendientes || 0 }}</span><span class="label">Pagos Pendientes</span></div>
          <div class="stat-card"><span class="num">{{ stats?.pagos_completados || 0 }}</span><span class="label">Pagos Completados</span></div>
          <div class="stat-card"><span class="num">{{ stats?.total_planes || 0 }}</span><span class="label">Planes</span></div>
        </div>

        <div class="dashboard-tabs">
          <button :class="['tab', { active: activeTab === 'resumen' }]" @click="activeTab = 'resumen'">Resumen</button>
          <button :class="['tab', { active: activeTab === 'actividad' }]" @click="activeTab = 'actividad'">Actividad Reciente</button>
        </div>

        <div v-if="activeTab === 'resumen'" class="section">
          <div class="summary-cards">
            <NuxtLink to="/admin/pacientes" class="summary-card">
              <h3>👥 Pacientes</h3>
              <p>{{ stats?.total_pacientes || 0 }} registrados</p>
              <span class="action">Gestionar &rarr;</span>
            </NuxtLink>
            <NuxtLink to="/admin/medicos" class="summary-card">
              <h3>🩺 Médicos</h3>
              <p>{{ stats?.total_medicos || 0 }} registrados</p>
              <span class="action">Gestionar &rarr;</span>
            </NuxtLink>
            <NuxtLink to="/admin/empresas" class="summary-card">
              <h3>🏢 Empresas</h3>
              <p>{{ stats?.total_empresas || 0 }} afiliadas</p>
              <span class="action">Gestionar &rarr;</span>
            </NuxtLink>
            <NuxtLink to="/admin/pagos" class="summary-card">
              <h3>💰 Pagos</h3>
              <p>{{ stats?.pagos_pendientes || 0 }} pendientes · ${{ (stats?.ingresos_totales || 0).toLocaleString() }} cobrados</p>
              <span class="action">Ver &rarr;</span>
            </NuxtLink>
            <NuxtLink to="/admin/citas" class="summary-card">
              <h3>📅 Citas</h3>
              <p>{{ stats?.citas_pendientes || 0 }} pendientes de {{ stats?.total_citas || 0 }}</p>
              <span class="action">Ver &rarr;</span>
            </NuxtLink>
            <NuxtLink to="/admin/planes" class="summary-card">
              <h3>📋 Planes</h3>
              <p>{{ stats?.total_planes || 0 }} planes activos</p>
              <span class="action">Gestionar &rarr;</span>
            </NuxtLink>
          </div>
        </div>

        <div v-if="activeTab === 'actividad'" class="section">
          <div class="quick-actions">
            <h3>Acciones Rápidas</h3>
            <div class="actions-grid">
              <NuxtLink to="/admin/empresas" class="action-btn">+ Nueva Empresa</NuxtLink>
              <NuxtLink to="/admin/planes" class="action-btn">+ Nuevo Plan</NuxtLink>
              <NuxtLink to="/admin/pagos" class="action-btn">Verificar Pagos</NuxtLink>
              <NuxtLink to="/admin/citas" class="action-btn">Revisar Citas</NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-brand h2 { font-size: 1.1rem; margin: 0; }
.sidebar-brand .rol { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: 0.15s; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; }
.btn-logout:hover { border-color: #d63031; color: #d63031; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 2rem; text-transform: capitalize; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; }
.stat-card .num { font-size: 1.8rem; font-weight: 700; color: #2d3436; line-height: 1.2; }
.stat-card .label { font-size: 0.8rem; color: #636e72; margin-top: 0.25rem; }
.stat-card small { font-size: 0.75rem; color: #d63031; margin-top: 0.15rem; }
.stat-card.accent-green { border-left: 3px solid #00b894; }
.dashboard-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.tab { padding: 0.5rem 1rem; border: 1px solid #e0e0e0; background: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #636e72; }
.tab.active { background: #00b894; color: white; border-color: #00b894; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.summary-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; text-decoration: none; color: inherit; transition: 0.15s; }
.summary-card:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,184,148,0.1); }
.summary-card h3 { margin: 0 0 0.25rem; font-size: 1rem; color: #2d3436; }
.summary-card p { margin: 0; font-size: 0.85rem; color: #636e72; }
.summary-card .action { display: inline-block; margin-top: 0.75rem; font-size: 0.8rem; color: #00b894; font-weight: 600; }
.quick-actions h3 { font-size: 1.1rem; color: #2d3436; margin-bottom: 1rem; }
.actions-grid { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.action-btn { padding: 0.6rem 1.2rem; background: white; border: 1px solid #00b894; color: #00b894; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; transition: 0.15s; }
.action-btn:hover { background: #00b894; color: white; }
</style>
