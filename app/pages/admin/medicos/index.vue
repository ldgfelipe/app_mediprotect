<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const token = useCookie('admin_token')
const adminUsuario = useCookie('admin_usuario')
const medicos = ref<any[]>([])
const loading = ref(true)
const errorCargando = ref('')
const search = ref('')
const uploadingId = ref<string | null>(null)

const showModal = ref(false)
const savingNew = ref(false)
const formText = ref('')
const perfilUrl = ref('')
const importMode = ref<'url' | 'text'>('url')
const newMedico = ref({
  nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '',
  cedula_profesional: '', titulo: '', especialidad: '',
  ciudad: '', hospital_consultorio: '', rfc: '', tipo_consulta: '',
  bio: '', servicios: '', universidad: '', horario_atencion: '', idiomas: 'Espanol',
  precio_regular: '', precio_miembro: '', usuario: '', password: ''
})

const searchingAI = ref(false)
const aiResult = ref<any>(null)
const aiError = ref('')
const showAiPreview = ref(false)
const especialidades = ref<any[]>([])

const editando = ref(false)
const editSaving = ref(false)
const editForm = ref<any>({})
const editError = ref('')
const editOk = ref('')

onMounted(async () => {
  await loadMedicos()
  await loadEspecialidades()
})

async function loadMedicos() {
  loading.value = true
  errorCargando.value = ''
  try {
    const data: any = await $fetch('/api/admin/medicos', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    medicos.value = data?.medicos || []
  } catch (e: any) {
    errorCargando.value = e?.data?.message || e?.message || 'Error al cargar médicos'
    console.error(e)
  }
  finally { loading.value = false }
}

const filteredMedicos = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return medicos.value
  return medicos.value.filter(m =>
    `${m.nombre} ${m.apellido}`.toLowerCase().includes(q) ||
    m.cedula_profesional?.toLowerCase().includes(q) ||
    m.especialidad_nombre?.toLowerCase().includes(q)
  )
})

async function uploadPhoto(event: Event, medicoId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) { alert('Solo JPG, PNG o WebP'); return }
  if (file.size > 2 * 1024 * 1024) { alert('Maximo 2MB'); return }
  uploadingId.value = medicoId
  try {
    const formData = new FormData()
    formData.append('foto', file)
    formData.append('medico_id', medicoId)
    const response = await $fetch('/api/upload/foto-medico', {
      method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: formData,
    })
    const data = response as any
    if (data.foto_url) {
      const idx = medicos.value.findIndex(m => m.id === medicoId)
      if (idx !== -1) medicos.value[idx].foto_url = data.foto_url
    }
  } catch (e: any) { alert(e.data?.message || 'Error al subir foto') }
  finally { uploadingId.value = null; input.value = '' }
}

async function deletePhoto(medicoId: string) {
  if (!confirm('Eliminar la foto?')) return
  try {
    await $fetch('/api/upload/delete-foto', {
      method: 'POST', headers: { Authorization: `Bearer ${token.value}` },
      body: { medico_id: medicoId },
    })
    const idx = medicos.value.findIndex(m => m.id === medicoId)
    if (idx !== -1) medicos.value[idx].foto_url = null
  } catch (e: any) { alert(e.data?.message || 'Error') }
}

function cerrarSesion() {
  token.value = null
  adminUsuario.value = null
  return navigateTo('/admin/login')
}

async function loadEspecialidades() {
  try {
    const data: any = await $fetch('/api/especialidades')
    especialidades.value = data?.especialidades || []
  } catch (e) { console.error(e) }
}

function openNewModal() {
  newMedico.value = { nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '', cedula_profesional: '', titulo: '', especialidad: '', ciudad: '', hospital_consultorio: '', rfc: '', tipo_consulta: '', bio: '', servicios: '', universidad: '', horario_atencion: '', idiomas: 'Espanol', precio_regular: '', precio_miembro: '', usuario: '', password: '' }
  formText.value = ''; perfilUrl.value = ''; importMode.value = 'url'
  aiResult.value = null; aiError.value = ''; showAiPreview.value = false
  showModal.value = true
}

