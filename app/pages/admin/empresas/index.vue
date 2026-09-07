<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const adminToken = useCookie('admin_token')
const empresas = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const editando = ref<any>(null)
const form = ref({ nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '' })

const showPacientes = ref(false)
const empresaSeleccionada = ref<any>(null)
const pacientesEmpresa = ref<any[]>([])
const allPacientes = ref<any[]>([])
const searchPaciente = ref('')
const loadingPacientes = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const okMsg = ref('')

const search = ref('')
const filtered = computed(() => {
  if (!search.value) return empresas.value
  const s = search.value.toLowerCase()
  return empresas.value.filter(e =>
    e.nombre?.toLowerCase().includes(s) || e.rfc?.toLowerCase().includes(s) ||
    e.email?.toLowerCase().includes(s) || e.contacto_nombre?.toLowerCase().includes(s)
  )
})

const pacientesFiltrados = computed(() => {
  if (!searchPaciente.value) return allPacientes.value
  const s = searchPaciente.value.toLowerCase()
  return allPacientes.value.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)
  )
})

async function cargar() {
  const token = adminToken.value
  try {
    const data: any = await $fetch('/api/admin/empresas', { headers: { Authorization: 'Bearer ' + token } })
    empresas.value = data?.empresas || []
  } catch (e) { console.error(e) }
  loading.value = false
}
onMounted(cargar)

function abrirForm(e?: any) {
  errorMsg.value = ''; okMsg.value = ''
  if (e) { editando.value = e; form.value = { ...e } }
  else { editando.value = null; form.value = { nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '' } }
  showForm.value = true
}

async function guardar() {
  errorMsg.value = ''; okMsg.value = ''
  if (!form.value.nombre || !form.value.email) { errorMsg.value = 'Nombre y email son requeridos'; return }
  saving.value = true
  try {
    await $fetch('/api/admin/empresas', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body: form.value })
    okMsg.value = editando.value ? 'Empresa actualizada' : 'Empresa creada correctamente'
    showForm.value = false
    setTimeout(() => { okMsg.value = '' }, 3000)
    await cargar()
  } catch (e: any) { errorMsg.value = e.data?.message || 'Error al guardar' }
  finally { saving.value = false }
}

async function toggleEstado(e: any) {
  if (!confirm(`¿${e.activo ? 'Desactivar' : 'Activar'} empresa ${e.nombre}?`)) return
  try {
    await $fetch(`/api/admin/empresas/${e.id}`, { method: 'PUT', headers: { Authorization: 'Bearer ' + adminToken.value }, body: { activo: !e.activo } })
    await cargar()
  } catch (e: any) { alert(e.data?.message || 'Error') }
}

async function abrirPacientes(e: any) {
  empresaSeleccionada.value = e
  loadingPacientes.value = true
  showPacientes.value = true
  try {
    const [pacientesEmpresaData, allPacientesData]: any[] = await Promise.all([
      $fetch(`/api/admin/empresas/${e.id}/pacientes`, { headers: { Authorization: 'Bearer ' + adminToken.value } }),
      $fetch('/api/admin/pacientes', { headers: { Authorization: 'Bearer ' + adminToken.value } })
    ])
    pacientesEmpresa.value = pacientesEmpresaData?.pacientes || []
    allPacientes.value = allPacientesData?.pacientes || []
  } catch (err) { console.error(err) }
  loadingPacientes.value = false
}

async function asociarPaciente(pacienteId: string) {
  saving.value = true
  try {
    await $fetch(`/api/admin/empresas/${empresaSeleccionada.value.id}/pacientes`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body: { id_paciente: pacienteId }
    })
    await abrirPacientes(empresaSeleccionada.value)
  } catch (e: any) { alert(e.data?.message || 'Error') }
  saving.value = false
}

