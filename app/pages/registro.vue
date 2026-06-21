<script setup lang="ts">
const tipo = ref('paciente')
const especialidades = ref<any[]>([])
const error = ref('')
const loading = ref(false)

const formPaciente = ref({ nombre: '', apellido: '', email: '', password: '', telefono: '', fecha_nacimiento: '', genero: '', direccion: '' })
const formMedico = ref({ nombre: '', apellido: '', email: '', password: '', telefono: '', cedula_profesional: '', id_especialidad: '', consultorio_direccion: '', consultorio_ciudad: '', consultorio_estado: '', bio: '' })

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/especialidades')
    especialidades.value = (data.value as any)?.especialidades || []
  } catch {}
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const endpoint = tipo.value === 'paciente' ? '/api/auth/registro-paciente' : '/api/auth/registro-medico'
    const body = tipo.value === 'paciente' ? formPaciente.value : formMedico.value
    const { data, error: err } = await useFetch(endpoint, { method: 'POST', body })
    if (err.value) throw new Error(err.value.message || 'Error al registrarse')

    const tokenCookie = useCookie('token')
    const usuarioCookie = useCookie('usuario')
    tokenCookie.value = (data.value as any).token
    usuarioCookie.value = (data.value as any).usuario

    navigateTo(tipo.value === 'medico' ? '/dashboard/medico' : '/dashboard/paciente')
  } catch (e: any) {
    error.value = e.message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>
        <h1>Crear tu Cuenta</h1>
        <p>Únete a MediProtect gratis</p>
      </div>
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="tipo-selector">
          <button type="button" :class="['tipo-btn', { active: tipo === 'paciente' }]" @click="tipo = 'paciente'">Soy Paciente</button>
          <button type="button" :class="['tipo-btn', { active: tipo === 'medico' }]" @click="tipo = 'medico'">Soy Médico</button>
        </div>

        <template v-if="tipo === 'paciente'">
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input v-model="formPaciente.nombre" type="text" placeholder="Juan" required /></div>
            <div class="form-group"><label>Apellido</label><input v-model="formPaciente.apellido" type="text" placeholder="Pérez" required /></div>
          </div>
          <div class="form-group"><label>Correo electrónico</label><input v-model="formPaciente.email" type="email" placeholder="correo@ejemplo.com" required /></div>
          <div class="form-group"><label>Contraseña</label><input v-model="formPaciente.password" type="password" placeholder="Mínimo 6 caracteres" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input v-model="formPaciente.telefono" type="tel" placeholder="2221234567" /></div>
            <div class="form-group"><label>Fecha de Nacimiento</label><input v-model="formPaciente.fecha_nacimiento" type="date" /></div>
          </div>
          <div class="form-group">
            <label>Género</label>
            <select v-model="formPaciente.genero">
              <option value="">Seleccionar...</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </template>

        <template v-else>
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input v-model="formMedico.nombre" type="text" placeholder="Dr. Juan" required /></div>
            <div class="form-group"><label>Apellido</label><input v-model="formMedico.apellido" type="text" placeholder="Pérez" required /></div>
          </div>
          <div class="form-group"><label>Correo electrónico</label><input v-model="formMedico.email" type="email" placeholder="correo@ejemplo.com" required /></div>
          <div class="form-group"><label>Contraseña</label><input v-model="formMedico.password" type="password" placeholder="Mínimo 6 caracteres" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input v-model="formMedico.telefono" type="tel" placeholder="2221234567" /></div>
            <div class="form-group"><label>Cédula Profesional</label><input v-model="formMedico.cedula_profesional" type="text" placeholder="12345678" /></div>
          </div>
          <div class="form-group">
            <label>Especialidad</label>
            <select v-model="formMedico.id_especialidad">
              <option value="">Seleccionar especialidad...</option>
              <option v-for="esp in especialidades" :key="esp.id" :value="esp.id">{{ esp.nombre }}</option>
            </select>
          </div>
          <div class="form-group"><label>Dirección del Consultorio</label><input v-model="formMedico.consultorio_direccion" type="text" placeholder="Calle, número, colonia" /></div>
          <div class="form-row">
            <div class="form-group"><label>Ciudad</label><input v-model="formMedico.consultorio_ciudad" type="text" placeholder="Puebla" /></div>
            <div class="form-group"><label>Estado</label><input v-model="formMedico.consultorio_estado" type="text" placeholder="Puebla" /></div>
          </div>
          <div class="form-group"><label>Sobre ti</label><textarea v-model="formMedico.bio" placeholder="Breve descripción profesional..." rows="3"></textarea></div>
        </template>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Registrando...' : 'Crear Cuenta Gratis' }}</button>
        <p class="auth-footer">¿Ya tienes cuenta? <NuxtLink to="/login">Inicia sesión</NuxtLink></p>
      </form>
    </div>
  </div>
</template>
