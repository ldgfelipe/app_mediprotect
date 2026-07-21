<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')
const loading = ref(false)
const uploadingPhoto = ref(false)
const success = ref('')
const error = ref('')
const photoPreview = ref<string | null>(null)

const form = ref({
  nombre: usuario.value?.nombre || '',
  apellido: usuario.value?.apellido || '',
  telefono: usuario.value?.telefono || '',
  fecha_nacimiento: usuario.value?.fecha_nacimiento || '',
  genero: usuario.value?.genero || '',
  direccion: usuario.value?.direccion || '',
  cedula_profesional: usuario.value?.cedula_profesional || '',
  consultorio_direccion: usuario.value?.consultorio_direccion || '',
  consultorio_ciudad: usuario.value?.consultorio_ciudad || '',
  consultorio_estado: usuario.value?.consultorio_estado || '',
  bio: usuario.value?.bio || '',
})

const esMedico = computed(() => usuario.value?.tipo === 'medico')
const fotoUrl = computed(() => usuario.value?.foto_url || photoPreview.value)

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    const u = (data.value as any)?.usuario
    if (u) {
      form.value.nombre = u.nombre || ''
      form.value.apellido = u.apellido || ''
      form.value.telefono = u.telefono || ''
      form.value.fecha_nacimiento = u.fecha_nacimiento ? u.fecha_nacimiento.slice(0, 10) : ''
      form.value.genero = u.genero || ''
      form.value.direccion = u.direccion || ''
      if (esMedico.value) {
        form.value.cedula_profesional = u.cedula_profesional || ''
        form.value.consultorio_direccion = u.consultorio_direccion || ''
        form.value.consultorio_ciudad = u.consultorio_ciudad || ''
        form.value.consultorio_estado = u.consultorio_estado || ''
        form.value.bio = u.bio || ''
      }
    }
  } catch {}
})

async function guardar() {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const { data } = await useFetch('/api/auth/perfil', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: form.value,
    })
    const u = (data.value as any)?.usuario
    if (u) usuario.value = { ...usuario.value, ...u }
    success.value = 'Perfil actualizado correctamente'
  } catch (e: any) {
    error.value = e.message || 'Error al actualizar'
  } finally {
    loading.value = false
  }
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validar tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Solo se permiten archivos JPG, PNG o WebP'
    return
  }

  // Validar tamaño (2MB)
  if (file.size > 2 * 1024 * 1024) {
    error.value = 'La imagen no puede superar 2MB'
    return
  }

  error.value = ''
  uploadingPhoto.value = true

  // Preview local
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  try {
    const formData = new FormData()
    formData.append('foto', file)
    if (esMedico.value) {
      formData.append('medico_id', usuario.value.id)
    }

    const response = await $fetch('/api/upload/foto-medico', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    })

    const data = response as any
    if (data.foto_url) {
      usuario.value = { ...usuario.value, foto_url: data.foto_url }
      photoPreview.value = null
      success.value = 'Foto actualizada correctamente'
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Error al subir foto'
    photoPreview.value = null
  } finally {
    uploadingPhoto.value = false
    input.value = ''
  }
}

async function deletePhoto() {
  if (!confirm('¿Eliminar tu foto de perfil?')) return

  error.value = ''
  try {
    await $fetch('/api/upload/delete-foto', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { medico_id: usuario.value.id },
    })
    usuario.value = { ...usuario.value, foto_url: null }
    photoPreview.value = null
    success.value = 'Foto eliminada correctamente'
  } catch (e: any) {
    error.value = e.data?.message || 'Error al eliminar foto'
  }
}

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
          <NuxtLink :to="esMedico ? '/dashboard/medico' : '/dashboard/paciente'">Inicio</NuxtLink>
          <NuxtLink to="/perfil" class="router-link-active">Mi Perfil</NuxtLink>
        </nav>
        <div class="user-info">
          <span>{{ esMedico ? 'Dr. ' : '' }}{{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="dashboard-content">
      <h1>Mi Perfil</h1>
      <p class="subtitle">Actualiza tus datos personales</p>

      <div v-if="success" class="success-msg">{{ success }}</div>
      <div v-if="error" class="error-msg">{{ error }}</div>

      <div v-if="esMedico" class="photo-section">
        <h3>Foto de Perfil</h3>
        <div class="photo-container">
          <div class="photo-preview">
            <img v-if="fotoUrl" :src="fotoUrl" alt="Foto de perfil" />
            <div v-else class="photo-placeholder">
              <i class="fa-solid fa-user-doctor"></i>
              <span>Sin foto</span>
            </div>
          </div>
          <div class="photo-actions">
            <label class="btn-photo-upload" :class="{ disabled: uploadingPhoto }">
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPhoto" hidden />
              <i class="fa-solid fa-camera"></i>
              {{ uploadingPhoto ? 'Subiendo...' : 'Cambiar foto' }}
            </label>
            <button v-if="fotoUrl" type="button" class="btn-photo-delete" @click="deletePhoto">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
          <p class="photo-hint">JPG, PNG o WebP. Máximo 2MB. Mínimo 200x200px.</p>
        </div>
      </div>

      <form @submit.prevent="guardar" class="perfil-form">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input v-model="form.nombre" required />
          </div>
          <div class="form-group">
            <label>Apellido</label>
            <input v-model="form.apellido" required />
          </div>
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input v-model="form.telefono" type="tel" placeholder="+52 55 1234 5678" />
        </div>
        <template v-if="!esMedico">
          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Nacimiento</label>
              <input v-model="form.fecha_nacimiento" type="date" />
            </div>
            <div class="form-group">
              <label>Género</label>
              <select v-model="form.genero">
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Dirección</label>
            <textarea v-model="form.direccion" rows="2"></textarea>
          </div>
        </template>
        <template v-if="esMedico">
          <div class="form-group">
            <label>Cédula Profesional</label>
            <input v-model="form.cedula_profesional" placeholder="12345678" />
          </div>
          <div class="form-group">
            <label>Dirección del Consultorio</label>
            <input v-model="form.consultorio_direccion" placeholder="Calle, número, colonia" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ciudad</label>
              <input v-model="form.consultorio_ciudad" />
            </div>
            <div class="form-group">
              <label>Estado</label>
              <input v-model="form.consultorio_estado" />
            </div>
          </div>
          <div class="form-group">
            <label>Biografía / Descripción</label>
            <textarea v-model="form.bio" rows="3" placeholder="Tu experiencia, especialización, etc."></textarea>
          </div>
        </template>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; color: #636e72; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }
.perfil-form { max-width: 600px; display: flex; flex-direction: column; gap: 1.2rem; margin-top: 0.5rem; }
.success-msg { color: #00b894; background: #e6fcf5; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; border: 1px solid #b2dfdb; }
.photo-section { margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 12px; }
.photo-section h3 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #2d3436; }
.photo-container { display: flex; flex-direction: column; gap: 1rem; }
.photo-preview { width: 150px; height: 150px; border-radius: 50%; overflow: hidden; background: #e0e0e0; display: flex; align-items: center; justify-content: center; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #636e72; }
.photo-placeholder i { font-size: 3rem; }
.photo-actions { display: flex; gap: 1rem; }
.btn-photo-upload { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #0984e3; color: white; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; }
.btn-photo-upload:hover { background: #0773c5; }
.btn-photo-upload.disabled { background: #b2bec3; cursor: not-allowed; }
.btn-photo-delete { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: white; color: #d63031; border: 1px solid #d63031; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
.btn-photo-delete:hover { background: #d63031; color: white; }
.photo-hint { margin: 0; font-size: 0.8rem; color: #636e72; }
</style>