async function desasociarPaciente(pacienteId: string) {
  if (!confirm('¿Remover paciente de esta empresa?')) return
  try {
    await $fetch(`/api/admin/empresas/${empresaSeleccionada.value.id}/pacientes/${pacienteId}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + adminToken.value }
    })
    await abrirPacientes(empresaSeleccionada.value)
  } catch (e: any) { alert(e.data?.message || 'Error') }
}

const pacientesAsociados = computed(() => new Set(pacientesEmpresa.value.map((p: any) => p.id_paciente)))
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas" class="active">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/facturacion">Facturacion</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div><h1>Empresas</h1><p>Gestion de empresas afiliadas</p></div>
        <button @click="abrirForm()" class="btn-primary">+ Nueva Empresa</button>
      </header>

      <div v-if="okMsg" class="toast-success">{{ okMsg }}</div>
      <div v-if="errorMsg" class="toast-error">{{ errorMsg }}</div>

      <div class="search-box"><input v-model="search" placeholder="Buscar por nombre, RFC, email o contacto..." /></div>

      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead><tr><th>Nombre</th><th>RFC</th><th>Email</th><th>Contacto</th><th>Ciudad</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="e in filtered" :key="e.id">
              <td><strong>{{ e.nombre }}</strong></td>
              <td>{{ e.rfc || '—' }}</td>
              <td>{{ e.email }}</td>
              <td>{{ e.contacto_nombre || '—' }}</td>
              <td>{{ e.ciudad || '—' }}</td>
              <td><span class="badge" :class="e.activo ? 'activo' : 'inactivo'">{{ e.activo ? 'Activa' : 'Inactiva' }}</span></td>
              <td class="actions">
                <button class="btn-sm blue" @click="abrirPacientes(e)" title="Ver pacientes">Pacientes</button>
                <button class="btn-sm" @click="abrirForm(e)" title="Editar">Editar</button>
                <button :class="['btn-sm', e.activo ? 'red' : 'green']" @click="toggleEstado(e)">{{ e.activo ? 'Desactivar' : 'Activar' }}</button>
              </td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="7" class="empty">Sin resultados</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="showForm" class="modal-overlay">
        <div class="modal">
          <div class="modal-header"><h2>{{ editando ? 'Editar' : 'Nueva' }} Empresa</h2><button class="modal-close" @click="showForm = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-row"><div class="form-group"><label>Nombre *</label><input v-model="form.nombre" /></div><div class="form-group"><label>RFC</label><input v-model="form.rfc" /></div></div>
            <div class="form-row"><div class="form-group"><label>Email *</label><input v-model="form.email" type="email" /></div><div class="form-group"><label>Telefono</label><input v-model="form.telefono" /></div></div>
            <div class="form-group"><label>Contacto</label><input v-model="form.contacto_nombre" /></div>
            <div class="form-group"><label>Direccion</label><input v-model="form.direccion" /></div>
            <div class="form-row"><div class="form-group"><label>Ciudad</label><input v-model="form.ciudad" /></div><div class="form-group"><label>Estado</label><input v-model="form.estado" /></div></div>
            <div class="form-actions">
              <button class="btn-cancel" @click="showForm = false">Cancelar</button>
              <button class="btn-primary" @click="guardar" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showPacientes" class="modal-overlay">
        <div class="modal modal-wide">
          <div class="modal-header"><h2>Pacientes — {{ empresaSeleccionada?.nombre }}</h2><button class="modal-close" @click="showPacientes = false">&times;</button></div>
          <div class="modal-body">
            <p v-if="loadingPacientes" class="loading">Cargando...</p>
            <template v-else>
              <div class="section-label">Pacientes asignados ({{ pacientesEmpresa.length }})</div>
              <div v-if="pacientesEmpresa.length" class="pacientes-list">
                <div v-for="p in pacientesEmpresa" :key="p.id" class="paciente-row">
                  <div class="paciente-info">
                    <strong>{{ p.nombre }} {{ p.apellido }}</strong>
                    <span>{{ p.email }}</span>
                    <span>{{ p.telefono || '' }}</span>
                  </div>
                  <button class="btn-sm red" @click="desasociarPaciente(p.id_paciente)">Remover</button>
                </div>
              </div>
              <div v-else class="empty">No hay pacientes asignados a esta empresa</div>

              <div class="section-label" style="margin-top:1.5rem">Agregar paciente</div>
              <input v-model="searchPaciente" class="search-input" placeholder="Buscar paciente por nombre o email..." />
              <div class="pacientes-list">
                <div v-for="p in pacientesFiltrados.filter((p: any) => !pacientesAsociados.has(p.id))" :key="p.id" class="paciente-row">
                  <div class="paciente-info">
                    <strong>{{ p.nombre }} {{ p.apellido }}</strong>
                    <span>{{ p.email }}</span>
                  </div>
                  <button class="btn-sm green" @click="asociarPaciente(p.id)" :disabled="saving">Asociar</button>
                </div>
              </div>
            </template>
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
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 0; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.toast-success { background: #e8f5e9; color: #2e7d32; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem; }
.toast-error { background: #ffebee; color: #c62828; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem; }
.search-box { margin-bottom: 1rem; }
.search-box input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.badge.activo { background: #e8f5e9; color: #2e7d32; }
.badge.inactivo { background: #ffebee; color: #c62828; }
.actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.btn-sm { padding: 0.3rem 0.6rem; border: 1px solid #e0e0e0; background: white; border-radius: 4px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; }
.btn-sm.blue { border-color: #0984e3; color: #0984e3; }
.btn-sm.green { border-color: #00b894; color: #00b894; }
.btn-sm.red { border-color: #d63031; color: #d63031; }
.btn-sm:hover { opacity: 0.8; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
.modal.modal-wide { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.15rem; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-close:hover { color: #d63031; }
.modal-body { padding: 1.5rem; }
.form-row { display: flex; gap: 1rem; }
.form-row > .form-group { flex: 1; }
.form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.form-group input:focus { outline: none; border-color: #00b894; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.section-label { font-size: 0.85rem; font-weight: 600; color: #636e72; margin-bottom: 0.5rem; }
.search-input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; box-sizing: border-box; }
.pacientes-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 250px; overflow-y: auto; }
.paciente-row { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; border: 1px solid #f0f0f0; border-radius: 6px; }
.paciente-info { display: flex; flex-direction: column; gap: 0.1rem; }
.paciente-info strong { font-size: 0.9rem; }
.paciente-info span { font-size: 0.8rem; color: #636e72; }
.loading { text-align: center; color: #636e72; padding: 2rem; }
</style>
