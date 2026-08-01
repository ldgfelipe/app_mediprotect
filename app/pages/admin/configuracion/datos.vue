<script setup>
definePageMeta({ middleware: 'admin-auth' })

const adminToken = useCookie('admin_token')

const tables = ref([])
const loading = ref(true)
const errorMsg = ref('')
const tablaSeleccionada = ref(null)
const mostrarImportar = ref(false)
const mostrarLimpiar = ref(false)
const archivoImportar = ref(null)
const confirmLimpiar = ref('')
const importando = ref(false)
const limpiando = ref(false)
const msgExito = ref('')
const msgError = ref('')

const tablaActual = computed(() => tables.value.find(t => t.name === tablaSeleccionada.value))

const formatRows = (n) => {
  return n.toLocaleString('es-MX')
}

async function cargarTablas() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await $fetch('/api/admin/tables', {
      headers: { Authorization: `Bearer ${adminToken.value}` }
    })
    tables.value = data.tables || []
  } catch (err) {
    errorMsg.value = 'Error al cargar tablas: ' + (err.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

function exportar(tabla) {
  const url = `/api/admin/exportar/${tabla}`
  const a = document.createElement('a')
  a.href = url
  a.download = `${tabla}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function importar() {
  if (!archivoImportar.value || !tablaSeleccionada.value) return
  importando.value = true
  msgError.value = ''
  try {
    const formData = new FormData()
    formData.append('file', archivoImportar.value)
    formData.append('tabla', tablaSeleccionada.value)

    const res = await $fetch('/api/admin/importar', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${adminToken.value}` }
    })
    msgExito.value = `Importado: ${res.inserted} filas insertadas, ${res.errors} errores`
    setTimeout(() => { msgExito.value = '' }, 5000)
    await cargarTablas()
    mostrarImportar.value = false
    archivoImportar.value = null
  } catch (err) {
    msgError.value = err.data?.message || 'Error al importar'
  } finally {
    importando.value = false
  }
}

async function limpiar() {
  if (confirmLimpiar.value !== tablaSeleccionada.value) return
  limpiando.value = true
  msgError.value = ''
  try {
    await $fetch(`/api/admin/limpiar/${tablaSeleccionada.value}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken.value}`, 'Content-Type': 'application/json' },
      body: { confirm: tablaSeleccionada.value }
    })
    msgExito.value = `Tabla ${tablaSeleccionada.value} limpiada correctamente`
    setTimeout(() => { msgExito.value = '' }, 5000)
    await cargarTablas()
    mostrarLimpiar.value = false
    confirmLimpiar.value = ''
  } catch (err) {
    msgError.value = err.data?.message || 'Error al limpiar tabla'
  } finally {
    limpiando.value = false
  }
}

onMounted(cargarTablas)
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Médicos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/configuracion" class="active">Configuración</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesión</NuxtLink>
    </aside>

    <main class="admin-content">
      <header class="content-header">
        <div>
          <h1>Gestión de Datos</h1>
          <p>Exporta, importa o limpia tablas de la base de datos</p>
        </div>
        <button @click="cargarTablas" class="btn-secondary" :disabled="loading">
          {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </header>

      <div v-if="msgExito" class="toast-success">{{ msgExito }}</div>
      <div v-if="msgError" class="error-msg">{{ msgError }}</div>

      <div v-if="loading" class="loading">Cargando tablas...</div>

      <div v-else-if="tables.length === 0" class="empty">
        <p>No se encontraron tablas.</p>
      </div>

      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>Tabla</th>
              <th>Filas</th>
              <th>Columnas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tables" :key="t.name">
              <td><code>{{ t.name }}</code></td>
              <td>{{ formatRows(t.row_count) }}</td>
              <td>{{ t.columns.length }}</td>
              <td class="acciones">
                <button @click="exportar(t.name)" class="btn-sm btn-outline">Exportar CSV</button>
                <button @click="tablaSeleccionada = t.name; mostrarImportar = true" class="btn-sm btn-primary">Importar CSV</button>
                <button @click="tablaSeleccionada = t.name; confirmLimpiar = ''; mostrarLimpiar = true" class="btn-sm btn-danger">Limpiar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal Importar -->
      <div v-if="mostrarImportar" class="modal-overlay" @click.self="mostrarImportar = false">
        <div class="modal">
          <h3>Importar CSV — {{ tablaSeleccionada }}</h3>
          <p class="modal-desc">Selecciona un archivo CSV. Las columnas del encabezado deben coincidir con las de la tabla.</p>
          <input type="file" accept=".csv" @change="e => archivoImportar = e.target.files[0]" />
          <div class="modal-actions">
            <button @click="mostrarImportar = false" class="btn-cancel">Cancelar</button>
            <button @click="importar" :disabled="importando || !archivoImportar" class="btn-primary">
              {{ importando ? 'Importando...' : 'Importar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Limpiar -->
      <div v-if="mostrarLimpiar" class="modal-overlay" @click.self="mostrarLimpiar = false">
        <div class="modal modal-danger">
          <h3>⚠️ Limpiar tabla</h3>
          <p>Esta acción eliminará <strong>todos</strong> los registros de <code>{{ tablaSeleccionada }}</code>. Esta acción no se puede deshacer.</p>
          <p>Para confirmar, escribe <strong>{{ tablaSeleccionada }}</strong> en el campo:</p>
          <input v-model="confirmLimpiar" placeholder="Escribe el nombre de la tabla para confirmar" />
          <div class="modal-actions">
            <button @click="mostrarLimpiar = false; confirmLimpiar = ''" class="btn-cancel">Cancelar</button>
            <button @click="limpiar" :disabled="limpiando || confirmLimpiar !== tablaSeleccionada" class="btn-danger">
              {{ limpiando ? 'Limpiando...' : 'Sí, limpiar todo' }}
            </button>
          </div>
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
.btn-logout:hover { background: rgba(255,255,255,0.1); }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; min-height: 100vh; }
.content-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { margin: 0.25rem 0 0; color: #636e72; font-size: 0.9rem; }

.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 500; text-decoration: none; border: 1px solid #e0e0e0; background: white; color: #2d3436; transition: all 0.2s; }
.btn-sm:hover { background: #f5f5f5; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
.btn-primary:hover:not(:disabled) { background: #00a381; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: #d63031; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
.btn-danger:hover:not(:disabled) { background: #c0392b; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: transparent; color: #2d3436; border: 1.5px solid #2d3436; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.btn-outline:hover { background: #f5f5f5; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.btn-cancel:hover { background: #eee; }
.btn-secondary { background: #636e72; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-secondary:hover { background: #555; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.loading, .empty { text-align: center; padding: 3rem; color: #636e72; }

.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; white-space: nowrap; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
tr:last-child td { border-bottom: none; }
code { background: #f0f0f0; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.82rem; }
.acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
.modal h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.modal-desc { color: #636e72; font-size: 0.85rem; margin-bottom: 1rem; }
.modal input[type="file"] { margin-bottom: 1rem; font-size: 0.85rem; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
.modal.modal-danger { border: 2px solid #d63031; }
.modal.modal-danger h3 { color: #d63031; }
.modal.modal-danger input { border-color: #d63031; }

.error-msg { background: #fff5f5; color: #c62828; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem; border: 1px solid #ffd7d7; }
.toast-success { position: fixed; bottom: 2rem; right: 2rem; background: #00b894; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .acciones { flex-direction: column; }
}
</style>
