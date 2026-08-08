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
  apellido_paterno: usuario.value?.apellido_paterno || '',
  apellido_materno: usuario.value?.apellido_materno || '',
  telefono: usuario.value?.telefono || '',
  telefono2: usuario.value?.telefono2 || '',
  fecha_nacimiento: usuario.value?.fecha_nacimiento || '',
  genero: usuario.value?.genero || '',
  direccion: usuario.value?.direccion || '',
  ciudad: usuario.value?.ciudad || '',
  codigo_postal: usuario.value?.codigo_postal || '',
  estado: usuario.value?.estado || '',
  municipio: usuario.value?.municipio || '',
  cedula_profesional: usuario.value?.cedula_profesional || '',
  consultorio_direccion: usuario.value?.consultorio_direccion || '',
  consultorio_ciudad: usuario.value?.consultorio_ciudad || '',
  consultorio_estado: usuario.value?.consultorio_estado || '',
  bio: usuario.value?.bio || '',
  beneficiario_nombre: usuario.value?.beneficiario_nombre || '',
  beneficiario_parentesco: usuario.value?.beneficiario_parentesco || '',
  beneficiario_telefono: usuario.value?.beneficiario_telefono || '',
})

const beneficiarios = ref<any[]>([])
const nuevoBeneficiario = ref({ nombre: '', apellido_paterno: '', apellido_materno: '', parentesco: '', telefono: '' })

const estudios = ref<any[]>([])
const nuevoEstudio = ref({ titulo: '', institucion: '', anio: '', descripcion: '' })
const showFormEstudio = ref(false)

const esMedico = computed(() => usuario.value?.tipo === 'medico')
const esPaciente = computed(() => usuario.value?.tipo === 'paciente')
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
      form.value.apellido_paterno = u.apellido_paterno || ''
      form.value.apellido_materno = u.apellido_materno || ''
      form.value.telefono = u.telefono || ''
      form.value.telefono2 = u.telefono2 || ''
      form.value.fecha_nacimiento = u.fecha_nacimiento ? u.fecha_nacimiento.slice(0, 10) : ''
      form.value.genero = u.genero || ''
      form.value.direccion = u.direccion || ''
      form.value.ciudad = u.ciudad || ''
      form.value.codigo_postal = u.codigo_postal || ''
      form.value.estado = u.estado || ''
      form.value.municipio = u.municipio || ''
      form.value.beneficiario_nombre = u.beneficiario_nombre || ''
      form.value.beneficiario_parentesco = u.beneficiario_parentesco || ''
      form.value.beneficiario_telefono = u.beneficiario_telefono || ''
      if (u.beneficiarios) beneficiarios.value = u.beneficiarios
      if (esMedico.value) {
        form.value.cedula_profesional = u.cedula_profesional || ''
        form.value.consultorio_direccion = u.consultorio_direccion || ''
        form.value.consultorio_ciudad = u.consultorio_ciudad || ''
        form.value.consultorio_estado = u.consultorio_estado || ''
        form.value.bio = u.bio || ''
      }
      if (u.estudios) estudios.value = u.estudios
    }
  } catch {}
})

function agregarBeneficiario() {
  if (!nuevoBeneficiario.value.nombre) return
  beneficiarios.value.push({ ...nuevoBeneficiario.value })
  nuevoBeneficiario.value = { nombre: '', apellido_paterno: '', apellido_materno: '', parentesco: '', telefono: '' }
}

function eliminarBeneficiario(idx: number) {
  beneficiarios.value.splice(idx, 1)
}

