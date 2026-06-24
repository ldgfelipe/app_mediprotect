<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')
const loading = ref(false)
const success = ref('')
const error = ref('')

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
</style>
