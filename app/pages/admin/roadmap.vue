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
        <NuxtLink to="/admin/roadmap" class="nav-link active">Roadmap</NuxtLink>
        <NuxtLink to="/admin/configuracion" class="nav-link">Configuración</NuxtLink>
        <NuxtLink to="/admin/configuracion/datos" class="nav-link">Gestión de Datos</NuxtLink>
      </nav>
      <button class="btn-logout" @click="logout">Cerrar Sesión</button>
    </aside>

    <main class="admin-content">
      <header class="content-header">
        <h1>Roadmap del Sistema</h1>
        <p>Actualizaciones, tareas pendientes y observaciones del proyecto</p>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'actualizaciones' }" @click="activeTab = 'actualizaciones'">
          Actualizaciones
        </button>
        <button class="tab" :class="{ active: activeTab === 'tareas' }" @click="activeTab = 'tareas'">
          Tareas Pendientes
        </button>
      </div>

      <!-- === ACTUALIZACIONES === -->
      <div v-if="activeTab === 'actualizaciones'">
        <div class="section-actions">
          <h2>Historial de Actualizaciones</h2>
          <button class="btn-primary" @click="showFormActualizacion = !showFormActualizacion">
            {{ showFormActualizacion ? 'Cancelar' : '+ Nueva Actualizacion' }}
          </button>
        </div>

        <!-- Form nueva actualizacion -->
        <div v-if="showFormActualizacion" class="form-card">
          <div class="form-row">
            <div class="form-group flex-2">
              <label>Titulo *</label>
              <input v-model="formAct.titulo" placeholder="Ej: Sistema de verificacion SMS" />
            </div>
            <div class="form-group">
              <label>Version</label>
              <input v-model="formAct.version" placeholder="Ej: v1.2.0" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo</label>
              <select v-model="formAct.tipo">
                <option value="nuevo">Nuevo feature</option>
                <option value="mejora">Mejora</option>
                <option value="correccion">Correccion de bug</option>
                <option value="seguridad">Seguridad</option>
                <option value="rendimiento">Rendimiento</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select v-model="formAct.estado">
                <option value="borrador">Borrador</option>
                <option value="publicado">Publicado</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Descripcion</label>
            <textarea v-model="formAct.descripcion" rows="3" placeholder="Detalle de los cambios realizados..."></textarea>
          </div>
          <button class="btn-primary" @click="guardarActualizacion" :disabled="!formAct.titulo || guardando">
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>

        <!-- Lista de actualizaciones -->
        <div class="items-list">
          <div v-if="actualizaciones.length === 0" class="empty-state">No hay actualizaciones registradas</div>
          <div v-for="act in actualizaciones" :key="act.id" class="item-card">
            <div class="item-header">
              <div class="item-badges">
                <span class="badge" :class="'badge-' + act.tipo">{{ tipoLabel(act.tipo) }}</span>
                <span class="badge badge-version" v-if="act.version">{{ act.version }}</span>
                <span class="badge" :class="act.estado === 'publicado' ? 'badge-success' : 'badge-draft'">
                  {{ act.estado }}
                </span>
              </div>
              <div class="item-actions">
                <button class="btn-icon-sm" @click="editarActualizacion(act)">Editar</button>
                <button class="btn-icon-sm danger" @click="eliminarActualizacion(act.id)">Eliminar</button>
              </div>
            </div>
            <h3>{{ act.titulo }}</h3>
            <p v-if="act.descripcion" class="item-desc">{{ act.descripcion }}</p>
            <div class="item-meta">
              <span>por {{ act.creado_por }}</span>
              <span>{{ formatDate(act.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- === TAREAS PENDIENTES === -->
      <div v-if="activeTab === 'tareas'">
        <div class="section-actions">
          <h2>Tareas Pendientes</h2>
          <button class="btn-primary" @click="showFormTarea = !showFormTarea">
            {{ showFormTarea ? 'Cancelar' : '+ Nueva Tarea' }}
          </button>
        </div>

        <!-- Form nueva tarea -->
        <div v-if="showFormTarea" class="form-card">
          <div class="form-row">
            <div class="form-group flex-2">
              <label>Titulo *</label>
              <input v-model="formTarea.titulo" placeholder="Ej: Implementar pagos con Stripe" />
            </div>
            <div class="form-group">
              <label>Prioridad</label>
              <select v-model="formTarea.prioridad">
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Estado</label>
              <select v-model="formTarea.estado">
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En progreso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="form-group">
              <label>Asignado a</label>
              <input v-model="formTarea.asignado_a" placeholder="Ej: Felipe" />
            </div>
          </div>
          <div class="form-group">
            <label>Descripcion</label>
            <textarea v-model="formTarea.descripcion" rows="3" placeholder="Detalle de la tarea..."></textarea>
          </div>
          <button class="btn-primary" @click="guardarTarea" :disabled="!formTarea.titulo || guardando">
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>

        <!-- Lista de tareas -->
        <div class="items-list">
          <div v-if="tareas.length === 0" class="empty-state">No hay tareas pendientes</div>
          <div v-for="tarea in tareas" :key="tarea.id" class="item-card tarea-card">
            <div class="item-header">
              <div class="item-badges">
                <span class="badge" :class="'badge-' + tarea.prioridad">{{ tarea.prioridad }}</span>
                <span class="badge" :class="'badge-estado-' + tarea.estado">{{ estadoLabel(tarea.estado) }}</span>
                <span class="badge badge-assignee" v-if="tarea.asignado_a">{{ tarea.asignado_a }}</span>
              </div>
              <div class="item-actions">
                <button class="btn-icon-sm" @click="editarTarea(tarea)">Editar</button>
                <button class="btn-icon-sm danger" @click="eliminarTarea(tarea.id)">Eliminar</button>
              </div>
            </div>
            <h3>{{ tarea.titulo }}</h3>
            <p v-if="tarea.descripcion" class="item-desc">{{ tarea.descripcion }}</p>

            <!-- Observaciones -->
            <div class="observaciones-section">
              <div class="obs-header" @click="tarea._showObs = !tarea._showObs">
                <span>Observaciones ({{ (tarea.observaciones || []).length }})</span>
                <span class="obs-toggle">{{ tarea._showObs ? '▲' : '▼' }}</span>
              </div>
              <div v-if="tarea._showObs" class="obs-body">
                <div v-if="(tarea.observaciones || []).length === 0" class="obs-empty">Sin observaciones</div>
                <div v-for="(obs, idx) in (tarea.observaciones || [])" :key="idx" class="obs-item">
                  <div class="obs-text">{{ obs.texto }}</div>
                  <div class="obs-meta">
                    <span>{{ obs.autor || 'admin' }}</span>
                    <span>{{ formatDate(obs.fecha) }}</span>
                    <button class="btn-icon-sm danger tiny" @click="eliminarObservacion(tarea, idx)">X</button>
                  </div>
                </div>
                <div class="obs-add">
                  <input v-model="tarea._nuevaObs" placeholder="Agregar observacion..." @keyup.enter="agregarObservacion(tarea)" />
                  <button class="btn-sm" @click="agregarObservacion(tarea)" :disabled="!tarea._nuevaObs">+</button>
                </div>
              </div>
            </div>

            <div class="item-meta">
              <span>{{ formatDate(tarea.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'admin-auth' })

const router = useRouter()
const adminUsuario = useCookie('admin_usuario')

const activeTab = ref('actualizaciones')
const guardando = ref(false)

// Actualizaciones
const actualizaciones = ref([])
const showFormActualizacion = ref(false)
const editandoAct = ref(null)
const formAct = ref({ titulo: '', descripcion: '', tipo: 'mejora', version: '', estado: 'publicado' })

// Tareas
const tareas = ref([])
const showFormTarea = ref(false)
const editandoTarea = ref(null)
const formTarea = ref({ titulo: '', descripcion: '', prioridad: 'media', estado: 'pendiente', asignado_a: '' })

const tipoLabels = { nuevo: 'Nuevo', mejora: 'Mejora', correccion: 'Bug', seguridad: 'Seguridad', rendimiento: 'Rendimiento' }
const estadoLabels = { pendiente: 'Pendiente', en_progreso: 'En Progreso', completada: 'Completada', cancelada: 'Cancelada' }

function tipoLabel(t) { return tipoLabels[t] || t }
function estadoLabel(e) { return estadoLabels[e] || e }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function cargarActualizaciones() {
  try {
    const data = await $fetch('/api/admin/actualizaciones')
    actualizaciones.value = data?.actualizaciones || []
  } catch (e) { console.error(e) }
}

async function cargarTareas() {
  try {
    const data = await $fetch('/api/admin/tareas')
    tareas.value = (data?.tareas || []).map(t => ({ ...t, _showObs: false, _nuevaObs: '' }))
  } catch (e) { console.error(e) }
}

async function guardarActualizacion() {
  guardando.value = true
  try {
    if (editandoAct.value) {
      await $fetch('/api/admin/actualizaciones', { method: 'PUT', body: { id: editandoAct.value, ...formAct.value } })
    } else {
      await $fetch('/api/admin/actualizaciones', { method: 'POST', body: { ...formAct.value } })
    }
    formAct.value = { titulo: '', descripcion: '', tipo: 'mejora', version: '', estado: 'publicado' }
    editandoAct.value = null
    showFormActualizacion.value = false
    await cargarActualizaciones()
  } catch (e) { alert(e?.data?.message || 'Error guardando') }
  finally { guardando.value = false }
}

function editarActualizacion(act) {
  formAct.value = { titulo: act.titulo, descripcion: act.descripcion, tipo: act.tipo, version: act.version, estado: act.estado }
  editandoAct.value = act.id
  showFormActualizacion.value = true
}

async function eliminarActualizacion(id) {
  if (!confirm('Eliminar esta actualizacion?')) return
  try {
    await $fetch('/api/admin/actualizaciones', { method: 'DELETE', query: { id } })
    await cargarActualizaciones()
  } catch (e) { alert(e?.data?.message || 'Error') }
}

async function guardarTarea() {
  guardando.value = true
  try {
    if (editandoTarea.value) {
      await $fetch('/api/admin/tareas', { method: 'PUT', body: { id: editandoTarea.value, ...formTarea.value } })
    } else {
      await $fetch('/api/admin/tareas', { method: 'POST', body: { ...formTarea.value } })
    }
    formTarea.value = { titulo: '', descripcion: '', prioridad: 'media', estado: 'pendiente', asignado_a: '' }
    editandoTarea.value = null
    showFormTarea.value = false
    await cargarTareas()
  } catch (e) { alert(e?.data?.message || 'Error guardando') }
  finally { guardando.value = false }
}

function editarTarea(tarea) {
  formTarea.value = { titulo: tarea.titulo, descripcion: tarea.descripcion, prioridad: tarea.prioridad, estado: tarea.estado, asignado_a: tarea.asignado_a }
  editandoTarea.value = tarea.id
  showFormTarea.value = true
}

async function eliminarTarea(id) {
  if (!confirm('Eliminar esta tarea?')) return
  try {
    await $fetch('/api/admin/tareas', { method: 'DELETE', query: { id } })
    await cargarTareas()
  } catch (e) { alert(e?.data?.message || 'Error') }
}

async function agregarObservacion(tarea) {
  if (!tarea._nuevaObs) return
  const obs = [...(tarea.observaciones || []), { texto: tarea._nuevaObs, autor: adminUsuario.value?.nombre || 'admin', fecha: new Date().toISOString() }]
  try {
    await $fetch('/api/admin/tareas', { method: 'PUT', body: { id: tarea.id, observaciones: obs } })
    tarea._nuevaObs = ''
    await cargarTareas()
  } catch (e) { alert(e?.data?.message || 'Error') }
}

async function eliminarObservacion(tarea, idx) {
  const obs = [...(tarea.observaciones || [])]
  obs.splice(idx, 1)
  try {
    await $fetch('/api/admin/tareas', { method: 'PUT', body: { id: tarea.id, observaciones: obs } })
    await cargarTareas()
  } catch (e) { alert(e?.data?.message || 'Error') }
}

function logout() {
  adminUsuario.value = null
  const token = useCookie('admin_token')
  token.value = null
  navigateTo('/admin/login')
}

onMounted(() => {
  cargarActualizaciones()
  cargarTareas()
})
</script>

<style scoped>
.sidebar {
  position: fixed; top: 0; left: 0; width: 240px; height: 100vh;
  background: #1a1a2e; color: white; padding: 1.5rem; display: flex; flex-direction: column;
}
.sidebar-brand { margin-bottom: 2rem; }
.sidebar-brand h2 { font-size: 1.3rem; margin: 0; }
.role-badge { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
.nav-link { color: #b2bec3; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
.nav-link:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-link.active { background: #00b894; color: white; font-weight: 600; }
.btn-logout { background: none; border: 1px solid rgba(255,255,255,0.2); color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }

.admin-content { margin-left: 240px; padding: 2rem; background: #f5f6fa; min-height: 100vh; }
.content-header { margin-bottom: 1.5rem; }
.content-header h1 { margin: 0; font-size: 1.5rem; color: #2d3436; }
.content-header p { margin: 0.25rem 0 0; color: #636e72; font-size: 0.9rem; }

.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0; }
.tab { background: none; border: none; padding: 0.75rem 1.25rem; font-size: 0.95rem; color: #636e72; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #00b894; border-bottom-color: #00b894; font-weight: 600; }
.tab:hover { color: #2d3436; }

.section-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-actions h2 { margin: 0; font-size: 1.15rem; color: #2d3436; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
.btn-primary:hover { background: #00a884; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.form-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-group { display: flex; flex-direction: column; flex: 1; min-width: 150px; }
.form-group.flex-2 { flex: 2; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.25rem; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select { padding: 0.5rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #00b894; }

.items-list { display: flex; flex-direction: column; gap: 0.75rem; }
.empty-state { text-align: center; color: #b2bec3; padding: 3rem; font-size: 0.95rem; }

.item-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1rem 1.25rem; }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.item-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; }
.badge-nuevo { background: #e3f2fd; color: #1565c0; }
.badge-mejora { background: #e8f5e9; color: #2e7d32; }
.badge-correccion { background: #fff3e0; color: #e65100; }
.badge-seguridad { background: #fce4ec; color: #c62828; }
.badge-rendimiento { background: #f3e5f5; color: #7b1fa2; }
.badge-version { background: #f5f5f5; color: #616161; }
.badge-success { background: #e8f5e9; color: #2e7d32; }
.badge-draft { background: #fff8e1; color: #f57f17; }
.badge-alta { background: #fce4ec; color: #c62828; }
.badge-media { background: #fff3e0; color: #e65100; }
.badge-baja { background: #e8f5e9; color: #2e7d32; }
.badge-estado-pendiente { background: #fff8e1; color: #f57f17; }
.badge-estado-en_progreso { background: #e3f2fd; color: #1565c0; }
.badge-estado-completada { background: #e8f5e9; color: #2e7d32; }
.badge-estado-cancelada { background: #f5f5f5; color: #9e9e9e; }
.badge-assignee { background: #e0f7fa; color: #00695c; }

.item-actions { display: flex; gap: 0.4rem; }
.btn-icon-sm { background: none; border: 1px solid #e0e0e0; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; color: #636e72; }
.btn-icon-sm:hover { background: #f5f5f5; }
.btn-icon-sm.danger { color: #d63031; border-color: #ffcdd2; }
.btn-icon-sm.danger:hover { background: #d63031; color: white; }
.btn-icon-sm.danger.tiny { padding: 0.15rem 0.35rem; font-size: 0.65rem; }

.item-card h3 { margin: 0 0 0.25rem; font-size: 1rem; color: #2d3436; }
.item-desc { margin: 0 0 0.5rem; font-size: 0.85rem; color: #636e72; line-height: 1.4; }
.item-meta { display: flex; gap: 1rem; font-size: 0.75rem; color: #b2bec3; }

/* Observaciones */
.observaciones-section { margin-top: 0.5rem; border-top: 1px solid #f0f0f0; padding-top: 0.5rem; }
.obs-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 0.8rem; color: #636e72; font-weight: 500; padding: 0.25rem 0; }
.obs-header:hover { color: #00b894; }
.obs-toggle { font-size: 0.7rem; }
.obs-body { margin-top: 0.5rem; }
.obs-empty { font-size: 0.8rem; color: #b2bec3; padding: 0.5rem; }
.obs-item { background: #f8f9fa; border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem; }
.obs-text { font-size: 0.85rem; color: #2d3436; }
.obs-meta { display: flex; gap: 0.75rem; font-size: 0.72rem; color: #b2bec3; margin-top: 0.25rem; align-items: center; }
.obs-add { display: flex; gap: 0.4rem; margin-top: 0.5rem; }
.obs-add input { flex: 1; padding: 0.4rem 0.6rem; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.85rem; }
.obs-add input:focus { outline: none; border-color: #00b894; }
.btn-sm { background: #00b894; color: white; border: none; padding: 0.4rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .form-row { flex-direction: column; }
}
</style>
