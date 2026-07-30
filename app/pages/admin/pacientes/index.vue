<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const pacientes = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const editando = ref(false)
const saving = ref(false)
const editForm = ref<any>({})
const errorMsg = ref('')
const okMsg = ref('')

onMounted(async () => {
  const { data } = await useFetch('/api/admin/pacientes')
  pacientes.value = (data.value as any)?.pacientes || []
  loading.value = false
})

const filtered = computed(() => {
  if (!search.value) return pacientes.value
  const s = search.value.toLowerCase()
  return pacientes.value.filter(p =>
    p.nombre?.toLowerCase().includes(s) ||
    p.apellido?.toLowerCase().includes(s) ||
    p.email?.toLowerCase().includes(s) ||
    p.telefono?.includes(s)
  )
})

function abrirEditar(p: any) {
  editForm.value = {
    id: p.id, nombre: p.nombre, apellido: p.apellido, email: p.email,
    telefono: p.telefono || '', fecha_nacimiento: p.fecha_nacimiento || '',
    genero: p.genero || '', ciudad: p.ciudad || '', password: ''
  }
  errorMsg.value = ''
  okMsg.value = ''
  editando.value = true
}

function cerrarModal() {
  editando.value = false
  errorMsg.value = ''
  okMsg.value = ''
}

async function guardar() {
  errorMsg.value = ''
  okMsg.value = ''
  if (!editForm.value.nombre || !editForm.value.email) {
    errorMsg.value = 'Nombre y email son requeridos'
    return
  }
  saving.value = true
  try {
    const token = useCookie('admin_token').value
    const body: any = { ...editForm.value }
    if (!body.password) delete body.password
    delete body.id
    await $fetch(`/api/admin/pacientes/${editForm.value.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body
    })
    const idx = pacientes.value.findIndex(p => p.id === editForm.value.id)
    if (idx !== -1) {
      pacientes.value[idx].nombre = editForm.value.nombre
      pacientes.value[idx].apellido = editForm.value.apellido
      pacientes.value[idx].email = editForm.value.email
      pacientes.value[idx].telefono = editForm.value.telefono
    }
    okMsg.value = 'Paciente actualizado correctamente'
    setTimeout(() => { okMsg.value = ''; editando.value = false }, 1500)
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes" class="active">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesion</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <h1>Pacientes</h1>
        <div class="search-bar">
          <input v-model="search" placeholder="Buscar por nombre, email o telefono..." />
          <span class="count">{{ filtered.length }} pacientes</span>
        </div>
      </header>
      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Telefono</th><th>Registro</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <td><strong>{{ p.nombre }} {{ p.apellido }}</strong></td>
              <td>{{ p.email }}</td><td>{{ p.telefono || '---' }}</td>
              <td>{{ new Date(p.created_at).toLocaleDateString('es-MX') }}</td>
              <td><button class="btn-edit" @click="abrirEditar(p)">Editar</button></td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="5" class="empty">Sin resultados</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="editando" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Editar Paciente</h2>
            <button class="modal-close" @click="cerrarModal">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="errorMsg" class="msg-error">{{ errorMsg }}</div>
            <div v-if="okMsg" class="msg-ok">{{ okMsg }}</div>

            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input v-model="editForm.nombre" /></div>
              <div class="form-group"><label>Apellido</label><input v-model="editForm.apellido" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Email *</label><input v-model="editForm.email" type="email" /></div>
              <div class="form-group"><label>Telefono</label><input v-model="editForm.telefono" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha nacimiento</label><input v-model="editForm.fecha_nacimiento" type="date" /></div>
              <div class="form-group">
                <label>Genero</label>
                <select v-model="editForm.genero">
                  <option value="">---</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Ciudad</label><input v-model="editForm.ciudad" /></div>
            <div class="form-group"><label>Nueva contrasena (dejar vacio para no cambiar)</label><input v-model="editForm.password" type="password" placeholder="******" /></div>

            <div class="form-actions">
              <button class="btn-cancel" @click="cerrarModal">Cancelar</button>
              <button class="btn-save" @click="guardar" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
            </div>
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
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; }
.content-header h1 { margin: 0 0 1rem; color: #2d3436; font-size: 1.5rem; }
.search-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
.search-bar input { flex: 1; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.count { font-size: 0.85rem; color: #636e72; white-space: nowrap; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.btn-edit { background: none; border: 1px solid #0984e3; color: #0984e3; padding: 0.3rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.btn-edit:hover { background: #0984e3; color: white; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.15rem; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-close:hover { color: #d63031; }
.modal-body { padding: 1.5rem; }
.form-row { display: flex; gap: 1rem; }
.form-row > .form-group { flex: 1; }
.form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group select { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #00b894; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.btn-cancel:hover { background: #eee; }
.btn-save { background: #00b894; color: white; border: none; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.btn-save:hover { background: #00a884; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.msg-error { background: #ffebee; color: #c62828; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.msg-ok { background: #e8f5e9; color: #2e7d32; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
</style>
