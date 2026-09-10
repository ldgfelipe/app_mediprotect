<script setup>
definePageMeta({ layout: false })

const usuarios = ref([])
const roles = ref([])
const loading = ref(true)
const showModal = ref(false)
const editando = ref(null)
const form = reactive({ nombre: '', email: '', password: '', id_rol: '' })
const error = ref('')

onMounted(() => { cargar(); cargarRoles() })

async function cargar() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/usuarios', {
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    usuarios.value = data?.usuarios || []
  } catch (e) { console.error(e) }
  loading.value = false
}

async function cargarRoles() {
  try {
    const pool = await $fetch('/api/admin/roles', {
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    roles.value = pool?.roles || []
  } catch {
    roles.value = []
  }
}

function abrirCrear() {
  editando.value = null
  Object.assign(form, { nombre: '', email: '', password: '', id_rol: '' })
  error.value = ''
  showModal.value = true
}

function abrirEditar(u) {
  editando.value = u
  Object.assign(form, { nombre: u.nombre, email: u.email, password: '', id_rol: u.id_rol || '' })
  error.value = ''
  showModal.value = true
}

async function guardar() {
  error.value = ''
  try {
    if (editando.value) {
      const body = { nombre: form.nombre, email: form.email, id_rol: form.id_rol || null }
      if (form.password) body.password = form.password
      await $fetch(`/api/admin/usuarios/${editando.value.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${useCookie('admin_token').value}` },
        body
      })
    } else {
      if (!form.password) { error.value = 'La contraseña es requerida'; return }
      if (!form.id_rol) { error.value = 'Selecciona un rol'; return }
      await $fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { Authorization: `Bearer ${useCookie('admin_token').value}` },
        body: form
      })
    }
    showModal.value = false
    await cargar()
  } catch (e) { error.value = e.data?.message || 'Error al guardar' }
}

async function toggleActivo(u) {
  try {
    await $fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` },
      body: { activo: !u.activo }
    })
    await cargar()
  } catch (e) { alert(e.data?.message || 'Error') }
}
</script>

<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-inner">
        <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" />
        <nav>
          <NuxtLink to="/admin">Dashboard</NuxtLink>
          <NuxtLink to="/admin/citas">Citas</NuxtLink>
          <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
          <NuxtLink to="/admin/usuarios" class="active">Usuarios</NuxtLink>
          <NuxtLink to="/admin/medicos">Médicos</NuxtLink>
          <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        </nav>
        <div class="user-info">
          <button @click="$router.push('/admin')" class="btn-logout">Volver</button>
        </div>
      </div>
    </header>

    <main class="content">
      <div class="content-header">
        <h1>Gestión de Usuarios del Sistema</h1>
        <button @click="abrirCrear" class="btn-primary">+ Nuevo Usuario</button>
      </div>

      <div v-if="loading" class="loading">Cargando...</div>
      <div v-else-if="usuarios.length === 0" class="empty">No hay usuarios registrados.</div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td>{{ u.nombre }}</td>
            <td>{{ u.email }}</td>
            <td><span class="badge-role">{{ u.rol_nombre || '—' }}</span></td>
            <td>
              <span :class="u.activo ? 'badge-active' : 'badge-inactive'">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>{{ new Date(u.created_at).toLocaleDateString('es-MX') }}</td>
            <td class="actions">
              <button @click="abrirEditar(u)" class="btn-sm">Editar</button>
              <button @click="toggleActivo(u)" :class="u.activo ? 'btn-sm-danger' : 'btn-sm-success'">
                {{ u.activo ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button @click="showModal = false" class="close">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="error" class="error">{{ error }}</div>
          <input v-model="form.nombre" placeholder="Nombre completo" />
          <input v-model="form.email" type="email" placeholder="Email" :disabled="!!editando" />
          <input v-model="form.password" type="password" :placeholder="editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'" />
          <select v-model="form.id_rol">
            <option value="">Seleccionar rol...</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.nombre }}</option>
          </select>
          <button @click="guardar" class="btn-primary">{{ editando ? 'Guardar' : 'Crear' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { min-height: 100vh; background: #f0f2f5; }
.header { background: white; padding: 0.8rem 2rem; border-bottom: 1px solid #e0e0e0; }
.header-inner { display: flex; align-items: center; gap: 2rem; max-width: 1200px; margin: 0 auto; }
.logo { height: 35px; }
nav { display: flex; gap: 0.5rem; }
nav a { text-decoration: none; color: #636e72; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.9rem; }
nav a.active { background: #0984e3; color: white; }
.user-info { margin-left: auto; }

.content { max-width: 1200px; margin: 1.5rem auto; padding: 0 1rem; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h1 { font-size: 1.5rem; color: #2d3436; }

.table { width: 100%; background: white; border-radius: 10px; overflow: hidden; border-collapse: collapse; }
 th { background: #f8f9fa; padding: 0.8rem 1rem; text-align: left; font-size: 0.85rem; color: #636e72; }
td { padding: 0.8rem 1rem; border-bottom: 1px solid #f0f2f5; font-size: 0.9rem; }
.actions { display: flex; gap: 0.4rem; }
.btn-sm { padding: 0.3rem 0.6rem; border: 1px solid #dfe6e9; border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: white; }
.btn-sm-danger { padding: 0.3rem 0.6rem; border: 1px solid #d63031; border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: white; color: #d63031; }
.btn-sm-success { padding: 0.3rem 0.6rem; border: 1px solid #00b894; border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: white; color: #00b894; }
.badge-active { background: #d4edda; color: #155724; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; }
.badge-inactive { background: #f8d7da; color: #721c24; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; }
.badge-role { background: #e3f2fd; color: #1565c0; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 90%; max-width: 500px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
.modal-header h2 { font-size: 1.1rem; margin: 0; }
.close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
.modal-body input, .modal-body select { padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; }

.btn-primary { background: #0984e3; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-logout { background: none; border: 1px solid #dfe6e9; padding: 0.3rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.error { background: #ffeaa7; color: #d63031; padding: 0.6rem; border-radius: 6px; font-size: 0.85rem; }
.loading, .empty { text-align: center; padding: 2rem; color: #636e72; }
</style>
