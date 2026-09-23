<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h2>MediProtect</h2>
        <span class="role-badge">{{ adminUsuario?.rol_nombre || 'Administrador' }}</span>
      </div>
      <nav>
        <NuxtLink to="/admin" class="nav-link">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes" class="nav-link">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos" class="nav-link">Médicos</NuxtLink>
        <NuxtLink to="/admin/citas" class="nav-link">Citas</NuxtLink>
        <NuxtLink to="/admin/pagos" class="nav-link">Pagos</NuxtLink>
        <NuxtLink to="/admin/planes" class="nav-link">Planes</NuxtLink>
        <NuxtLink to="/admin/empresas" class="nav-link">Empresas</NuxtLink>
        <NuxtLink to="/admin/asistentes" class="nav-link">Asistentes</NuxtLink>
        <NuxtLink to="/admin/whatsapp" class="nav-link">WhatsApp</NuxtLink>
        <NuxtLink to="/admin/whatsapp/logs" class="nav-link active">WA Logs</NuxtLink>
        <NuxtLink to="/admin/configuracion" class="nav-link">Configuración</NuxtLink>
      </nav>
      <button class="btn-logout" @click="logout">Cerrar Sesión</button>
    </aside>

    <main class="admin-content">
      <header class="content-header">
        <div class="header-top">
          <div>
            <h1>📡 WhatsApp Logs</h1>
            <p>Monitoreo en tiempo real del tráfico del webhook</p>
          </div>
          <div class="header-actions">
            <label class="auto-refresh-toggle">
              <input type="checkbox" v-model="autoRefresh" @change="toggleAutoRefresh">
              Auto-refresh (5s)
            </label>
            <button class="btn-download" @click="descargarCSV" :disabled="descargandoCsv">
              {{ descargandoCsv ? 'Generando...' : '⬇️ Descargar CSV' }}
            </button>
            <button class="btn-clear-logs" @click="limpiarLogs" :disabled="limpiandoLogs">
              {{ limpiandoLogs ? 'Limpiando...' : '🗑️ Limpiar logs' }}
            </button>
            <button class="btn-refresh" @click="cargarLogs" :disabled="cargando">
              {{ cargando ? 'Cargando...' : '🔄 Actualizar' }}
            </button>
          </div>
        </div>
      </header>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card stat-total">
          <span class="stat-value">{{ stats.total || 0 }}</span>
          <span class="stat-label">Total mensajes</span>
        </div>
        <div class="stat-card stat-in">
          <span class="stat-value">{{ stats.entrantes || 0 }}</span>
          <span class="stat-label">📥 Entrantes</span>
        </div>
        <div class="stat-card stat-out">
          <span class="stat-value">{{ stats.salientes || 0 }}</span>
          <span class="stat-label">📤 Salientes</span>
        </div>
        <div class="stat-card stat-recent">
          <span class="stat-value">{{ stats.ultima_hora || 0 }}</span>
          <span class="stat-label">⏱️ Última hora</span>
        </div>
        <div class="stat-card stat-today">
          <span class="stat-value">{{ stats.hoy || 0 }}</span>
          <span class="stat-label">📅 Hoy</span>
        </div>
      </div>

      <!-- Gráfica de últimas 24h -->
      <div class="chart-section" v-if="ultimas24h.length > 0">
        <h3>Tráfico últimas 24 horas</h3>
        <div class="chart-bars">
          <div v-for="bar in ultimas24h" :key="bar.hora" class="chart-bar-group">
            <div class="chart-bar-stack">
              <div class="bar bar-in" :style="{ height: getBarHeight(bar.entrantes) + 'px' }" :title="`Entrantes: ${bar.entrantes}`"></div>
              <div class="bar bar-out" :style="{ height: getBarHeight(bar.salientes) + 'px' }" :title="`Salientes: ${bar.salientes}`"></div>
            </div>
            <span class="chart-label">{{ bar.hora }}</span>
          </div>
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot legend-in"></span> Entrantes</span>
          <span class="legend-item"><span class="legend-dot legend-out"></span> Salientes</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <input v-model="filtroTelefono" type="tel" placeholder="Teléfono..." class="filter-input" @input="debouncedSearch">
        <select v-model="filtroDireccion" class="filter-select" @change="cargarLogs">
          <option value="">Todas las direcciones</option>
          <option value="in">📥 Entrantes</option>
          <option value="out">📤 Salientes</option>
        </select>
        <select v-model="filtroTipo" class="filter-select" @change="cargarLogs">
          <option value="">Todos los tipos</option>
          <option value="text">Texto</option>
          <option value="list">Lista</option>
          <option value="button">Botón</option>
          <option value="interactive">Interactivo</option>
        </select>
        <input v-model="filtroFechaDesde" type="datetime-local" class="filter-date" @change="cargarLogs">
        <input v-model="filtroFechaHasta" type="datetime-local" class="filter-date" @change="cargarLogs">
        <button class="btn-clear" @click="limpiarFiltros">Limpiar</button>
      </div>

      <!-- Logs Table -->
      <div class="logs-container">
        <div v-if="cargando && logs.length === 0" class="loading">Cargando logs...</div>

        <div v-else-if="logs.length === 0" class="empty">
          No hay logs de mensajes aún. Los mensajes aparecerán cuando el webhook reciba tráfico de WhatsApp.
        </div>

        <div v-else class="logs-table-wrapper">
          <table class="logs-table">
            <thead>
              <tr>
                <th class="col-time">Hora</th>
                <th class="col-dir">Dir</th>
                <th class="col-phone">Teléfono</th>
                <th class="col-name">Nombre</th>
                <th class="col-type">Tipo</th>
                <th class="col-msg">Mensaje</th>
                <th class="col-state">Estado Conv.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" :class="log.direccion === 'in' ? 'row-in' : 'row-out'">
                <td class="col-time">
                  <span class="time-full">{{ formatearFecha(log.created_at) }}</span>
                </td>
                <td class="col-dir">
                  <span class="dir-badge" :class="log.direccion === 'in' ? 'dir-in' : 'dir-out'">
                    {{ log.direccion === 'in' ? '📥' : '📤' }}
                  </span>
                </td>
                <td class="col-phone">
                  <span class="phone-text">{{ log.telefono }}</span>
                </td>
                <td class="col-name">{{ log.nombre_paciente || '—' }}</td>
                <td class="col-type">
                  <span class="type-badge" :class="'type-' + log.tipo">{{ log.tipo }}</span>
                </td>
                <td class="col-msg">
                  <div class="msg-preview" @click="expandirMensaje(log)">
                    {{ truncar(log.mensaje, 80) }}
                  </div>
                </td>
                <td class="col-state">
                  <span v-if="log.conv_estado" class="state-badge">{{ log.conv_estado }}</span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="pagination" v-if="totalLogs > limite">
          <button class="btn-page" :disabled="offset === 0" @click="paginaAnterior">← Anterior</button>
          <span class="page-info">Mostrando {{ offset + 1 }}-{{ Math.min(offset + limite, totalLogs) }} de {{ totalLogs }}</span>
          <button class="btn-page" :disabled="offset + limite >= totalLogs" @click="paginaSiguiente">Siguiente →</button>
        </div>
      </div>

      <!-- Modal detalle mensaje -->
      <div class="modal-overlay" v-if="mensajeSeleccionado" @click.self="mensajeSeleccionado = null">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Detalle del mensaje</h3>
            <button class="btn-close" @click="mensajeSeleccionado = null">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-row">
              <label>Dirección:</label>
              <span>{{ mensajeSeleccionado.direccion === 'in' ? '📥 Entrante' : '📤 Saliente' }}</span>
            </div>
            <div class="detail-row">
              <label>Teléfono:</label>
              <span>{{ mensajeSeleccionado.telefono }}</span>
            </div>
            <div class="detail-row">
              <label>Nombre:</label>
              <span>{{ mensajeSeleccionado.nombre_paciente || '—' }}</span>
            </div>
            <div class="detail-row">
              <label>Tipo:</label>
              <span>{{ mensajeSeleccionado.tipo }}</span>
            </div>
            <div class="detail-row">
              <label>WhatsApp Msg ID:</label>
              <span class="mono">{{ mensajeSeleccionado.whatsapp_msg_id || '—' }}</span>
            </div>
            <div class="detail-row">
              <label>Estado conversación:</label>
              <span>{{ mensajeSeleccionado.conv_estado || '—' }}</span>
            </div>
            <div class="detail-row">
              <label>Fecha:</label>
              <span>{{ formatearFecha(mensajeSeleccionado.created_at) }}</span>
            </div>
            <div class="detail-row detail-full">
              <label>Mensaje completo:</label>
              <pre class="msg-full">{{ mensajeSeleccionado.mensaje }}</pre>
            </div>
            <div class="detail-row detail-full" v-if="mensajeSeleccionado.metadata && mensajeSeleccionado.metadata !== '{}'">
              <label>Metadata:</label>
              <pre class="msg-full">{{ JSON.stringify(JSON.parse(mensajeSeleccionado.metadata), null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })

const adminUsuario = useCookie('admin_usuario')

const logs = ref<any[]>([])
const stats = ref<any>({})
const ultimas24h = ref<any[]>([])
const totalLogs = ref(0)
const cargando = ref(true)
const autoRefresh = ref(false)
let refreshInterval: any = null

const limite = 100
const offset = ref(0)
const filtroTelefono = ref('')
const filtroDireccion = ref('')
const filtroTipo = ref('')
const filtroFechaDesde = ref('')
const filtroFechaHasta = ref('')
const mensajeSeleccionado = ref<any>(null)

let debounceTimer: any = null
const debouncedSearch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    offset.value = 0
    cargarLogs()
  }, 400)
}