async function searchWithAI() {
  if (!formText.value || formText.value.trim().length < 20) { aiError.value = 'Pega la informacion completa del medico'; return }
  searchingAI.value = true; aiError.value = ''; aiResult.value = null
  try {
    const result = await $fetch('/api/ia/buscar-medico', { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { texto: formText.value } })
    const data = result as any
    if (data.success && data.perfil) { aiResult.value = data.perfil; showAiPreview.value = true }
    else { aiError.value = 'No se pudo extraer informacion' }
  } catch (err: any) { aiError.value = err.data?.message || err.message || 'Error' }
  finally { searchingAI.value = false }
}

async function importFromUrl() {
  if (!perfilUrl.value || !perfilUrl.value.includes('mediprotect.com.mx')) { aiError.value = 'URL invalida'; return }
  searchingAI.value = true; aiError.value = ''; aiResult.value = null
  try {
    const result = await $fetch('/api/ia/importar-perfil', { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { url: perfilUrl.value } })
    const data = result as any
    if (data.success && data.perfil) { aiResult.value = data.perfil; showAiPreview.value = true }
    else { aiError.value = 'No se pudo importar el perfil' }
  } catch (err: any) { aiError.value = err.data?.message || 'Error' }
  finally { searchingAI.value = false }
}

function applyAiData() {
  if (!aiResult.value) return
  const p = aiResult.value
  const nm = newMedico.value
  if (p.nombre) nm.nombre = p.nombre; if (p.apellido_paterno) nm.apellido_paterno = p.apellido_paterno
  if (p.apellido_materno) nm.apellido_materno = p.apellido_materno
  if (p.titulo) nm.titulo = p.titulo; if (p.cedula_profesional) nm.cedula_profesional = p.cedula_profesional
  if (p.email) nm.email = p.email; if (p.telefono) nm.telefono = p.telefono
  if (p.especialidad) nm.especialidad = p.especialidad; if (p.ciudad) nm.ciudad = p.ciudad
  if (p.hospital_consultorio) nm.hospital_consultorio = p.hospital_consultorio; if (p.bio) nm.bio = p.bio
  if (p.rfc) nm.rfc = p.rfc; if (p.tipo_consulta) nm.tipo_consulta = p.tipo_consulta
  if (p.universidad) nm.universidad = p.universidad
  if (p.horario_atencion) nm.horario_atencion = p.horario_atencion
  if (p.idiomas?.length) nm.idiomas = p.idiomas.join(', ')
  if (p.servicios?.length) nm.servicios = p.servicios.join(', ')
  showAiPreview.value = false
}

async function saveNewMedico() {
  if (!newMedico.value.nombre || !newMedico.value.apellido_paterno || !newMedico.value.especialidad) { alert('Nombre, apellido paterno y especialidad son requeridos'); return }
  savingNew.value = true
  try {
    const response = await $fetch('/api/admin/medicos', { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: newMedico.value })
    const data = response as any
    if (data.medico) { medicos.value.unshift(data.medico); showModal.value = false }
  } catch (err: any) { alert(err.data?.message || 'Error al guardar') }
  finally { savingNew.value = false }
}

function abrirEditar(m: any) {
  editForm.value = {
    id: m.id, nombre: m.nombre, apellido_paterno: m.apellido_paterno || m.apellido || '', apellido_materno: m.apellido_materno || '',
    email: m.email || '', telefono: m.telefono || '', cedula_profesional: m.cedula_profesional || '',
    titulo: m.titulo || '', especialidad: m.especialidad_nombre || '',
    consultorio_ciudad: m.consultorio_ciudad || '', bio: m.bio || '',
    activo: m.activo, password: '', usuario: m.usuario || '',
    precio_regular: m.precio_regular || '', precio_miembro: m.precio_miembro || '',
    rfc: m.rfc || '', hospital_consultorio: m.hospital_consultorio || '', tipo_consulta: m.tipo_consulta || ''
  }
  editError.value = ''; editOk.value = ''
  editando.value = true
}

function cerrarEditar() { editando.value = false; editError.value = ''; editOk.value = '' }

