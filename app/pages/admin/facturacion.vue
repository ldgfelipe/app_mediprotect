<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const token = useCookie('admin_token')

const periodo = ref(new Date().toISOString().slice(0, 7))
const search = ref('')
const loading = ref(false)
const medicos = ref([])
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 })

const resumen = ref({})
const topMedicos = ref([])

async function cargar() {
  loading.value = true
  try {
    const [list, res] = await Promise.all([
      $fetch('/api/admin/facturacion/medicos', {
        query: { periodo: periodo.value, search: search.value, page: pagination.value.page, limit: pagination.value.limit },
        headers: { Authorization: `Bearer ${token.value}` }
      }),
      $fetch('/api/admin/facturacion/resumen', {
        query: { periodo: periodo.value },
        headers: { Authorization: `Bearer ${token.value}` }
      })
    ])
    medicos.value = list.medicos || []
    pagination.value = list.pagination
    resumen.value = res.resumen || {}
    topMedicos.value = res.top_medicos || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function formatearMoneda(v) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0)
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

watch(() => [periodo.value, search.value], () => { pagination.value.page = 1; cargar() })
onMounted(cargar)
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
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/facturacion" class="active">Facturacion</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
      <button @click="cerrarSesion" class="btn-logout">Cerrar Sesion</button>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div>
          <h1>Facturacion Medicos</h1>
          <p>Comisiones por citas confirmadas (15% del costo de consulta)</p>
        </div>
        <div class="periodo-selector">
          <label>Periodo: </label>
          <input type="month" v-model="periodo" @change="cargar" />
        </div>
      </header>

      <div class="cards">
        <div class="card">
          <h3>Ingresos Totales</h3>
          <p class="big">{{ formatearMoneda(resumen.ingresos_totales) }}</p>
        </div>
        <div class="card">
          <h3>Comision Total (15%)</h3>
          <p class="big" style="color:#00b894">{{ formatearMoneda(resumen.comision_total) }}</p>
        </div>
        <div class="card">
          <h3>Citas Confirmadas</h3>
          <p class="big">{{ resumen.citas_confirmadas || 0 }}</p>
        </div>
        <div class="card">
          <h3>Medicos con Citas</h3>
          <p class="big">{{ resumen.medicos_con_citas || 0 }}</p>
        </div>
      </div>

      <div class="search-bar">
        <input v-model="search" type="text" placeholder="Buscar por medico o especialidad..." @keyup.enter="cargar" />
        <span class="count">{{ medicos.length }} medicos en periodo</span>
      </div>

      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>Medico</th>
              <th>Especialidad</th>
              <th>Precio Consulta</th>
              <th>Total Citas</th>
              <th>Confirmadas</th>
              <th>Ingresos</th>
              <th>Comision (15%)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in medicos" :key="m.id">
              <td><strong>{{ m.nombre }} {{ m.apellido }}</strong></td>
              <td>{{ m.especialidad_nombre || '—' }}</td>
              <td>{{ formatearMoneda(m.precio_regular) }}</td>
              <td>{{ m.total_citas }}</td>
              <td>{{ m.citas_confirmadas }}</td>
              <td>{{ formatearMoneda(m.ingresos) }}</td>
              <td style="color:#00b894;font-weight:600">{{ formatearMoneda(m.comision) }}</td>
              <td>
                <NuxtLink :to="`/admin/facturacion/${m.id}?periodo=${periodo}`" class="btn-sm">Ver Detalle</NuxtLink>
              </td>
            </tr>
            <tr v-if="!medicos.length"><td colspan="8" class="empty">Sin medicos con citas en este periodo</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.pages > 1" class="pagination">
        <button @click="pagination.page--" :disabled="pagination.page === 1" class="btn-sm">Anterior</button>
        <span>Pagina {{ pagination.page }} de {{ pagination.pages }}</span>
        <button @click="pagination.page++" :disabled="pagination.page >= pagination.pages" class="btn-sm">Siguiente</button>
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
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: 0.15s; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; text-align: center; text-decoration: none; }
.btn-logout:hover { border-color: #d63031; color: #d63031; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 0; }
.periodo-selector label { font-weight: 500; margin-right: 0.5rem; }
.periodo-selector input { padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.card { background: white; border: 1px solid #eaeaea; border-radius: 10px; padding: 1.25rem; }
.card h3 { margin: 0 0 0.5rem; font-size: 0.85rem; color: #636e72; font-weight: 600; }
.card .big { margin: 0; font-size: 1.5rem; font-weight: 700; color: #2d3436; }
.search-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
.search-bar input { flex: 1; max-width: 400px; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.count { font-size: 0.85rem; color: #636e72; white-space: nowrap; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 900px; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; white-space: nowrap; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.btn-sm { background: #00b894; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; text-decoration: none; display: inline-block; }
.btn-sm:hover { background: #00a884; }
.pagination { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.5rem; align-items: center; }
.pagination button { padding: 0.4rem 1rem; border: 1px solid #e0e0e0; background: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>