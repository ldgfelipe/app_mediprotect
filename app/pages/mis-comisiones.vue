<script setup>
definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')

const resumen = ref({})
const citas = ref([])
const periodo = ref(new Date().toISOString().slice(0, 7))
const loading = ref(true)
const error = ref('')

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const resumenMensual = computed(() => {
  if (!periodo.value) return '—'
  const [y, m] = periodo.value.split('-').map(Number)
  return `${meses[m - 1]} ${y}`
})

const consultasPagadas = computed(() => resumen.value.consultas_pagadas || 0)
const ingresos = computed(() => resumen.value.ingresos || 0)
const comision = computed(() => resumen.value.comision || 0)
const ganancia = computed(() => resumen.value.ganancia || 0)
const porcentajeComision = computed(() => resumen.value.comision_porcentaje || 15)

const stats = computed(() => [
  { label: 'Consultas pagadas', valor: String(consultasPagadas.value), color: '' },
  { label: 'Ingresos del mes', valor: formatMoney(ingresos.value), color: '' },
  { label: `Comisión MediProtect (${porcentajeComision.value}%)`, valor: formatMoney(comision.value), color: 'orange' },
  { label: 'Tu ganancia', valor: formatMoney(ganancia.value), color: 'green' },
])

const estados = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', reagendada: 'Reagendada',
  cancelada: 'Cancelada', asistida: 'Asistida', no_asistida: 'No Asistida',
}

const colores = {
  pendiente: '#f39c12', confirmada: '#00b894', reagendada: '#0984e3',
  cancelada: '#d63031', asistida: '#00b894', no_asistida: '#636e72',
}

function formatMoney(valor) {
  return Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency', currency: 'MXN',
  })
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

async function cargarDatos() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ periodo: periodo.value })
    const { data } = await useFetch(`/api/mis-comisiones?${params}`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    resumen.value = (data.value && data.value.resumen) || {}
    citas.value = (data.value && data.value.citas) || []
  } catch (e) {
    error.value = e.message || 'Error al cargar tus comisiones'
  } finally {
    loading.value = false
  }
}

onMounted(cargarDatos)

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
          <NuxtLink to="/dashboard/medico">Inicio</NuxtLink>
          <NuxtLink to="/mi-agenda">Mi Agenda</NuxtLink>
          <NuxtLink to="/mis-pacientes">Mis Pacientes</NuxtLink>
          <NuxtLink to="/mis-comisiones" class="router-link-active">Comisiones</NuxtLink>
        </nav>
        <div class="user-info">
          <span>Dr. {{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <div class="titulo-fila">
        <div>
          <h1>Mis Comisiones</h1>
          <p class="subtitle">Consulta tus ingresos y comisiones por periodo</p>
        </div>
        <div class="periodo-control">
          <input v-model="periodo" type="month" @change="cargarDatos" />
        </div>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <p class="periodo-label">Periodo: <strong>{{ resumenMensual }}</strong></p>

      <div class="stats-grid">
        <div v-for="s in stats" :key="s.label" class="stat-card">
          <p class="stat-label">{{ s.label }}</p>
          <p class="stat-value" :class="s.color">{{ s.valor }}</p>
        </div>
      </div>

      <div v-if="loading" class="loading">Cargando tus comisiones...</div>

      <div v-else-if="citas.length === 0" class="empty">
        <p>No hay consultas en este periodo.</p>
      </div>

      <div v-else>
        <div class="tabla-titulo">
          <h3>Detalle de consultas</h3>
          <span>{{ citas.length }} consulta{{ citas.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Estado</th>
                <th>Costo</th>
                <th>Comisión</th>
                <th>Tu ganancia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in citas" :key="c.id">
                <td>{{ formatearFecha(c.fecha_hora) }}</td>
                <td><strong>{{ c.paciente_nombre }} {{ c.paciente_apellido }}</strong></td>
                <td><span class="tag" :style="{ background: (colores[c.estado] || '#636e72') + '22', color: colores[c.estado] || '#636e72' }">{{ estados[c.estado] || c.estado }}</span></td>
                <td>{{ formatMoney(c.costo_consulta) }}</td>
                <td>{{ formatMoney(c.comision) }}</td>
                <td class="ganancia">{{ formatMoney((c.costo_consulta || 0) - (c.comision || 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="consultasPagadas === 0" class="aviso">
          Nota: solo las citas <strong>confirmadas</strong> o <strong>asistidas</strong> generan ingreso y comisión.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; color: #636e72; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }

.titulo-fila { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.titulo-fila .subtitle { margin-bottom: 1rem; }
.periodo-control input { padding: 0.5rem 0.75rem; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; font-family: inherit; color: #2d3436; }
.periodo-control input:focus { outline: none; border-color: #2d3436; }
.periodo-label { color: #636e72; font-size: 0.9rem; margin-bottom: 1.25rem; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; padding: 1rem 1.25rem; }
.stat-label { margin: 0 0 0.25rem; font-size: 0.8rem; color: #636e72; }
.stat-value { margin: 0; font-size: 1.4rem; font-weight: 700; color: #2d3436; }
.stat-value.green { color: #00b894; }
.stat-value.orange { color: #e17055; }

.loading, .empty { text-align: center; padding: 3rem; color: #636e72; }

.tabla-titulo { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.tabla-titulo h3 { font-size: 1.1rem; margin: 0; }
.tabla-titulo span { font-size: 0.85rem; color: #636e72; }
.table-container { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; white-space: nowrap; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
tr:last-child td { border-bottom: none; }
.tag { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.ganancia { color: #00b894; font-weight: 700; }
.aviso { margin-top: 0.75rem; font-size: 0.8rem; color: #b2bec3; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .titulo-fila { flex-direction: column; }
}
</style>
