<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const route = useRoute()
const medicoId = route.params.id
const periodo = ref(route.query.periodo || new Date().toISOString().slice(0, 7))
const medico = ref(null)
const citas = ref([])
const resumen = ref({ total: 0, confirmadas: 0, ingresos: 0, comision: 0 })
const loading = ref(true)
const token = useCookie('admin_token')

async function cargar() {
  loading.value = true
  try {
    const data: any = await $fetch(`/api/admin/facturacion/medicos/${medicoId}?periodo=${periodo.value}`, {
      headers: { Authorization: 'Bearer ' + token.value }
    })
    medico.value = data.medico
    citas.value = data.citas
    resumen.value = data.resumen
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(cargar)
watch(periodo, cargar)

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getEstadoBadge(estado) {
  const colors = {
    pendiente: '#f39c12', confirmada: '#00b894', asistida: '#00b894',
    no_asistida: '#636e72', cancelada: '#d63031', reagendada: '#3498db',
    paciente_llego: '#0984e3', en_atencion: '#e17055'
  }
  return colors[estado] || '#636e72'
}

function exportarCSV() {
  const headers = ['Fecha', 'Paciente', 'Telefono', 'Estado', 'Costo', 'Notas']
  const rows = citas.value.map(c => [
    formatearFecha(c.fecha_hora),
    `${c.paciente_nombre} ${c.paciente_apellido}`,
    c.paciente_telefono,
    c.estado,
    c.costo_consulta,
    c.notas_paciente?.replace(/\n/g, ' ') || ''
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `facturacion_${medico.value?.nombre}_${medico.value?.apellido}_${periodo.value}.csv`
  link.click()
}
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
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
        <NuxtLink to="/admin/facturacion" class="active">Facturacion</NuxtLink>
      </nav>
      <button @click="cerrarSesion" class="btn-logout">Cerrar Sesion</button>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div>
          <NuxtLink to="/admin/facturacion" class="back-link">← Volver a Facturación</NuxtLink>
          <h1>Facturación: {{ medico?.titulo }} {{ medico?.nombre }} {{ medico?.apellido }}</h1>
          <p class="subtitle">{{ medico?.especialidad }} • {{ medico?.telefono }} • {{ medico?.email }}</p>
        </div>
        <div class="period-selector">
          <label>Período:</label>
          <input type="month" v-model="periodo" />
        </div>
      </header>

      <div v-if="loading" class="loading">Cargando facturación...</div>
      <div v-else class="facturacion-detalle">
        <div class="info-medico">
          <div class="precio-field">
            <label>Precio Regular</label>
            <span class="precio-valor">${{ medico?.precio_regular || 0 }}</span>
          </div>
          <div class="precio-field">
            <label>Precio Miembro</label>
            <span class="precio-valor">${{ medico?.precio_miembro || 0 }}</span>
          </div>
        </div>

        <div class="resumen-cards">
          <div class="card">
            <h3>Total Citas</h3>
            <div class="valor">{{ resumen.total }}</div>
          </div>
          <div class="card confirmadas">
            <h3>Confirmadas / Asistidas</h3>
            <div class="valor">{{ resumen.confirmadas }}</div>
          </div>
          <div class="card ingresos">
            <h3>Ingresos Totales</h3>
            <div class="valor">${{ resumen.ingresos }}</div>
          </div>
          <div class="card comision">
            <h3>Comisión MediProtect (15%)</h3>
            <div class="valor">${{ resumen.comision }}</div>
          </div>
          <div class="card medico-net">
            <h3>Pago al Médico (85%)</h3>
            <div class="valor">${{ (resumen.ingresos - resumen.comision).toFixed(2) }}</div>
          </div>
        </div>

        <div class="table-container">
          <div class="table-header">
            <h3>Citas en el período ({{ citas.length }})</h3>
            <button class="btn-export" @click="exportarCSV">Exportar CSV</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Paciente</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Costo Consulta</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in citas" :key="c.id">
                <td>{{ formatearFecha(c.fecha_hora) }}</td>
                <td>{{ c.paciente_nombre }} {{ c.paciente_apellido }}</td>
                <td>{{ c.paciente_telefono }}</td>
                <td><span class="badge" :style="{ background: getEstadoBadge(c.estado) }">{{ c.estado }}</span></td>
                <td class="costo">${{ c.costo_consulta }}</td>
                <td class="notas">{{ c.notas_paciente || '—' }}</td>
              </tr>
              <tr v-if="!citas.length"><td colspan="6" class="empty">Sin citas en este período</td></tr>
            </tbody>
          </table>
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
.btn-logout:hover { border-color: #d63031; color: #d63031; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.subtitle { color: #636e72; margin: 0.25rem 0 0; font-size: 0.85rem; }
.back-link { display: inline-block; margin-bottom: 0.5rem; color: #0984e3; font-size: 0.85rem; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.period-selector { display: flex; align-items: center; gap: 0.5rem; }
.period-selector label { font-size: 0.85rem; color: #636e72; }
.period-selector input { padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; }
.loading { text-align: center; color: #636e72; padding: 3rem; }

.facturacion-detalle { background: white; border-radius: 10px; border: 1px solid #e0e0e0; padding: 1.5rem; }
.info-medico { display: flex; gap: 2rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f0f0f0; }
.precio-field { display: flex; flex-direction: column; gap: 0.3rem; }
.precio-field label { font-size: 0.8rem; color: #636e72; font-weight: 500; }
.precio-valor { font-size: 1.2rem; font-weight: 700; color: #2d3436; }
.resumen-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.card { background: #f8f9fa; border-radius: 10px; padding: 1rem 1.25rem; border: 1px solid #eaeaea; }
.card h3 { font-size: 0.75rem; color: #636e72; margin: 0 0 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.card .valor { font-size: 1.5rem; font-weight: 700; color: #2d3436; }
.card.confirmadas .valor { color: #00b894; }
.card.ingresos .valor { color: #0984e3; }
.card.comision .valor { color: #e17055; }
.card.medico-net .valor { color: #00b894; font-size: 1.4rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
.table-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.table-header h3 { margin: 0; font-size: 1rem; color: #2d3436; }
.btn-export { background: #636e72; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-export:hover { background: #2d3436; }
table { width: 100%; border-collapse: collapse; min-width: 800px; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; white-space: nowrap; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.costo { font-weight: 600; color: #0984e3; }
.notas { color: #636e72; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px; color: white; font-size: 0.75rem; text-transform: capitalize; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
</style>