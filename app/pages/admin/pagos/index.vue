<script setup>
definePageMeta({ middleware: 'admin-auth' })

const estadisticas = ref({})
const pagos = ref([])
const paginaActual = ref(1)
const totalRegistros = ref(0)
const totalPaginas = ref(0)
const loading = ref(true)

const filtros = reactive({
  buscar: '',
  estado: '',
  provedor: '',
  sandbox: ''
})

const formatMoney = (val) => {
  return parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const estadoClass = (e) => {
  const map = { pagado: 'tag-green', pendiente: 'tag-yellow', fallido: 'tag-red', cancelado: 'tag-gray', reembolsado: 'tag-blue' }
  return map[e] || 'tag-gray'
}

const provedorClass = (p) => {
  const map = { mercadopago: 'tag-blue', stripe: 'tag-purple', paypal: 'tag-yellow' }
  return map[p] || 'tag-gray'
}

const cargarEstadisticas = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const data = await $fetch('/api/admin/pagos-estadisticas', {
      headers: { Authorization: `Bearer ${token}` }
    })
    estadisticas.value = data.estadisticas
  } catch (err) {
    console.error('Error:', err)
  }
}

const cargarPagos = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const params = new URLSearchParams({
      page: paginaActual.value.toString(),
      limit: '20',
      ...filtros
    })
    const data = await $fetch(`/api/admin/pagos?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    pagos.value = data.pagos
    totalRegistros.value = data.total
    totalPaginas.value = data.pages
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

const exportarExcel = () => {
  if (pagos.value.length === 0) return alert('No hay datos para exportar')
  const headers = ['Fecha', 'Paciente', 'Email', 'Plan', 'Monto', 'Moneda', 'Provedor', 'Estado', 'Sandbox', 'ID Pago']
  const rows = pagos.value.map(p => [
    formatDate(p.created_at), p.paciente_nombre, p.paciente_email, p.plan_nombre,
    p.monto, p.moneda, p.provedor, p.estado, p.sandbox ? 'Si' : 'No', p.provedor_pago_id
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `pagos_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

onMounted(() => {
  cargarEstadisticas()
  cargarPagos()
})
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos" class="active">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
        <NuxtLink to="/admin/configuracion-pagos">Config. Pagos</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesion</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <h1>Dashboard de Pagos</h1>
        <div class="header-actions">
          <NuxtLink to="/admin/configuracion-pagos" class="btn-secondary">Configurar Pagos</NuxtLink>
          <button @click="exportarExcel" class="btn-primary">Exportar Excel</button>
        </div>
      </header>

      <!-- Estadisticas -->
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">Total Ingresos</p>
          <p class="stat-value green">${{ formatMoney(estadisticas.total_ingresos) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Pagados</p>
          <p class="stat-value blue">{{ estadisticas.pagados || 0 }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Pendientes</p>
          <p class="stat-value yellow">{{ estadisticas.pendientes || 0 }}</p>
          <p class="stat-sub">${{ formatMoney(estadisticas.total_pendiente) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Fallidos / Cancelados</p>
          <p class="stat-value red">{{ (estadisticas.fallidos || 0) + (estadisticas.cancelados || 0) }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <input v-model="filtros.buscar" placeholder="Buscar paciente..." @keyup.enter="paginaActual=1; cargarPagos()" />
        <select v-model="filtros.estado" @change="paginaActual=1; cargarPagos()">
          <option value="">Todos los estados</option>
          <option value="pagado">Pagado</option>
          <option value="pendiente">Pendiente</option>
          <option value="fallido">Fallido</option>
          <option value="cancelado">Cancelado</option>
          <option value="reembolsado">Reembolsado</option>
        </select>
        <select v-model="filtros.provedor" @change="paginaActual=1; cargarPagos()">
          <option value="">Todos los provedores</option>
          <option value="mercadopago">MercadoPago</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
        <select v-model="filtros.sandbox" @change="paginaActual=1; cargarPagos()">
          <option value="">Todos</option>
          <option value="true">Solo Sandbox</option>
          <option value="false">Solo Produccion</option>
        </select>
      </div>

      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Plan</th>
              <th>Monto</th>
              <th>Provedor</th>
              <th>Estado</th>
              <th>Modo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pago in pagos" :key="pago.id">
              <td>{{ formatDate(pago.created_at) }}</td>
              <td>
                <strong>{{ pago.paciente_nombre || 'N/A' }}</strong>
                <br><small>{{ pago.paciente_email }}</small>
              </td>
              <td>{{ pago.plan_nombre || 'N/A' }}</td>
              <td><strong>${{ formatMoney(pago.monto) }}</strong> {{ pago.moneda }}</td>
              <td><span class="tag" :class="provedorClass(pago.provedor)">{{ pago.provedor }}</span></td>
              <td><span class="tag" :class="estadoClass(pago.estado)">{{ pago.estado }}</span></td>
              <td>
                <span v-if="pago.sandbox" class="tag tag-yellow">Sandbox</span>
                <span v-else class="tag tag-green">Produccion</span>
              </td>
            </tr>
            <tr v-if="!pagos.length"><td colspan="7" class="empty">No hay pagos registrados</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Paginacion -->
      <div v-if="totalPaginas > 1" class="pagination">
        <span>{{ pagos.length }} de {{ totalRegistros }} pagos</span>
        <div class="pagination-btns">
          <button @click="paginaActual > 1 && (paginaActual--, cargarPagos())" :disabled="paginaActual <= 1">Anterior</button>
          <span>{{ paginaActual }} / {{ totalPaginas }}</span>
          <button @click="paginaActual < totalPaginas && (paginaActual++, cargarPagos())" :disabled="paginaActual >= totalPaginas">Siguiente</button>
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
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.header-actions { display: flex; gap: 0.5rem; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-primary:hover { background: #00a381; }
.btn-secondary { background: #636e72; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1rem; }
.stat-label { margin: 0 0 0.25rem; font-size: 0.8rem; color: #636e72; }
.stat-value { margin: 0; font-size: 1.5rem; font-weight: 700; color: #2d3436; }
.stat-value.green { color: #00b894; }
.stat-value.blue { color: #0984e3; }
.stat-value.yellow { color: #fdcb6e; }
.stat-value.red { color: #d63031; }
.stat-sub { margin: 0.25rem 0 0; font-size: 0.75rem; color: #b2bec3; }
.filters-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filters-bar input, .filters-bar select { padding: 0.5rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; }
.filters-bar input { flex: 1; min-width: 200px; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; white-space: nowrap; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
td small { color: #b2bec3; font-size: 0.75rem; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.tag { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
.tag-green { background: #e8f5e9; color: #2e7d32; }
.tag-yellow { background: #fff8e1; color: #f57f17; }
.tag-red { background: #ffebee; color: #c62828; }
.tag-blue { background: #e3f2fd; color: #1565c0; }
.tag-purple { background: #f3e5f5; color: #7b1fa2; }
.tag-gray { background: #f5f5f5; color: #616161; }
.pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding: 0.75rem 1rem; background: white; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 0.85rem; color: #636e72; }
.pagination-btns { display: flex; gap: 0.5rem; align-items: center; }
.pagination-btns button { padding: 0.35rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; background: white; cursor: pointer; font-size: 0.85rem; }
.pagination-btns button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-btns button:hover:not(:disabled) { background: #f5f5f5; }
</style>
