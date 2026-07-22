<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const admin = useCookie('admin_usuario')
const token = useCookie('admin_token')
const medicos = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const uploadingId = ref<string | null>(null)

// Modal de nuevo médico
const showModal = ref(false)
const savingNew = ref(false)
const newMedico = ref({
  nombre: '', apellido: '', email: '', telefono: '',
  cedula_profesional: '', titulo: '', especialidad: '',
  ciudad: '', hospital: '', bio: '', servicios: '',
  universidad: '', horario_atencion: '', idiomas: 'Español'
})

// Búsqueda IA
const searchingAI = ref(false)
const aiResult = ref<any>(null)
const aiError = ref('')
const showAiPreview = ref(false)

const especialidades = ref<any[]>([])

onMounted(async () => {
  await loadMedicos()
  await loadEspecialidades()
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

async function loadEspecialidades() {
  try {
    const { data } = await useFetch('/api/especialidades')
    especialidades.value = (data.value as any)?.especialidades || []
  } catch (e) {
    console.error(e)
  }
}

function openNewModal() {
  newMedico.value = {
    nombre: '', apellido: '', email: '', telefono: '',
    cedula_profesional: '', titulo: '', especialidad: '',
    ciudad: '', hospital: '', bio: '', servicios: '',
    universidad: '', horario_atencion: '', idiomas: 'Español'
  }
  aiResult.value = null
  aiError.value = ''
  showAiPreview.value = false
  showModal.value = true
}

async function searchWithAI() {
  const { nombre, especialidad } = newMedico.value
  if (!nombre || !especialidad) {
    aiError.value = 'Ingresa al menos el nombre y la especialidad del médico'
    return
  }

  searchingAI.value = true
  aiError.value = ''
  aiResult.value = null

  try {
    const result = await $fetch('/api/ia/buscar-medico', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: {
        nombre,
        cedula: newMedico.value.cedula_profesional,
        especialidad
      }
    })

    const data = result as any
    if (data.success && data.perfil) {
      aiResult.value = data.perfil
      showAiPreview.value = true
    } else {
      aiError.value = 'No se encontró información del médico'
    }
  } catch (err: any) {
    aiError.value = err.data?.message || err.message || 'Error al buscar información'
  } finally {
    searchingAI.value = false
  }
}

function applyAiData() {
  if (!aiResult.value) return
  const p = aiResult.value

  if (p.nombre) newMedico.value.nombre = p.nombre
  if (p.apellido) newMedico.value.apellido = p.apellido
  if (p.titulo) newMedico.value.titulo = p.titulo
  if (p.cedula_profesional) newMedico.value.cedula_profesional = p.cedula_profesional
  if (p.ciudad) newMedico.value.ciudad = p.ciudad
  if (p.hospital) newMedico.value.hospital = p.hospital
  if (p.bio) newMedico.value.bio = p.bio
  if (p.universidad) newMedico.value.universidad = p.universidad
  if (p.horario_atencion) newMedico.value.horario_atencion = p.horario_atencion
  if (p.idiomas && Array.isArray(p.idiomas)) newMedico.value.idiomas = p.idiomas.join(', ')
  if (p.servicios && Array.isArray(p.servicios)) newMedico.value.servicios = p.servicios.join(', ')

  showAiPreview.value = false
}

async function saveNewMedico() {
  if (!newMedico.value.nombre || !newMedico.value.apellido || !newMedico.value.especialidad) {
    alert('Nombre, apellido y especialidad son requeridos')
    return
  }

  savingNew.value = true
  try {
    const response = await $fetch('/api/admin/medicos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: newMedico.value
    })

    const data = response as any
    if (data.medico) {
      medicos.value.unshift(data.medico)
      showModal.value = false
    }
  } catch (err: any) {
    alert(err.data?.message || 'Error al guardar médico')
  } finally {
    savingNew.value = false
  }
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
        <button class="btn-primary" @click="openNewModal">+ Nuevo Médico</button>
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

      <!-- Modal Nuevo Médico -->
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h2>Registrar Nuevo Médico</h2>
            <button class="modal-close" @click="showModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Búsqueda IA -->
            <div class="ai-search-section">
              <div class="ai-search-header">
                <span class="ai-icon">🤖</span>
                <div>
                  <h4>Búsqueda con Inteligencia Artificial</h4>
                  <p>Ingresa el nombre y especialidad para buscar automáticamente la información del médico</p>
                </div>
              </div>

              <div class="ai-search-form">
                <input
                  v-model="newMedico.nombre"
                  type="text"
                  placeholder="Nombre del médico"
                  class="ai-input"
                >
                <input
                  v-model="newMedico.cedula_profesional"
                  type="text"
                  placeholder="Cédula (opcional)"
                  class="ai-input ai-input-sm"
                >
                <select v-model="newMedico.especialidad" class="ai-input ai-input-md">
                  <option value="">Especialidad</option>
                  <option v-for="e in especialidades" :key="e.id" :value="e.nombre">{{ e.nombre }}</option>
                </select>
                <button
                  class="btn-ai-search"
                  @click="searchWithAI"
                  :disabled="searchingAI || !newMedico.nombre || !newMedico.especialidad"
                >
                  {{ searchingAI ? '🔍 Buscando...' : '🔍 Buscar con IA' }}
                </button>
              </div>

              <div v-if="aiError" class="ai-error">{{ aiError }}</div>

              <!-- Preview de resultados IA -->
              <div v-if="showAiPreview && aiResult" class="ai-preview">
                <div class="ai-preview-header">
                  <span>📋 Información encontrada</span>
                  <span class="ai-provider">vía {{ aiResult.fuentes?.length ? 'IA' : 'base de datos' }}</span>
                </div>

                <div class="ai-preview-grid">
                  <div class="ai-field" v-if="aiResult.titulo">
                    <label>Título</label>
                    <span>{{ aiResult.titulo }}</span>
                  </div>
                  <div class="ai-field" v-if="aiResult.universidad">
                    <label>Universidad</label>
                    <span>{{ aiResult.universidad }}</span>
                  </div>
                  <div class="ai-field" v-if="aiResult.ciudad">
                    <label>Ciudad</label>
                    <span>{{ aiResult.ciudad }}</span>
                  </div>
                  <div class="ai-field" v-if="aiResult.hospital">
                    <label>Hospital</label>
                    <span>{{ aiResult.hospital }}</span>
                  </div>
                  <div class="ai-field full" v-if="aiResult.bio">
                    <label>Biografía</label>
                    <span class="bio-text">{{ aiResult.bio }}</span>
                  </div>
                  <div class="ai-field full" v-if="aiResult.servicios?.length">
                    <label>Servicios</label>
                    <span>{{ aiResult.servicios.join(', ') }}</span>
                  </div>
                  <div class="ai-field" v-if="aiResult.idiomas?.length">
                    <label>Idiomas</label>
                    <span>{{ aiResult.idiomas.join(', ') }}</span>
                  </div>
                  <div class="ai-field" v-if="aiResult.horario_atencion">
                    <label>Horario</label>
                    <span>{{ aiResult.horario_atencion }}</span>
                  </div>
                  <div class="ai-field full" v-if="aiResult.formacion_academica?.length">
                    <label>Formación Académica</label>
                    <div v-for="(f, i) in aiResult.formacion_academica" :key="i" class="formacion-item">
                      {{ f.titulo }} - {{ f.institucion }} ({{ f.anio }})
                    </div>
                  </div>
                  <div class="ai-field full" v-if="aiResult.certificaciones?.length">
                    <label>Certificaciones</label>
                    <span>{{ aiResult.certificaciones.join(', ') }}</span>
                  </div>
                </div>

                <div class="ai-preview-actions">
                  <button class="btn-cancel" @click="showAiPreview = false">Cancelar</button>
                  <button class="btn-ai-apply" @click="applyAiData">✅ Usar estos datos</button>
                </div>
              </div>
            </div>

            <!-- Formulario manual -->
            <div class="form-divider">
              <span>o completa los datos manualmente</span>
            </div>

            <form @submit.prevent="saveNewMedico">
              <div class="form-row">
                <div class="form-group">
                  <label>Nombre *</label>
                  <input v-model="newMedico.nombre" required>
                </div>
                <div class="form-group">
                  <label>Apellido *</label>
                  <input v-model="newMedico.apellido" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input v-model="newMedico.email" type="email">
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input v-model="newMedico.telefono">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Cédula Profesional</label>
                  <input v-model="newMedico.cedula_profesional">
                </div>
                <div class="form-group">
                  <label>Título</label>
                  <input v-model="newMedico.titulo" placeholder="Ej: Médico Cirujano">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Especialidad *</label>
                  <select v-model="newMedico.especialidad" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="e in especialidades" :key="e.id" :value="e.nombre">{{ e.nombre }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Ciudad</label>
                  <input v-model="newMedico.ciudad" placeholder="Ej: Puebla">
                </div>
              </div>

              <div class="form-group">
                <label>Hospital / Clínica</label>
                <input v-model="newMedico.hospital">
              </div>

              <div class="form-group">
                <label>Universidad</label>
                <input v-model="newMedico.universidad">
              </div>

              <div class="form-group">
                <label>Biografía</label>
                <textarea v-model="newMedico.bio" rows="3"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Servicios (separados por coma)</label>
                  <input v-model="newMedico.servicios">
                </div>
                <div class="form-group">
                  <label>Idiomas</label>
                  <input v-model="newMedico.idiomas">
                </div>
              </div>

              <div class="form-group">
                <label>Horario de Atención</label>
                <input v-model="newMedico.horario_atencion" placeholder="Ej: Lun-Vie 9:00-18:00">
              </div>

              <div class="form-actions">
                <button type="button" class="btn-cancel" @click="showModal = false">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="savingNew">
                  {{ savingNew ? 'Guardando...' : 'Guardar Médico' }}
                </button>
              </div>
            </form>
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
.content-header { display: flex; justify-content: space-between; align-items: flex-start; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 0; }
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

/* Botón primario */
.btn-primary { background: #00b894; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; font-weight: 500; }
.btn-primary:hover:not(:disabled) { background: #00a884; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 90vh; overflow-y: auto; }
.modal-lg { max-width: 720px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #2d3436; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; padding: 0.25rem; }
.modal-close:hover { color: #d63031; }
.modal-body { padding: 1.5rem; }

/* AI Search Section */
.ai-search-section { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; }
.ai-search-header { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1rem; }
.ai-icon { font-size: 1.8rem; }
.ai-search-header h4 { margin: 0; color: #2d3436; font-size: 0.95rem; }
.ai-search-header p { margin: 0.2rem 0 0; color: #636e72; font-size: 0.8rem; }
.ai-search-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.ai-input { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; font-family: inherit; }
.ai-input:focus { outline: none; border-color: #00b894; }
.ai-input-sm { max-width: 160px; }
.ai-input-md { max-width: 200px; }
.btn-ai-search { background: #6c5ce7; color: white; border: none; padding: 0.55rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500; white-space: nowrap; }
.btn-ai-search:hover:not(:disabled) { background: #5a4bd1; }
.btn-ai-search:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-error { background: #ffeaa7; color: #d63031; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-top: 0.75rem; }

/* AI Preview */
.ai-preview { background: white; border: 1px solid #00b894; border-radius: 8px; margin-top: 1rem; overflow: hidden; }
.ai-preview-header { display: flex; justify-content: space-between; align-items: center; background: #f0fff4; padding: 0.6rem 1rem; border-bottom: 1px solid #00b894; font-size: 0.85rem; font-weight: 500; color: #00b894; }
.ai-provider { font-size: 0.75rem; color: #636e72; font-weight: 400; }
.ai-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; padding: 1rem; }
.ai-field { display: flex; flex-direction: column; }
.ai-field.full { grid-column: 1 / -1; }
.ai-field label { font-size: 0.75rem; color: #636e72; margin-bottom: 0.2rem; text-transform: uppercase; letter-spacing: 0.3px; }
.ai-field span { font-size: 0.85rem; color: #2d3436; }
.bio-text { white-space: pre-line; line-height: 1.4; }
.formacion-item { font-size: 0.8rem; color: #2d3436; padding: 0.2rem 0; }
.ai-preview-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 0.75rem 1rem; border-top: 1px solid #f0f0f0; }
.btn-ai-apply { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
.btn-ai-apply:hover { background: #00a884; }

/* Form Divider */
.form-divider { text-align: center; margin: 1rem 0; position: relative; }
.form-divider::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: #e0e0e0; }
.form-divider span { background: white; padding: 0 1rem; position: relative; color: #636e72; font-size: 0.8rem; }

/* Form */
.form-row { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
.form-group { display: flex; flex-direction: column; flex: 1; margin-bottom: 0.75rem; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea {
  padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; font-family: inherit;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #00b894; }
.form-group textarea { resize: vertical; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.btn-cancel:hover { background: #eee; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .ai-search-form { flex-direction: column; }
  .ai-input-sm, .ai-input-md { max-width: 100%; }
  .ai-preview-grid { grid-template-columns: 1fr; }
  .form-row { flex-direction: column; }
  .content-header { flex-direction: column; gap: 1rem; }
}
</style>