const cargarLogs = async () => {
  cargando.value = true
  try {
    const params: any = { limite, offset: offset.value }
    if (filtroTelefono.value) params.telefono = filtroTelefono.value
    if (filtroDireccion.value) params.direccion = filtroDireccion.value
    if (filtroTipo.value) params.tipo = filtroTipo.value
    if (filtroFechaDesde.value) params.fecha_desde = filtroFechaDesde.value
    if (filtroFechaHasta.value) params.fecha_hasta = filtroFechaHasta.value

    const data: any = await $fetch('/api/admin/whatsapp-logs', {
      params,
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    logs.value = data.logs || []
    stats.value = data.stats || {}
    ultimas24h.value = data.ultimas24h || []
    totalLogs.value = data.total || 0
  } catch (e) {
    console.error('Error:', e)
  } finally {
    cargando.value = false
  }
}

const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    refreshInterval = setInterval(cargarLogs, 5000)
  } else {
    clearInterval(refreshInterval)
  }
}

const paginaAnterior = () => {
  offset.value = Math.max(0, offset.value - limite)
  cargarLogs()
}

const paginaSiguiente = () => {
  offset.value += limite
  cargarLogs()
}

const limpiarFiltros = () => {
  filtroTelefono.value = ''
  filtroDireccion.value = ''
  filtroTipo.value = ''
  filtroFechaDesde.value = ''
  filtroFechaHasta.value = ''
  offset.value = 0
  cargarLogs()
}

