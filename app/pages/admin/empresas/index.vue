<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const empresas = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const editando = ref<any>(null)
const form = ref({ nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '' })

async function cargar() {
  const { data } = await useFetch('/api/admin/empresas')
  empresas.value = (data.value as any)?.empresas || []
  loading.value = false
}
onMounted(cargar)

function abrirForm(e?: any) {
  if (e) { editando.value = e; form.value = { ...e } }
  else { editando.value = null; form.value = { nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '' } }
  showForm.value = true
}

async function guardar() {
  const { error: err } = await useFetch('/api/admin/empresas', {
    method: 'POST',
    body: form.value,
  })
  if (err.value) { alert(err.value.message); return }
  showForm.value = false
  await cargar()
}

async function toggleEstado(e: any) {
  if (!confirm(`¿${e.activo ? 'Desactivar' : 'Activar'} empresa ${e.nombre}?`)) return
  const { error: err } = await useFetch(`/api/admin/empresas/${e.id}`, {
    method: 'PUT',
    body: { activo: !e.activo },
  })
  if (err.value) { alert(err.value.message); return }
  await cargar()
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <h2>MediProtect</h2>
      <p class="rol">Admin</p>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Médicos</NuxtLink>
        <NuxtLink to="/admin/empresas" class="active">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
      </nav>
    </aside>
    <main class="admin-content">
      <header style="display:flex;justify-content:space-between;align-items:center">
        <div><h1>Empresas</h1><p>Gestión de empresas afiliadas</p></div>
        <button @click="abrirForm()" class="btn-primary">+ Nueva Empresa</button>
      </header>

      <div v-if="showForm" class="modal">
        <div class="modal-content">
          <h2>{{ editando ? 'Editar' : 'Nueva' }} Empresa</h2>
          <form @submit.prevent="guardar" class="empresa-form">
            <div class="form-row"><div class="form-group"><label>Nombre</label><input v-model="form.nombre" required /></div><div class="form-group"><label>RFC</label><input v-model="form.rfc" /></div></div>
            <div class="form-row"><div class="form-group"><label>Email</label><input v-model="form.email" type="email" required /></div><div class="form-group"><label>Teléfono</label><input v-model="form.telefono" /></div></div>
            <div class="form-group"><label>Contacto</label><input v-model="form.contacto_nombre" /></div>
            <div class="form-group"><label>Dirección</label><input v-model="form.direccion" /></div>
            <div class="form-row"><div class="form-group"><label>Ciudad</label><input v-model="form.ciudad" /></div><div class="form-group"><label>Estado</label><input v-model="form.estado" /></div></div>
            <div class="form-actions">
              <button type="submit" class="btn-primary">Guardar</button>
              <button type="button" @click="showForm=false" class="btn-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else>
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Estado</th><th>Activo</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="e in empresas" :key="e.id">
              <td>{{ e.nombre }}</td><td>{{ e.email }}</td><td>{{ e.telefono || '—' }}</td><td>{{ e.estado || '—' }}</td>
              <td>{{ e.activo ? '✓' : '✗' }}</td>
              <td><button @click="toggleEstado(e)" :class="e.activo ? 'btn-danger' : 'btn-success'">{{ e.activo ? 'Desactivar' : 'Activar' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; }
.sidebar h2 { font-size: 1.1rem; margin: 0 0 0.25rem; }
.sidebar .rol { font-size: 0.75rem; color: #b2bec3; margin-bottom: 2rem; }
.sidebar nav a { display: block; color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.admin-content { flex: 1; padding: 2rem; background: #f8f9fa; }
header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
header p { color: #636e72; font-size: 0.9rem; margin-bottom: 1.5rem; }
.loading { text-align: center; padding: 2rem; color: #636e72; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.btn-primary { padding: 0.5rem 1rem; background: #00b894; color: white; border: none; border-radius: 6px; cursor: pointer; }
.btn-danger { padding: 0.3rem 0.7rem; background: #d63031; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-success { padding: 0.3rem 0.7rem; background: #00b894; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal-content { background: white; padding: 2rem; border-radius: 12px; width: 500px; max-width: 90vw; }
.modal-content h2 { margin: 0 0 1rem; }
.empresa-form .form-row { display: flex; gap: 1rem; }
.empresa-form .form-group { flex: 1; margin-bottom: 0.75rem; }
.empresa-form label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #636e72; }
.empresa-form input { width: 100%; padding: 0.5rem 0.7rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box; }
.form-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
.btn-cancel { padding: 0.5rem 1rem; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; }
</style>