async function guardarEdicion() {
  editError.value = ''; editOk.value = ''
  if (!editForm.value.nombre || !editForm.value.apellido_paterno) { editError.value = 'Nombre y apellido paterno son requeridos'; return }
  editSaving.value = true
  try {
    const body: any = { ...editForm.value }
    if (!body.password) delete body.password
    delete body.id
    const data: any = await $fetch(`/api/admin/medicos/${editForm.value.id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token.value}` }, body
    })
    const idx = medicos.value.findIndex(m => m.id === editForm.value.id)
    if (idx !== -1) {
      medicos.value[idx] = data.medico
    }
    editOk.value = 'Medico actualizado'
    setTimeout(() => { editOk.value = ''; editando.value = false }, 1500)
  } catch (e: any) { editError.value = e.data?.message || 'Error al guardar' }
  finally { editSaving.value = false }
}

const viewMedico = ref<any>(null)
const showViewModal = ref(false)

async function abrirVer(medico: any) {
  try {
    const data: any = await $fetch(`/api/admin/medicos/${medico.id}`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    viewMedico.value = data.medico
    showViewModal.value = true
  } catch (e) { console.error(e) }
}

function cerrarVer() {
  showViewModal.value = false
  viewMedico.value = null
}

async function confirmarEliminar(medico: any) {
  if (!confirm(`¿Eliminar a ${medico.nombre} ${medico.apellido}? Esta acción no se puede deshacer.`)) return
  try {
    await $fetch(`/api/admin/medicos/${medico.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    medicos.value = medicos.value.filter(m => m.id !== medico.id)
  } catch (e: any) { alert(e.data?.message || 'Error al eliminar') }
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos" class="active">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/facturacion">Facturacion</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
      <button @click="cerrarSesion" class="btn-logout">Cerrar Sesion</button>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div><h1>Gestion de Medicos</h1><p>Administrar informacion, fotos y datos</p></div>
        <button class="btn-primary" @click="openNewModal">+ Nuevo Medico</button>
      </header>
      <div class="search-bar">
        <input v-model="search" type="text" placeholder="Buscar por nombre, cedula o especialidad..." />
        <span class="count">{{ filteredMedicos.length }} medicos</span>
      </div>
      <p v-if="loading" class="loading">Cargando medicos...</p>
      <p v-else-if="errorCargando" class="error-msg">{{ errorCargando }}</p>
      <div v-else class="medicos-grid">
        <div v-for="medico in filteredMedicos" :key="medico.id" class="medico-card">
          <div class="medico-photo">
            <img v-if="medico.foto_url" :src="medico.foto_url" :alt="`${medico.nombre} ${medico.apellido}`" />
            <div v-else class="photo-placeholder"><i class="fa-solid fa-user-doctor"></i></div>
            <div class="photo-overlay">
              <label class="photo-btn" :class="{ uploading: uploadingId === medico.id }">
                <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPhoto($event, medico.id)" hidden />
                <i class="fa-solid fa-camera"></i> {{ uploadingId === medico.id ? 'Subiendo...' : 'Cambiar' }}
              </label>
              <button v-if="medico.foto_url" class="photo-btn delete" @click="deletePhoto(medico.id)">
                <i class="fa-solid fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
            <div class="medico-info">
              <h3>{{ medico.titulo }} {{ medico.nombre }} {{ medico.apellido }}</h3>
              <p class="especialidad">{{ medico.especialidad_nombre || 'Sin especialidad' }}</p>
              <p class="cedula">Cedula: {{ medico.cedula_profesional || 'N/A' }}</p>
              <p class="ciudad">{{ medico.consultorio_ciudad || 'Sin ubicacion' }}</p>
              <div class="precio" v-if="medico.precio_regular || medico.precio_miembro">
                <strong>Precio:</strong> ${{ medico.precio_regular || 0 }} / ${{ medico.precio_miembro || 0 }} (miembro)
              </div>
              <div class="card-actions">
                <button class="btn-view" @click="abrirVer(medico)" title="Ver perfil completo">👁️ Ver</button>
                <button class="btn-edit" @click="abrirEditar(medico)">Editar</button>
                <button class="btn-delete" @click="confirmarEliminar(medico)" title="Eliminar medico">🗑️ Eliminar</button>
              </div>
            </div>
        </div>
      </div>

      <!-- Modal Nuevo Medico -->
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>Registrar Nuevo Medico</h2>
            <button class="modal-close" @click="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="ai-search-section">
              <div class="ai-search-header">
                <span class="ai-icon">🤖</span>
                <div><h4>Importar perfil del medico</h4><p>Desde mediprotect.com.mx o Google Form</p></div>
              </div>
              <div class="import-tabs">
                <button class="import-tab" :class="{ active: importMode === 'url' }" @click="importMode = 'url'">🔗 Desde mediprotect.com.mx</button>
                <button class="import-tab" :class="{ active: importMode === 'text' }" @click="importMode = 'text'">📋 Desde Google Form</button>
              </div>
              <div v-if="importMode === 'url'" class="import-section">
                <div class="url-input-group">
                  <input v-model="perfilUrl" type="url" class="url-input" placeholder="https://www.mediprotect.com.mx/perfil-dr-nombre" @keydown.enter="importFromUrl" />
                  <button class="btn-ai" @click="importFromUrl" :disabled="searchingAI || !perfilUrl">{{ searchingAI ? 'Importando...' : 'Importar' }}</button>
                </div>
              </div>
              <div v-if="importMode === 'text'" class="import-section">
                <textarea v-model="formText" class="ai-textarea" rows="6" placeholder="Pega informacion del medico..."></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:0.5rem">
                  <button class="btn-ai" @click="searchWithAI" :disabled="searchingAI || !formText">{{ searchingAI ? 'Procesando...' : 'Generar perfil' }}</button>
                </div>
              </div>
              <div v-if="aiError" class="ai-error">{{ aiError }}</div>
              <div v-if="showAiPreview && aiResult" class="ai-preview">
                <div class="ai-preview-header"><span>Datos importados</span></div>
                <div class="ai-preview-grid">
                  <div class="ai-field" v-if="aiResult.nombre"><label>Nombre</label><span>{{ aiResult.nombre }} {{ aiResult.apellido }}</span></div>
                  <div class="ai-field" v-if="aiResult.especialidad"><label>Especialidad</label><span>{{ aiResult.especialidad }}</span></div>
                  <div class="ai-field" v-if="aiResult.email"><label>Email</label><span>{{ aiResult.email }}</span></div>
                  <div class="ai-field" v-if="aiResult.cedula_profesional"><label>Cedula</label><span>{{ aiResult.cedula_profesional }}</span></div>
                </div>
                <div class="ai-preview-actions">
                  <button class="btn-cancel-sm" @click="showAiPreview = false">Cancelar</button>
                  <button class="btn-apply" @click="applyAiData">Usar estos datos</button>
                </div>
              </div>
            </div>
            <div class="form-divider"><span>o completa manualmente</span></div>
            <form @submit.prevent="saveNewMedico">
              <div class="form-row">
                <div class="form-group"><label>Nombre *</label><input v-model="newMedico.nombre" required /></div>
                <div class="form-group"><label>Apellido Paterno *</label><input v-model="newMedico.apellido_paterno" required /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Apellido Materno</label><input v-model="newMedico.apellido_materno" /></div>
                <div class="form-group"><label>RFC</label><input v-model="newMedico.rfc" placeholder="XXXX000000XXX" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Email</label><input v-model="newMedico.email" type="email" /></div>
                <div class="form-group"><label>Telefono</label><input v-model="newMedico.telefono" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Cedula Profesional</label><input v-model="newMedico.cedula_profesional" /></div>
                <div class="form-group"><label>Titulo</label><input v-model="newMedico.titulo" placeholder="Dr." /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Especialidad *</label>
                  <select v-model="newMedico.especialidad" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="e in especialidades" :key="e.id" :value="e.nombre">{{ e.nombre }}</option>
                  </select>
                </div>
                <div class="form-group"><label>Ciudad</label><input v-model="newMedico.ciudad" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Hospital o Consultorio</label><input v-model="newMedico.hospital_consultorio" placeholder="Ej: Hospital Angeles" /></div>
                <div class="form-group"><label>Tipo de Consulta</label>
                  <select v-model="newMedico.tipo_consulta">
                    <option value="">Seleccionar...</option>
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Precio Regular ($)</label><input v-model="newMedico.precio_regular" type="number" step="0.01" min="0" placeholder="Ej: 500" /></div>
                <div class="form-group"><label>Precio Miembro ($)</label><input v-model="newMedico.precio_miembro" type="number" step="0.01" min="0" placeholder="Ej: 400" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Usuario (para login como medico)</label><input v-model="newMedico.usuario" placeholder="Ej: dr.lopez" /></div>
                <div class="form-group"><label>Contrasena</label><input v-model="newMedico.password" type="password" placeholder="******" /></div>
              </div>
              <div class="form-group"><label>Biografia</label><textarea v-model="newMedico.bio" rows="3"></textarea></div>
              <div class="form-actions">
                <button type="button" class="btn-cancel-sm" @click="showModal = false">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="savingNew">{{ savingNew ? 'Guardando...' : 'Guardar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal Editar Medico -->
      <div class="modal-overlay" v-if="editando" @click.self="cerrarEditar">
        <div class="modal">
          <div class="modal-header">
            <h2>Editar Medico</h2>
            <button class="modal-close" @click="cerrarEditar">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="editError" class="msg-error">{{ editError }}</div>
            <div v-if="editOk" class="msg-ok">{{ editOk }}</div>
            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input v-model="editForm.nombre" /></div>
              <div class="form-group"><label>Apellido Paterno *</label><input v-model="editForm.apellido_paterno" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Apellido Materno</label><input v-model="editForm.apellido_materno" /></div>
              <div class="form-group"><label>RFC</label><input v-model="editForm.rfc" placeholder="XXXX000000XXX" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Email</label><input v-model="editForm.email" type="email" /></div>
              <div class="form-group"><label>Telefono</label><input v-model="editForm.telefono" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Cedula Profesional</label><input v-model="editForm.cedula_profesional" /></div>
              <div class="form-group"><label>Titulo</label><input v-model="editForm.titulo" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Especialidad</label>
                <select v-model="editForm.especialidad">
                  <option value="">---</option>
                  <option v-for="e in especialidades" :key="e.id" :value="e.nombre">{{ e.nombre }}</option>
                </select>
              </div>
              <div class="form-group"><label>Ciudad</label><input v-model="editForm.consultorio_ciudad" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Hospital o Consultorio</label><input v-model="editForm.hospital_consultorio" placeholder="Ej: Hospital Angeles" /></div>
              <div class="form-group"><label>Tipo de Consulta</label>
                <select v-model="editForm.tipo_consulta">
                  <option value="">Seleccionar...</option>
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Precio Regular ($)</label><input v-model="editForm.precio_regular" type="number" step="0.01" min="0" /></div>
              <div class="form-group"><label>Precio Miembro ($)</label><input v-model="editForm.precio_miembro" type="number" step="0.01" min="0" /></div>
            </div>
            <div class="form-group"><label>Biografia</label><textarea v-model="editForm.bio" rows="3"></textarea></div>
            <div class="form-group">
              <label>Activo</label>
              <select v-model="editForm.activo">
                <option :value="true">Si</option>
                <option :value="false">No</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Usuario (para login como medico)</label><input v-model="editForm.usuario" placeholder="Ej: dra.lopez" /></div>
              <div class="form-group"><label>Nueva contrasena (dejar vacio para no cambiar)</label><input v-model="editForm.password" type="password" placeholder="******" /></div>
            </div>
            <div class="form-actions">
              <button class="btn-cancel-sm" @click="cerrarEditar">Cancelar</button>
              <button class="btn-primary" @click="guardarEdicion" :disabled="editSaving">{{ editSaving ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Ver Perfil -->
      <div class="modal-overlay" v-if="showViewModal" @click.self="cerrarVer">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>Perfil Médico</h2>
            <button class="modal-close" @click="cerrarVer">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="viewMedico" class="perfil-view">
              <div class="perfil-header">
                <div class="perfil-foto">
                  <img v-if="viewMedico.foto_url" :src="viewMedico.foto_url" :alt="`${viewMedico.nombre} ${viewMedico.apellido}`" />
                  <div v-else class="foto-placeholder">👤</div>
                </div>
                <div>
                  <h3>{{ viewMedico.titulo }} {{ viewMedico.nombre }} {{ viewMedico.apellido_paterno || viewMedico.apellido }} {{ viewMedico.apellido_materno }}</h3>
                  <p class="especialidad">{{ viewMedico.especialidad_nombre || 'Sin especialidad' }}</p>
                  <p class="estado" :class="{ activo: viewMedico.activo, inactivo: !viewMedico.activo }">
                    {{ viewMedico.activo ? 'Activo' : 'Inactivo' }}
                  </p>
                </div>
              </div>

              <div class="perfil-grid">
                <div class="perfil-field"><label>Cédula Profesional</label><span>{{ viewMedico.cedula_profesional || 'N/A' }}</span></div>
                <div class="perfil-field"><label>RFC</label><span>{{ viewMedico.rfc || 'N/A' }}</span></div>
                <div class="perfil-field"><label>Email</label><span>{{ viewMedico.email || 'N/A' }}</span></div>
                <div class="perfil-field"><label>Teléfono</label><span>{{ viewMedico.telefono || 'N/A' }}</span></div>
                <div class="perfil-field"><label>Ciudad</label><span>{{ viewMedico.consultorio_ciudad || 'N/A' }}</span></div>
                <div class="perfil-field"><label>Hospital o Consultorio</label><span>{{ viewMedico.hospital_consultorio || 'N/A' }}</span></div>
                <div class="perfil-field"><label>Tipo de Consulta</label><span>{{ viewMedico.tipo_consulta || 'N/A' }}</span></div>
                <div class="perfil-field"><label>Precio Regular ($)</label><span>{{ viewMedico.precio_regular || 'No configurado' }}</span></div>
                <div class="perfil-field"><label>Precio Miembro ($)</label><span>{{ viewMedico.precio_miembro || 'No configurado' }}</span></div>
                <div class="perfil-field"><label>Citas Confirmadas</label><span>{{ viewMedico.citas_confirmadas || 0 }}</span></div>
                <div class="perfil-field"><label>Fecha Registro</label><span>{{ viewMedico.created_at ? new Date(viewMedico.created_at).toLocaleDateString('es-MX') : 'N/A' }}</span></div>
              </div>

              <div v-if="viewMedico.bio" class="perfil-bio">
                <label>Biografía</label>
                <p>{{ viewMedico.bio }}</p>
              </div>

              <div v-if="viewMedico.horario_atencion" class="perfil-bio">
                <label>Horario</label>
                <p>{{ viewMedico.horario_atencion }}</p>
              </div>

              <div class="modal-actions">
                <button class="btn-cancel-sm" @click="cerrarVer">Cerrar</button>
                <button class="btn-primary" @click="cerrarVer; abrirEditar(viewMedico)">Editar</button>
              </div>
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
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: 0.15s; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; }
.btn-logout:hover { border-color: #d63031; color: #d63031; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header { display: flex; justify-content: space-between; align-items: flex-start; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 0; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
      .error-msg { background: #ffebee; color: #c62828; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; text-align: center; }
.search-bar { margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; }
.search-bar input { flex: 1; max-width: 400px; padding: 0.75rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.count { font-size: 0.85rem; color: #636e72; white-space: nowrap; }
.medicos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.medico-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; transition: 0.2s; }
.medico-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.medico-photo { position: relative; width: 100%; height: 200px; background: #f5f6fa; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.medico-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { color: #b2bec3; font-size: 4rem; }
.photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; opacity: 0; transition: opacity 0.2s; }
.medico-card:hover .photo-overlay { opacity: 1; }
.photo-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: white; color: #2d3436; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 500; }
.photo-btn:hover { background: #00b894; color: white; }
.photo-btn.uploading { background: #b2bec3; cursor: not-allowed; }
.photo-btn.delete { background: #d63031; color: white; }
.medico-info { padding: 1rem; }
.medico-info h3 { margin: 0 0 0.25rem; font-size: 1rem; color: #2d3436; }
.medico-info .especialidad { margin: 0; font-size: 0.85rem; color: #0984e3; font-weight: 500; }
.medico-info .cedula { margin: 0.25rem 0 0; font-size: 0.8rem; color: #636e72; }
.medico-info .ciudad { margin: 0.15rem 0 0; font-size: 0.8rem; color: #636e72; }
.precio {
                margin: 0.3rem 0;
                font-size: 0.85rem;
                color: #636e72;
              }
              .precio strong {
                color: #2d3436;
              }
              .card-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.75rem;
              }
              .btn-view { background: #0984e3; color: white; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; text-decoration: none; display: inline-block; }
              .btn-view:hover { background: #0770c2; }
              .btn-edit { background: #00b894; color: white; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
              .btn-edit:hover { background: #00a884; }
              .btn-delete { background: #d63031; color: white; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
              .btn-delete:hover { background: #b31d1d; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; font-weight: 500; }
.btn-primary:hover:not(:disabled) { background: #00a884; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-sizing: border-box; }
.modal-lg { max-width: 720px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.2rem; color: #2d3436; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-close:hover { color: #d63031; }
.modal-body { padding: 1.5rem; }
.form-row { display: flex; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.form-group { display: flex; flex-direction: column; flex: 1 1 100%; margin-bottom: 0.75rem; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; font-family: inherit; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #00b894; }
.form-group textarea { resize: vertical; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.btn-cancel-sm { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.btn-cancel-sm:hover { background: #eee; }
.msg-error { background: #ffebee; color: #c62828; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.msg-ok { background: #e8f5e9; color: #2e7d32; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.ai-search-section { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; }
.ai-search-header { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1rem; }
.ai-icon { font-size: 1.8rem; }
.ai-search-header h4 { margin: 0; font-size: 0.95rem; }
.ai-search-header p { margin: 0.2rem 0 0; color: #636e72; font-size: 0.8rem; }
.import-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.import-tab { flex: 1; padding: 0.6rem; background: white; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
.import-tab.active { border-color: #6c5ce7; background: #f5f3ff; color: #6c5ce7; }
.import-section { margin-top: 0.5rem; }
.url-input-group { display: flex; gap: 0.5rem; }
.url-input { flex: 1; padding: 0.65rem 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; }
.url-input:focus { outline: none; border-color: #6c5ce7; }
.ai-textarea { width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; font-family: inherit; resize: vertical; min-height: 120px; }
.btn-ai { background: #6c5ce7; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
.btn-ai:hover:not(:disabled) { background: #5a4bd1; }
.btn-ai:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-error { background: #ffeaa7; color: #d63031; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-top: 0.75rem; }
.ai-preview { background: white; border: 1px solid #00b894; border-radius: 8px; margin-top: 1rem; overflow: hidden; }
.ai-preview-header { background: #f0fff4; padding: 0.6rem 1rem; border-bottom: 1px solid #00b894; font-size: 0.85rem; font-weight: 500; color: #00b894; }
.ai-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; padding: 1rem; }
.ai-field label { font-size: 0.75rem; color: #636e72; display: block; margin-bottom: 0.2rem; }
.ai-field span { font-size: 0.85rem; color: #2d3436; }
.ai-preview-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 0.75rem 1rem; border-top: 1px solid #f0f0f0; }
.btn-apply { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-apply:hover { background: #00a884; }
.form-divider { text-align: center; margin: 1rem 0; position: relative; }
.form-divider::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: #e0e0e0; }
.form-divider span { background: white; padding: 0 1rem; position: relative; color: #636e72; font-size: 0.8rem; }
@media (max-width: 640px) {
  .form-row > .form-group { flex: 1 1 100%; min-width: 0; }
  .modal { margin: 0.5rem; max-height: 95vh; }
  .modal-body { padding: 1rem; }
  .perfil-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .perfil-grid { grid-template-columns: 1fr; }
  .ai-preview-grid { grid-template-columns: 1fr; }
}

.perfil-view { padding: 0.5rem; }
.perfil-header { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; }
.perfil-foto { width: 100px; height: 100px; border-radius: 50%; overflow: hidden; background: #f5f6fa; display: flex; align-items: center; justify-content: center; }
.perfil-foto img { width: 100%; height: 100%; object-fit: cover; }
.foto-placeholder { font-size: 3rem; }
.perfil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
.perfil-field { display: flex; flex-direction: column; }
.perfil-field label { font-size: 0.75rem; color: #636e72; margin-bottom: 0.25rem; }
.perfil-field span { font-size: 0.9rem; color: #2d3436; }
.perfil-bio label { display: block; font-size: 0.75rem; color: #636e72; margin-bottom: 0.25rem; }
.perfil-bio p { font-size: 0.9rem; color: #2d3436; line-height: 1.4; }
.estado { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
.estado.activo { background: #e8f5e9; color: #2e7d32; }
.estado.inactivo { background: #ffebee; color: #c62828; }
</style>