const descargandoCsv = ref(false)
const limpiandoLogs = ref(false)

const obtenerParamsLogs = () => {
  const params: any = {}
  if (filtroTelefono.value) params.telefono = filtroTelefono.value
  if (filtroDireccion.value) params.direccion = filtroDireccion.value
  if (filtroTipo.value) params.tipo = filtroTipo.value
  if (filtroFechaDesde.value) params.fecha_desde = filtroFechaDesde.value
  if (filtroFechaHasta.value) params.fecha_hasta = filtroFechaHasta.value
  return params
}

const descargarCSV = async () => {
  descargandoCsv.value = true
  try {
    const blob: any = await $fetch('/api/admin/whatsapp-logs/csv', {
      params: obtenerParamsLogs(),
      responseType: 'blob',
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whatsapp_logs_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Error descargando CSV:', e)
    alert('Error al descargar el CSV')
  } finally {
    descargandoCsv.value = false
  }
}

const limpiarLogs = async () => {
  if (!confirm('¿Eliminar todos los logs de mensajes de WhatsApp? Esta acción no se puede deshacer.')) return

  limpiandoLogs.value = true
  try {
    await $fetch('/api/admin/whatsapp-logs/limpiar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    await cargarLogs()
  } catch (e) {
    console.error('Error limpiando logs:', e)
    alert('Error al limpiar los logs')
  } finally {
    limpiandoLogs.value = false
  }
}

const expandirMensaje = (log: any) => {
  mensajeSeleccionado.value = log
}

const getBarHeight = (count: number) => {
  const maxVal = Math.max(...ultimas24h.value.map((b: any) => Math.max(parseInt(b.entrantes) || 0, parseInt(b.salientes) || 0)))
  if (maxVal === 0) return 4
  return Math.max(4, (count / maxVal) * 60)
}

const formatearFecha = (fecha: string) => {
  if (!fecha) return ''
  const d = new Date(fecha)
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const truncar = (texto: string, max: number) => {
  if (!texto) return ''
  return texto.length > max ? texto.substring(0, max) + '...' : texto
}

const logout = () => {
  adminUsuario.value = null
  const token = useCookie('admin_token')
  token.value = null
  navigateTo('/admin/login')
}

onMounted(() => {
  cargarLogs()
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; display: flex; flex-direction: column; padding: 1.5rem 1rem; position: fixed; height: 100vh; }
.sidebar-brand h2 { font-size: 1.3rem; margin-bottom: 0.25rem; }
.role-badge { font-size: 0.75rem; color: #00b894; text-transform: uppercase; letter-spacing: 0.5px; }
nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; margin-top: 1.5rem; }
.nav-link { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: all 0.2s; }
.nav-link:hover { background: rgba(255,255,255,0.1); }
.nav-link.active { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid rgba(255,255,255,0.2); color: #dfe6e9; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-top: auto; }
.btn-logout:hover { background: rgba(255,255,255,0.1); }
.admin-content { flex: 1; margin-left: 240px; padding: 2rem; background: #f5f6fa; min-height: 100vh; }
.content-header { margin-bottom: 1.5rem; }
.header-top { display: flex; justify-content: space-between; align-items: flex-start; }
.header-top h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.25rem; }
.header-top p { color: #636e72; }
.header-actions { display: flex; align-items: center; gap: 1rem; }
.auto-refresh-toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #636e72; cursor: pointer; }
.auto-refresh-toggle input { width: 16px; height: 16px; }
.btn-refresh { background: #00b894; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-refresh:hover { background: #00a884; }
.btn-refresh:disabled { opacity: 0.5; }
.btn-download { background: #0984e3; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-download:hover { background: #0773c1; }
.btn-download:disabled { opacity: 0.5; }
.btn-clear-logs { background: #e17055; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-clear-logs:hover { background: #d95d43; }
.btn-clear-logs:disabled { opacity: 0.5; }

.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1rem; text-align: center; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #2d3436; }
.stat-label { font-size: 0.75rem; color: #636e72; }
.stat-total { border-top: 3px solid #2d3436; }
.stat-in { border-top: 3px solid #0984e3; }
.stat-out { border-top: 3px solid #00b894; }
.stat-recent { border-top: 3px solid #fdcb6e; }
.stat-today { border-top: 3px solid #6c5ce7; }

.chart-section { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
.chart-section h3 { margin: 0 0 1rem; font-size: 1rem; color: #2d3436; }
.chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 80px; padding: 0 0.5rem; }
.chart-bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
.chart-bar-stack { display: flex; gap: 2px; align-items: flex-end; height: 65px; }
.bar { width: 12px; min-height: 4px; border-radius: 2px 2px 0 0; transition: height 0.3s; }
.bar-in { background: #0984e3; }
.bar-out { background: #00b894; }
.chart-label { font-size: 0.6rem; color: #b2bec3; margin-top: 4px; }
.chart-legend { display: flex; gap: 1.5rem; justify-content: center; margin-top: 0.75rem; }
.legend-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #636e72; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; }
.legend-in { background: #0984e3; }
.legend-out { background: #00b894; }

.filters-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
.filter-input, .filter-select, .filter-date { padding: 0.5rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.filter-input { flex: 1; max-width: 200px; }
.filter-date { max-width: 200px; }
.btn-clear { background: #dfe6e9; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-clear:hover { background: #b2bec3; }

.logs-container { background: white; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; }
.loading, .empty { text-align: center; padding: 3rem; color: #636e72; }

.logs-table-wrapper { overflow-x: auto; }
.logs-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.logs-table th { background: #f8f9fa; padding: 0.75rem 0.5rem; text-align: left; font-weight: 600; color: #636e72; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0; white-space: nowrap; }
.logs-table td { padding: 0.6rem 0.5rem; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.logs-table tbody tr:hover { background: #f8f9fa; }
.row-in { border-left: 3px solid #0984e3; }
.row-out { border-left: 3px solid #00b894; }

.col-time { white-space: nowrap; }
.time-full { font-family: monospace; font-size: 0.8rem; color: #636e72; }
.col-dir { text-align: center; }
.dir-badge { font-size: 1rem; }
.col-phone { font-family: monospace; font-size: 0.8rem; }
.phone-text { background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 4px; }
.col-name { font-size: 0.8rem; }
.type-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; text-transform: uppercase; }
.type-text { background: #e8f5e9; color: #2e7d32; }
.type-list { background: #e3f2fd; color: #1565c0; }
.type-button { background: #fff3e0; color: #e65100; }
.type-interactive { background: #f3e5f5; color: #7b1fa2; }
.col-msg { max-width: 350px; }
.msg-preview { cursor: pointer; color: #2d3436; font-size: 0.8rem; line-height: 1.4; }
.msg-preview:hover { color: #0984e3; text-decoration: underline; }
.state-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: #f5f5f5; color: #636e72; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 1rem; border-top: 1px solid #e0e0e0; }
.btn-page { background: white; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-page:hover:not(:disabled) { background: #f0f0f0; }
.btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 0.85rem; color: #636e72; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-body { padding: 1.5rem; }
.detail-row { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
.detail-row label { font-weight: 600; color: #636e72; min-width: 140px; font-size: 0.85rem; }
.detail-row span { font-size: 0.85rem; color: #2d3436; }
.detail-full { flex-direction: column; gap: 0.5rem; }
.mono { font-family: monospace; font-size: 0.8rem; background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 4px; }
.msg-full { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0.75rem; font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; max-height: 200px; overflow-y: auto; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .header-top { flex-direction: column; gap: 1rem; }
  .header-actions { flex-wrap: wrap; }
  .filters-bar { flex-direction: column; }
  .filter-input, .filter-date { max-width: 100%; }
}
</style>
