<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const admin = useCookie('admin_usuario')
const token = useCookie('admin_token')
const medicos = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const uploadingId = ref<string | null>(null)

onMounted(async () => {
  await loadMedicos()
})

async function loadMedicos() {
  loading.value = true
  try {
    const { data } = await useFetch('/api/admin/medicos', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    medicos.value = (data.value as any)?.medicos || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const filteredMedicos = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return medicos.value
  return medicos.value.filter(m => 
    `${m.nombre} ${m.apellido}`.toLowerCase().includes(q) ||
    m.cedula_profesional?.toLowerCase().includes(q)
  )
})

async function uploadPhoto(event: Event, medicoId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    alert('Solo se permiten archivos JPG, PNG o WebP')
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    alert('La imagen no puede superar 2MB')
    return
  }

  uploadingId.value = medicoId
  try {
    const formData = new FormData()
    formData.append('foto', file)
    formData.append('medico_id', medicoId)

    const response = await $fetch('/api/upload/foto-medico', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    })

    const data = response as any
    if (data.foto_url) {
      const idx = medicos.value.findIndex(m => m.id === medicoId)
      if (idx !== -1) {
        medicos.value[idx].foto_url = data.foto_url
      }
    }
  } catch (e: any) {
    alert(e.data?.message || 'Error al subir foto')
  } finally {
    uploadingId.value = null
    input.value = ''
  }
}

async function deletePhoto(medicoId: string) {
  if (!confirm('¿Eliminar la foto de este médico?')) return

  try {
    await $fetch('/api/upload/delete-foto', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { medico_id: medicoId },
    })
    const idx = medicos.value.findIndex(m => m.id === medicoId)
    if (idx !== -1) {
      medicos.value[idx].foto_url = null
    }
  } catch (e: any) {
    alert(e.data?.message || 'Error al eliminar foto')
  }
}

function cerrarSesion() {
  const t = useCookie('admin_token')
  const u = useCookie('admin_usuario')
  t.value = null; u.value = null
  navigateTo('/admin/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h2>MediProtect</h2>
        <span class="rol">{{ admin?.rol_nombre || admin?.rol || 'Admin' }}</span>
      </div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos" class="active">Médicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
      </nav>
      <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div>
          <h1>Gestión de Médicos</h1>
          <p>Administrar información y fotos de los médicos</p>
        </div>
      </header>

      <div class="search-bar">
        <input v-model="search" type="text" placeholder="Buscar por nombre o cédula..." />
      </div>

      <p v-if="loading" class="loading">Cargando médicos...</p>

      <div v-else class="medicos-grid">
        <div v-for="medico in filteredMedicos" :key="medico.id" class="medico-card">
          <div class="medico-photo">
            <img v-if="medico.foto_url" :src="medico.foto_url" :alt="`${medico.nombre} ${medico.apellido}`" />
            <div v-else class="photo-placeholder">
              <i class="fa-solid fa-user-doctor"></i>
            </div>
            <div class="photo-overlay">
              <label class="photo-btn" :class="{ uploading: uploadingId === medico.id }">
                <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPhoto($event, medico.id)" hidden />
                <i class="fa-solid fa-camera"></i>
                {{ uploadingId === medico.id ? 'Subiendo...' : 'Cambiar' }}
              </label>
              <button v-if="medico.foto_url" class="photo-btn delete" @click="deletePhoto(medico.id)">
                <i class="fa-solid fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
          <div class="medico-info">
            <h3>{{ medico.titulo }} {{ medico.nombre }} {{ medico.apellido }}</h3>
            <p class="especialidad">{{ medico.especialidad_nombre || 'Sin especialidad' }}</p>
            <p class="cedula">Cédula: {{ medico.cedula_profesional || 'N/A' }}</p>
            <p class="ciudad">{{ medico.consultorio_ciudad || 'Sin ubicación' }}</p>
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
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: 0.15s; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; }
.btn-logout:hover { border-color: #d63031; color: #d63031; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 2rem; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.search-bar { margin-bottom: 1.5rem; }
.search-bar input { width: 100%; max-width: 400px; padding: 0.75rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.search-bar input:focus { outline: none; border-color: #00b894; }
.medicos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.medico-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; transition: 0.2s; }
.medico-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.medico-photo { position: relative; width: 100%; height: 200px; background: #f5f6fa; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.medico-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { color: #b2bec3; }
.photo-placeholder i { font-size: 4rem; }
.photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; opacity: 0; transition: opacity 0.2s; }
.medico-card:hover .photo-overlay { opacity: 1; }
.photo-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: white; color: #2d3436; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 500; transition: 0.15s; }
.photo-btn:hover { background: #00b894; color: white; }
.photo-btn.uploading { background: #b2bec3; cursor: not-allowed; }
.photo-btn.delete { background: #d63031; color: white; }
.photo-btn.delete:hover { background: #c0392b; }
.medico-info { padding: 1rem; }
.medico-info h3 { margin: 0 0 0.25rem; font-size: 1rem; color: #2d3436; }
.medico-info .especialidad { margin: 0; font-size: 0.85rem; color: #0984e3; font-weight: 500; }
.medico-info .cedula { margin: 0.25rem 0 0; font-size: 0.8rem; color: #636e72; }
.medico-info .ciudad { margin: 0.15rem 0 0; font-size: 0.8rem; color: #636e72; }
</style>