async function guardar() {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const { data } = await useFetch('/api/auth/perfil', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { ...form.value, beneficiarios: beneficiarios.value },
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

async function guardarEstudio() {
  if (!nuevoEstudio.value.titulo) return
  error.value = ''
  try {
    const { data } = await useFetch('/api/auth/perfil', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { estudios: [...estudios.value, { ...nuevoEstudio.value, id: Date.now() }] },
    })
    const u = (data.value as any)?.usuario
    if (u?.estudios) {
      estudios.value = u.estudios
      usuario.value = { ...usuario.value, estudios: u.estudios }
    }
    nuevoEstudio.value = { titulo: '', institucion: '', anio: '', descripcion: '' }
    showFormEstudio.value = false
    success.value = 'Estudio agregado correctamente'
  } catch (e: any) {
    error.value = e.data?.message || 'Error al guardar estudio'
  }
}

async function eliminarEstudio(id: number) {
  if (!confirm('¿Eliminar este estudio?')) return
  const filtered = estudios.value.filter((e: any) => e.id !== id)
  try {
    const { data } = await useFetch('/api/auth/perfil', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { estudios: filtered },
    })
    const u = (data.value as any)?.usuario
    if (u?.estudios) {
      estudios.value = u.estudios
      usuario.value = { ...usuario.value, estudios: u.estudios }
    }
    success.value = 'Estudio eliminado'
  } catch (e: any) {
    error.value = e.data?.message || 'Error al eliminar'
  }
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) { error.value = 'Solo se permiten JPG, PNG o WebP'; return }
  if (file.size > 2 * 1024 * 1024) { error.value = 'La imagen no puede superar 2MB'; return }
  error.value = ''
  uploadingPhoto.value = true
  const reader = new FileReader()
  reader.onload = (e) => { photoPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
  try {
    const formData = new FormData()
    formData.append('foto', file)
    if (esMedico.value) formData.append('medico_id', usuario.value.id)
    const response = await $fetch('/api/upload/foto-medico', {
      method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: formData,
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
      method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { medico_id: usuario.value.id },
    })
    usuario.value = { ...usuario.value, foto_url: null }
    photoPreview.value = null
    success.value = 'Foto eliminada correctamente'
  } catch (e: any) { error.value = e.data?.message || 'Error al eliminar foto' }
}

function cerrarSesion() {
  token.value = null; usuario.value = null; navigateTo('/')
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
            <div v-else class="photo-placeholder"><span>Sin foto</span></div>
          </div>
          <div class="photo-actions">
            <label class="btn-photo-upload" :class="{ disabled: uploadingPhoto }">
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPhoto" hidden />
              {{ uploadingPhoto ? 'Subiendo...' : 'Cambiar foto' }}
            </label>
            <button v-if="fotoUrl" type="button" class="btn-photo-delete" @click="deletePhoto">Eliminar</button>
          </div>
          <p class="photo-hint">JPG, PNG o WebP. Maximo 2MB.</p>
        </div>
      </div>

      <form @submit.prevent="guardar" class="perfil-form">
        <div class="form-row">
          <div class="form-group"><label>Nombre</label><input v-model="form.nombre" required /></div>
          <div class="form-group"><label>Apellido paterno</label><input v-model="form.apellido_paterno" /></div>
          <div class="form-group"><label>Apellido materno</label><input v-model="form.apellido_materno" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Telefono</label><input v-model="form.telefono" type="tel" placeholder="+52 55 1234 5678" /></div>
          <div class="form-group"><label>Telefono 2</label><input v-model="form.telefono2" type="tel" placeholder="Opcional" /></div>
        </div>

        <template v-if="esPaciente">
          <div class="form-row">
            <div class="form-group"><label>Fecha de Nacimiento</label><input v-model="form.fecha_nacimiento" type="date" /></div>
            <div class="form-group">
              <label>Genero</label>
              <select v-model="form.genero"><option value="">Seleccionar</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option></select>
            </div>
          </div>
          <div class="form-group"><label>Direccion</label><textarea v-model="form.direccion" rows="2"></textarea></div>
          <div class="form-row">
            <div class="form-group"><label>Ciudad</label><input v-model="form.ciudad" /></div>
            <div class="form-group"><label>Municipio</label><input v-model="form.municipio" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Estado</label>
              <select v-model="form.estado">
                <option value="">Seleccionar...</option>
                <option value="Aguascalientes">Aguascalientes</option>
                <option value="Baja California">Baja California</option>
                <option value="Baja California Sur">Baja California Sur</option>
                <option value="Campeche">Campeche</option>
                <option value="Chiapas">Chiapas</option>
                <option value="Chihuahua">Chihuahua</option>
                <option value="Ciudad de México">Ciudad de México</option>
                <option value="Coahuila">Coahuila</option>
                <option value="Colima">Colima</option>
                <option value="Durango">Durango</option>
                <option value="Estado de México">Estado de México</option>
                <option value="Guanajuato">Guanajuato</option>
                <option value="Guerrero">Guerrero</option>
                <option value="Hidalgo">Hidalgo</option>
                <option value="Jalisco">Jalisco</option>
                <option value="Michoacán">Michoacán</option>
                <option value="Morelos">Morelos</option>
                <option value="Nayarit">Nayarit</option>
                <option value="Nuevo León">Nuevo León</option>
                <option value="Oaxaca">Oaxaca</option>
                <option value="Puebla">Puebla</option>
                <option value="Querétaro">Querétaro</option>
                <option value="Quintana Roo">Quintana Roo</option>
                <option value="San Luis Potosí">San Luis Potosí</option>
                <option value="Sinaloa">Sinaloa</option>
                <option value="Sonora">Sonora</option>
                <option value="Tabasco">Tabasco</option>
                <option value="Tamaulipas">Tamaulipas</option>
                <option value="Tlaxcala">Tlaxcala</option>
                <option value="Veracruz">Veracruz</option>
                <option value="Yucatán">Yucatán</option>
                <option value="Zacatecas">Zacatecas</option>
              </select>
            </div>
            <div class="form-group"><label>Codigo Postal</label><input v-model="form.codigo_postal" maxlength="5" /></div>
          </div>
        </template>

        <template v-if="esMedico">
          <div class="form-group"><label>Cedula Profesional</label><input v-model="form.cedula_profesional" /></div>
          <div class="form-group"><label>Direccion del Consultorio</label><input v-model="form.consultorio_direccion" /></div>
          <div class="form-row">
            <div class="form-group"><label>Ciudad</label><input v-model="form.consultorio_ciudad" /></div>
            <div class="form-group"><label>Estado</label><input v-model="form.consultorio_estado" /></div>
          </div>
          <div class="form-group"><label>Biografia</label><textarea v-model="form.bio" rows="3"></textarea></div>
        </template>

        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Guardando...' : 'Guardar Cambios' }}</button>
      </form>

      <div v-if="esPaciente" class="section-divider"></div>

      <div v-if="esPaciente" class="section-card">
        <div class="section-header">
          <h2>Beneficiario / Contacto de Emergencia</h2>
        </div>
        <div class="perfil-form">
          <div class="form-group"><label>Nombre del beneficiario</label><input v-model="form.beneficiario_nombre" placeholder="Nombre completo" /></div>
          <div class="form-row">
            <div class="form-group"><label>Parentesco</label>
              <select v-model="form.beneficiario_parentesco"><option value="">Seleccionar</option><option value="conyuge">Conyuge</option><option value="hijo">Hijo/a</option><option value="padre">Padre/Madre</option><option value="hermano">Hermano/a</option><option value="otro">Otro</option></select>
            </div>
            <div class="form-group"><label>Telefono del beneficiario</label><input v-model="form.beneficiario_telefono" type="tel" /></div>
          </div>
          <button type="button" class="btn-primary" @click="guardar" :disabled="loading">{{ loading ? 'Guardando...' : 'Guardar Beneficiario' }}</button>
        </div>
      </div>

      <div v-if="esPaciente" class="section-divider"></div>

      <div v-if="esPaciente" class="section-card">
        <div class="section-header">
          <h2>Beneficiarios Adicionales</h2>
        </div>
        <div class="perfil-form">
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input v-model="nuevoBeneficiario.nombre" placeholder="Nombre completo" /></div>
            <div class="form-group"><label>Apellido paterno</label><input v-model="nuevoBeneficiario.apellido_paterno" /></div>
            <div class="form-group"><label>Apellido materno</label><input v-model="nuevoBeneficiario.apellido_materno" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Parentesco</label><input v-model="nuevoBeneficiario.parentesco" placeholder="Ej: Hijo/a" /></div>
            <div class="form-group"><label>Telefono</label><input v-model="nuevoBeneficiario.telefono" type="tel" placeholder="2221234567" /></div>
          </div>
          <button type="button" class="btn-add" @click="agregarBeneficiario">+ Agregar Beneficiario</button>

          <div v-if="beneficiarios.length > 0" class="beneficiarios-list">
            <div v-for="(ben, idx) in beneficiarios" :key="idx" class="beneficiario-item">
              <div class="beneficiario-info">
                <strong>{{ ben.nombre }} {{ ben.apellido_paterno }} {{ ben.apellido_materno }}</strong>
                <span v-if="ben.parentesco">{{ ben.parentesco }}</span>
                <span v-if="ben.telefono">{{ ben.telefono }}</span>
              </div>
              <button class="btn-delete" @click="eliminarBeneficiario(idx)">Eliminar</button>
            </div>
          </div>
          <div v-else class="empty-state">No hay beneficiarios adicionales registrados</div>

          <button type="button" class="btn-primary" @click="guardar" :disabled="loading">{{ loading ? 'Guardando...' : 'Guardar Beneficiarios' }}</button>
        </div>
      </div>

      <div v-if="esPaciente" class="section-divider"></div>

      <div v-if="esPaciente" class="section-card">
        <div class="section-header">
          <h2>Estudios / Formacion</h2>
          <button class="btn-add" @click="showFormEstudio = !showFormEstudio">{{ showFormEstudio ? 'Cancelar' : '+ Agregar Estudio' }}</button>
        </div>

        <div v-if="showFormEstudio" class="study-form">
          <div class="form-row">
            <div class="form-group"><label>Titulo / Grado *</label><input v-model="nuevoEstudio.titulo" placeholder="Ej. Licenciatura en Medicina" /></div>
            <div class="form-group"><label>Institucion</label><input v-model="nuevoEstudio.institucion" placeholder="Ej. UNAM" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Anio</label><input v-model="nuevoEstudio.anio" placeholder="Ej. 2020" /></div>
            <div class="form-group"><label>Descripcion</label><input v-model="nuevoEstudio.descripcion" placeholder="Detalles adicionales" /></div>
          </div>
          <button class="btn-primary" @click="guardarEstudio">Guardar Estudio</button>
        </div>

        <div v-if="estudios.length > 0" class="studies-list">
          <div v-for="est in estudios" :key="est.id" class="study-item">
            <div class="study-info">
              <strong>{{ est.titulo }}</strong>
              <span v-if="est.institucion">{{ est.institucion }}</span>
              <span v-if="est.anio">{{ est.anio }}</span>
              <span v-if="est.descripcion">{{ est.descripcion }}</span>
            </div>
            <button class="btn-delete" @click="eliminarEstudio(est.id)">Eliminar</button>
          </div>
        </div>
        <div v-else class="empty-state">No hay estudios registrados</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.dashboard-header { background: white; padding: 0.8rem 2rem; border-bottom: 1px solid #e0e0e0; }
.dashboard-header-inner { display: flex; align-items: center; gap: 2rem; max-width: 1200px; margin: 0 auto; }
.user-info { margin-left: auto; display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; color: #636e72; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }
.dashboard-content { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
.dashboard-content h1 { color: #2d3436; margin-bottom: 0.25rem; }
.subtitle { color: #636e72; margin-bottom: 1.5rem; }
.success-msg { color: #00b894; background: #e6fcf5; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; border: 1px solid #b2dfdb; margin-bottom: 1rem; }
.error-msg { color: #c62828; background: #ffebee; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; border: 1px solid #ffcdd2; margin-bottom: 1rem; }
.perfil-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.form-group { display: flex; flex-direction: column; flex: 1 1 100%; }
.form-group label { font-size: 0.85rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select { padding: 0.6rem 0.8rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #00b894; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; margin-top: 0.5rem; align-self: flex-start; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.photo-section { margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 12px; }
.photo-section h3 { margin: 0 0 1rem; font-size: 1.1rem; }
.photo-container { display: flex; flex-direction: column; gap: 1rem; }
.photo-preview { width: 150px; height: 150px; border-radius: 50%; overflow: hidden; background: #e0e0e0; display: flex; align-items: center; justify-content: center; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { color: #636e72; }
.photo-actions { display: flex; gap: 1rem; }
.btn-photo-upload { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #0984e3; color: white; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.btn-photo-upload:hover { background: #0773c5; }
.btn-photo-upload.disabled { background: #b2bec3; cursor: not-allowed; }
.btn-photo-delete { padding: 0.6rem 1.2rem; background: white; color: #d63031; border: 1px solid #d63031; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.btn-photo-delete:hover { background: #d63031; color: white; }
.photo-hint { margin: 0; font-size: 0.8rem; color: #636e72; }
.section-divider { height: 1px; background: #e0e0e0; margin: 2rem 0; }
.section-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-header h2 { margin: 0; font-size: 1.15rem; color: #2d3436; }
.btn-add { background: none; border: 1px solid #00b894; color: #00b894; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-add:hover { background: #00b894; color: white; }
.study-form { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
.studies-list { display: flex; flex-direction: column; gap: 0.5rem; }
.study-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; }
.study-info { display: flex; flex-direction: column; gap: 0.15rem; }
.study-info strong { font-size: 0.95rem; }
.study-info span { font-size: 0.8rem; color: #636e72; }
.btn-delete { background: none; border: none; color: #d63031; cursor: pointer; font-size: 0.8rem; }
.btn-delete:hover { text-decoration: underline; }
.empty-state { text-align: center; color: #b2bec3; padding: 1.5rem; font-size: 0.9rem; }
.beneficiarios-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.8rem; }
.beneficiario-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; }
.beneficiario-info { display: flex; flex-direction: column; gap: 0.15rem; }
.beneficiario-info strong { font-size: 0.95rem; }
.beneficiario-info span { font-size: 0.8rem; color: #636e72; }
@media (max-width: 640px) {
  .form-row > .form-group { flex: 1 1 100%; min-width: 0; }
  .section-header { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
  .beneficiario-item { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .photo-container { flex-direction: column; align-items: flex-start; }
}
</style>
