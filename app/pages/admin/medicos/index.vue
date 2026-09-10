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
  precio_regular: '', precio_miembro: '', usuario: '', password: '',
  curp: '', codigo_postal: '', colonia: '', consultorio_estado: '', comision_tipo: 1
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
  newMedico.value = { nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '', cedula_profesional: '', titulo: '', especialidad: '', ciudad: '', hospital_consultorio: '', rfc: '', tipo_consulta: '', bio: '', servicios: '', universidad: '', horario_atencion: '', idiomas: 'Espanol', precio_regular: '', precio_miembro: '', usuario: '', password: '', curp: '', codigo_postal: '', colonia: '', consultorio_estado: '', comision_tipo: 1 }
  formText.value = ''; perfilUrl.value = ''; importMode.value = 'url'
  aiResult.value = null; aiError.value = ''; showAiPreview.value = false
  curpErrorNuevo.value = ''
  curpDatosNuevo.value = null
  coloniasNuevo.value = []
  cpNuevoError.value = ''
  cpNuevoResult.value = null
  coloniaSelNuevo.value = ''
  if (cpNuevoTimeout) { clearTimeout(cpNuevoTimeout); cpNuevoTimeout = null }
  consultoriosNuevo.value = []
  resetConsultorioForm()
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
    if (data.medico) {
      for (const c of consultoriosNuevo.value) {
        try {
          await $fetch('/api/admin/consultorios', { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { ...c, id_medico: data.medico.id } })
        } catch {}
      }
      medicos.value.unshift(data.medico); showModal.value = false
    }
  } catch (err: any) { alert(err.data?.message || 'Error al guardar') }
  finally { savingNew.value = false }
}

// ========== CURP VALIDATION (NUEVO) ==========
const curpValidandoNuevo = ref(false)
const curpErrorNuevo = ref('')
const curpDatosNuevo = ref<any>(null)

async function validarCURPNuevo() {
  curpErrorNuevo.value = ''
  curpDatosNuevo.value = null
  const curp = (newMedico.value.curp || '').toUpperCase().trim()
  if (!curp || curp.length !== 18) { curpErrorNuevo.value = 'La CURP debe tener 18 caracteres'; return }
  curpValidandoNuevo.value = true
  try {
    const data: any = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) { curpErrorNuevo.value = data.error_msg || 'No se pudieron obtener datos'; return }
    curpDatosNuevo.value = data.response
    const s = data.response?.Solicitante || {}
    newMedico.value.nombre = s.Nombres || newMedico.value.nombre
    newMedico.value.apellido_paterno = s.ApellidoPaterno || newMedico.value.apellido_paterno
    newMedico.value.apellido_materno = s.ApellidoMaterno || newMedico.value.apellido_materno
    if (s.FechaNacimiento) {
      const parts = s.FechaNacimiento.split('/')
      if (parts.length === 3) newMedico.value.fecha_nacimiento = `${parts[2]}-${parts[1]}-${parts[0]}`
    }
  } catch (e: any) {
    curpErrorNuevo.value = e?.data?.message || e?.message || 'Error al validar CURP'
  }
  curpValidandoNuevo.value = false
}

// ========== CODIGO POSTAL / COLONIAS (NUEVO) ==========
const coloniasNuevo = ref<any[]>([])
const cpNuevoLoading = ref(false)
const cpNuevoError = ref('')
const cpNuevoResult = ref<any>(null)
const coloniaSelNuevo = ref('')
let cpNuevoTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => newMedico.value.codigo_postal, (val) => {
  if (cpNuevoTimeout) clearTimeout(cpNuevoTimeout)
  cpNuevoTimeout = setTimeout(() => buscarColoniasNuevo(), 400)
})

async function buscarColoniasNuevo() {
  const cp = (newMedico.value.codigo_postal || '').replace(/[^0-9]/g, '')
  if (!cp || cp.length !== 5) {
    coloniasNuevo.value = []
    cpNuevoResult.value = null
    cpNuevoError.value = ''
    return
  }
  cpNuevoLoading.value = true
  cpNuevoError.value = ''
  cpNuevoResult.value = null
  try {
    const data: any = await $fetch('/api/sepomex/colonias', { params: { codigo_postal: cp } })
    if (data?.colonias && data.colonias.length > 0) {
      coloniasNuevo.value = data.colonias
      cpNuevoResult.value = {
        municipios: data.municipio || data.colonias[0]?.municipio,
        ciudades: data.ciudad || data.colonias[0]?.ciudad,
        estados: data.estado || data.colonias[0]?.estado,
      }
    } else {
      coloniasNuevo.value = []
      cpNuevoResult.value = null
      cpNuevoError.value = 'No se encontraron colonias para este código postal'
    }
  } catch (e: any) {
    coloniasNuevo.value = []
    cpNuevoResult.value = null
    cpNuevoError.value = e?.data?.message || 'Error al consultar colonias'
  } finally {
    cpNuevoLoading.value = false
  }
}

function seleccionarColoniaNuevo() {
  const colonia = coloniaSelNuevo.value
  if (!colonia) return
  const selected = coloniasNuevo.value.find(c => c.colonia === colonia)
  if (selected) {
    newMedico.value.colonia = selected.colonia || ''
    newMedico.value.ciudad = selected.ciudad || newMedico.value.ciudad
    newMedico.value.consultorio_estado = selected.estado || ''
  }
}

function abrirEditar(m: any) {
  editForm.value = {
    id: m.id, nombre: m.nombre, apellido_paterno: m.apellido_paterno || m.apellido || '', apellido_materno: m.apellido_materno || '',
    email: m.email || '', telefono: m.telefono || '', cedula_profesional: m.cedula_profesional || '',
    titulo: m.titulo || '', especialidad: m.especialidad_nombre || '',
    consultorio_ciudad: m.consultorio_ciudad || '', bio: m.bio || '',
    activo: m.activo, password: '', usuario: m.usuario || '',
    precio_regular: m.precio_regular || '', precio_miembro: m.precio_miembro || '',
    rfc: m.rfc || '', hospital_consultorio: m.hospital_consultorio || '', tipo_consulta: m.tipo_consulta || '',
    curp: m.curp || '', codigo_postal: m.codigo_postal || '', colonia: m.colonia || '',
    consultorio_estado: m.consultorio_estado || '', consultorio_direccion: m.consultorio_direccion || '',
    comision_tipo: m.comision_tipo || 1
  }
  editPhoto.value = null
  editPhotoPreview.value = m.foto_url || ''
  editPhotoError.value = ''
  editPhotoOk.value = ''
  editError.value = ''; editOk.value = ''
  curpErrorEdit.value = ''
  curpDatosEdit.value = null
  coloniasEdit.value = []
  cpEditError.value = ''
  cpEditResult.value = null
  coloniaSelEdit.value = ''
  editando.value = true
  cargarConsultorios(m.id)
  resetConsultorioForm()
}

function cerrarEditar() {
  editando.value = false; editError.value = ''; editOk.value = ''
  if (cpEditTimeout) { clearTimeout(cpEditTimeout); cpEditTimeout = null }
}

// ========== CURP VALIDATION (EDITAR) ==========
const curpValidandoEdit = ref(false)
const curpErrorEdit = ref('')
const curpDatosEdit = ref<any>(null)

async function validarCURPEdit() {
  curpErrorEdit.value = ''
  curpDatosEdit.value = null
  const curp = (editForm.value.curp || '').toUpperCase().trim()
  if (!curp || curp.length !== 18) { curpErrorEdit.value = 'La CURP debe tener 18 caracteres'; return }
  curpValidandoEdit.value = true
  try {
    const data: any = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) { curpErrorEdit.value = data.error_msg || 'No se pudieron obtener datos'; return }
    curpDatosEdit.value = data.response
    const s = data.response?.Solicitante || {}
    editForm.value.nombre = s.Nombres || editForm.value.nombre
    editForm.value.apellido_paterno = s.ApellidoPaterno || editForm.value.apellido_paterno
    editForm.value.apellido_materno = s.ApellidoMaterno || editForm.value.apellido_materno
  } catch (e: any) {
    curpErrorEdit.value = e?.data?.message || e?.message || 'Error al validar CURP'
  }
  curpValidandoEdit.value = false
}

// ========== CODIGO POSTAL / COLONIAS (EDITAR) ==========
const coloniasEdit = ref<any[]>([])
const cpEditLoading = ref(false)
const cpEditError = ref('')
const cpEditResult = ref<any>(null)
const coloniaSelEdit = ref('')
let cpEditTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => editForm.value?.codigo_postal, (val) => {
  if (cpEditTimeout) clearTimeout(cpEditTimeout)
  cpEditTimeout = setTimeout(() => buscarColoniasEdit(), 400)
})

async function buscarColoniasEdit() {
  const cp = (editForm.value.codigo_postal || '').replace(/[^0-9]/g, '')
  if (!cp || cp.length !== 5) {
    coloniasEdit.value = []
    cpEditResult.value = null
    cpEditError.value = ''
    return
  }
  cpEditLoading.value = true
  cpEditError.value = ''
  cpEditResult.value = null
  try {
    const data: any = await $fetch('/api/sepomex/colonias', { params: { codigo_postal: cp } })
    if (data?.colonias && data.colonias.length > 0) {
      coloniasEdit.value = data.colonias
      cpEditResult.value = {
        municipios: data.municipio || data.colonias[0]?.municipio,
        ciudades: data.ciudad || data.colonias[0]?.ciudad,
        estados: data.estado || data.colonias[0]?.estado,
      }
    } else {
      coloniasEdit.value = []
      cpEditResult.value = null
      cpEditError.value = 'No se encontraron colonias para este código postal'
    }
  } catch (e: any) {
    coloniasEdit.value = []
    cpEditResult.value = null
    cpEditError.value = e?.data?.message || 'Error al consultar colonias'
  } finally {
    cpEditLoading.value = false
  }
}

function seleccionarColoniaEdit() {
  const colonia = coloniaSelEdit.value
  if (!colonia) return
  const selected = coloniasEdit.value.find(c => c.colonia === colonia)
  if (selected) {
    editForm.value.colonia = selected.colonia || ''
    editForm.value.consultorio_ciudad = selected.ciudad || editForm.value.consultorio_ciudad
    editForm.value.consultorio_estado = selected.estado || ''
  }
}

const editPhoto = ref<File | null>(null)
const editPhotoPreview = ref('')
const editPhotoError = ref('')
const editPhotoOk = ref('')
const editPhotoSaving = ref(false)

function onEditPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  editPhotoError.value = ''
  editPhotoOk.value = ''

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    editPhotoError.value = 'Formato no valido. Se permiten archivos JPG, PNG o WebP.'
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    editPhotoError.value = `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. El maximo permitido es 2MB.`
    input.value = ''
    return
  }
  if (file.size < 10240) {
    editPhotoError.value = `El archivo pesa ${(file.size / 1024).toFixed(1)}KB. La imagen debe pesar al menos 10KB. Verifica que la imagen tenga buena resolucion.`
    input.value = ''
    return
  }

  editPhoto.value = file
  editPhotoPreview.value = URL.createObjectURL(file)
}

async function saveEditPhoto() {
  if (!editPhoto.value || !editForm.value.id) return
  editPhotoSaving.value = true
  editPhotoError.value = ''
  editPhotoOk.value = ''
  try {
    const formData = new FormData()
    formData.append('foto', editPhoto.value)
    formData.append('medico_id', editForm.value.id)
    const data: any = await $fetch('/api/upload/foto-medico', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    })
    if (data.foto_url) {
      editPhotoPreview.value = data.foto_url
      editPhoto.value = null
      editPhotoOk.value = 'Foto actualizada correctamente'
      const idx = medicos.value.findIndex(m => m.id === editForm.value.id)
      if (idx !== -1) medicos.value[idx].foto_url = data.foto_url
    }
  } catch (e: any) {
    editPhotoError.value = e.data?.message || 'Error al subir la foto'
  } finally {
    editPhotoSaving.value = false
  }
}

async function deleteEditPhoto() {
  if (!editForm.value.id) return
  if (!confirm('Eliminar la foto de perfil?')) return
  editPhotoError.value = ''
  editPhotoOk.value = ''
  try {
    await $fetch('/api/upload/delete-foto', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { medico_id: editForm.value.id },
    })
    editPhotoPreview.value = ''
    editPhoto.value = null
    editPhotoOk.value = 'Foto eliminada'
    const idx = medicos.value.findIndex(m => m.id === editForm.value.id)
    if (idx !== -1) medicos.value[idx].foto_url = null
  } catch (e: any) {
    editPhotoError.value = e.data?.message || 'Error al eliminar foto'
  }
}

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
    for (const c of consultoriosEdit.value) {
      try {
        if (c._new) {
          await $fetch('/api/admin/consultorios', { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { ...c, id_medico: editForm.value.id } })
        } else {
          await $fetch(`/api/admin/consultorios/${c.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token.value}` }, body: c })
        }
      } catch {}
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

// ========== CONSULTORIOS (MULTI-UBICACIÓN) ==========
const consultoriosNuevo = ref<any[]>([])
const consultoriosEdit = ref<any[]>([])
const consultorioForm = ref({ nombre: '', direccion: '', codigo_postal: '', colonia: '', ciudad: '', estado: '', hospital_consultorio: '', google_maps_url: '', es_principal: false })
const editConsultorioId = ref<string | null>(null)

function agregarConsultorioNuevo() {
  if (!consultorioForm.value.direccion && !consultorioForm.value.ciudad) return
  consultoriosNuevo.value.push({ ...consultorioForm.value })
  Object.assign(consultorioForm.value, { nombre: '', direccion: '', codigo_postal: '', colonia: '', ciudad: '', estado: '', hospital_consultorio: '', google_maps_url: '', es_principal: false })
}

function eliminarConsultorioNuevo(idx: number) {
  consultoriosNuevo.value.splice(idx, 1)
}

async function cargarConsultorios(id_medico: string) {
  try {
    const data: any = await $fetch(`/api/admin/consultorios?id_medico=${id_medico}`, { headers: { Authorization: `Bearer ${token.value}` } })
    consultoriosEdit.value = data?.consultorios || []
  } catch { consultoriosEdit.value = [] }
}

function guardarConsultorioEdit() {
  if (!consultorioForm.value.direccion && !consultorioForm.value.ciudad) return
  if (editConsultorioId.value) {
    const idx = consultoriosEdit.value.findIndex(c => c.id === editConsultorioId.value)
    if (idx !== -1) consultoriosEdit.value[idx] = { ...consultorioForm.value, id: editConsultorioId.value }
  } else {
    consultoriosEdit.value.push({ ...consultorioForm.value, _new: true })
  }
  resetConsultorioForm()
}

function editarConsultorio(c: any) {
  editConsultorioId.value = c.id || null
  Object.assign(consultorioForm.value, { nombre: c.nombre || '', direccion: c.direccion || '', codigo_postal: c.codigo_postal || '', colonia: c.colonia || '', ciudad: c.ciudad || '', estado: c.estado || '', hospital_consultorio: c.hospital_consultorio || '', google_maps_url: c.google_maps_url || '', es_principal: c.es_principal || false })
}

function eliminarConsultorioEdit(idx: number) {
  consultoriosEdit.value.splice(idx, 1)
}

function resetConsultorioForm() {
  editConsultorioId.value = null
  Object.assign(consultorioForm.value, { nombre: '', direccion: '', codigo_postal: '', colonia: '', ciudad: '', estado: '', hospital_consultorio: '', google_maps_url: '', es_principal: false })
}

function abrirGoogleMaps(url: string) {
  if (url) window.open(url, '_blank')
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
      <div class="modal-overlay" v-if="showModal">
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
                <div class="form-group">
                  <label>CURP</label>
                  <div class="curp-row">
                    <input v-model="newMedico.curp" maxlength="18" placeholder="AAAA000000HAAAAAA00" style="text-transform:uppercase;" />
                    <button type="button" class="btn-validate" @click="validarCURPNuevo" :disabled="curpValidandoNuevo">
                      {{ curpValidandoNuevo ? 'Validando...' : 'Validar CURP' }}
                    </button>
                  </div>
                  <span v-if="curpDatosNuevo" class="curp-success">
                    <span class="success-icon">✓</span>
                    {{ curpDatosNuevo.Solicitante?.Nombres }} {{ curpDatosNuevo.Solicitante?.ApellidoPaterno }}
                  </span>
                  <span v-if="curpErrorNuevo" class="msg-error" style="margin-top:0.4rem;display:block;">{{ curpErrorNuevo }}</span>
                </div>
                <div class="form-group"><label>Telefono 2</label><input v-model="newMedico.telefono_2" /></div>
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
                <div class="form-group"><label>Codigo Postal</label>
                  <input v-model="newMedico.codigo_postal" maxlength="5" @focus="buscarColoniasNuevo" style="text-transform:uppercase;" />
                  <span v-if="cpNuevoError" class="cp-error" style="color:#d22; font-size:0.8rem; margin-top:0.3rem;">{{ cpNuevoError }}</span>
                  <span v-if="cpNuevoLoading" class="cp-loading" style="color:#636e72; font-size:0.8rem; margin-top:0.3rem;">Buscando...</span>
                </div>
                <div class="form-group"><label>Estado</label><input v-model="newMedico.consultorio_estado" placeholder="Ej: Puebla" /></div>
              </div>
              <div v-if="coloniasNuevo.length > 0" class="colonias-dropdown">
                <div class="colonias-header">
                  <span>Colonias encontradas</span>
                  <span v-if="cpNuevoResult" class="colonias-resumen">
                    {{ cpNuevoResult.ciudades }}, {{ cpNuevoResult.municipios }}, {{ cpNuevoResult.estados }}
                  </span>
                </div>
                <select v-model="coloniaSelNuevo" @change="seleccionarColoniaNuevo">
                  <option value="">Seleccionar colonia...</option>
                  <option v-for="col in coloniasNuevo" :key="col.colonia" :value="col.colonia">{{ col.colonia }} {{ col.tipo_colonia || '' }}</option>
                </select>
                <span v-if="!coloniaSelNuevo" class="colonias-manual">O escribe manualmente</span>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Colonia</label><input v-model="newMedico.colonia" placeholder="Nombre de la colonia" /></div>
                <div class="form-group"><label>Hospital o Consultorio</label><input v-model="newMedico.hospital_consultorio" placeholder="Ej: Hospital Angeles" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Precio Regular ($)</label><input v-model="newMedico.precio_regular" type="number" step="0.01" min="0" placeholder="Ej: 500" /></div>
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
                <div class="form-group"><label>Precio Miembro ($)</label><input v-model="newMedico.precio_miembro" type="number" step="0.01" min="0" placeholder="Ej: 400" /></div>
                <div class="form-group"><label>Tipo de Comision</label>
                  <select v-model="newMedico.comision_tipo">
                    <option :value="1">Tipo 1 — $100 MXN</option>
                    <option :value="2">Tipo 2 — $75 MXN</option>
                    <option :value="3">Tipo 3 — $50 MXN</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Universidad</label><input v-model="newMedico.universidad" placeholder="Ej: BUAP" /></div>
              </div>

              <!-- CONSULTORIOS ADICIONALES -->
              <div class="section-divider"><span>Consultorios / Ubicaciones</span></div>
              <div v-if="consultoriosNuevo.length > 0" class="consultorios-list">
                <div v-for="(c, idx) in consultoriosNuevo" :key="idx" class="consultorio-item">
                  <div class="consultorio-info">
                    <strong>{{ c.nombre || 'Consultorio ' + (idx+1) }}</strong>
                    <span>{{ c.direccion }} {{ c.colonia ? ', ' + c.colonia : '' }} {{ c.ciudad ? ', ' + c.ciudad : '' }} {{ c.estado ? ', ' + c.estado : '' }}</span>
                    <span v-if="c.hospital_consultorio">{{ c.hospital_consultorio }}</span>
                    <span v-if="c.google_maps_url"><a :href="c.google_maps_url" target="_blank" class="maps-link">📍 Ver en Maps</a></span>
                  </div>
                  <button type="button" class="btn-remove" @click="eliminarConsultorioNuevo(idx)">✕</button>
                </div>
              </div>
              <div class="consultorio-form">
                <div class="form-row">
                  <div class="form-group"><label>Nombre</label><input v-model="consultorioForm.nombre" placeholder="Ej: Consultorio Principal" /></div>
                  <div class="form-group"><label>Direccion</label><input v-model="consultorioForm.direccion" placeholder="Calle y numero" /></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>CP</label><input v-model="consultorioForm.codigo_postal" maxlength="5" placeholder="5 digitos" /></div>
                  <div class="form-group"><label>Colonia</label><input v-model="consultorioForm.colonia" /></div>
                  <div class="form-group"><label>Ciudad</label><input v-model="consultorioForm.ciudad" /></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Estado</label><input v-model="consultorioForm.estado" /></div>
                  <div class="form-group"><label>Hospital</label><input v-model="consultorioForm.hospital_consultorio" /></div>
                </div>
                <div class="form-row">
                  <div class="form-group" style="flex:2"><label>URL Google Maps</label><input v-model="consultorioForm.google_maps_url" placeholder="https://maps.google.com/..." /></div>
                  <div class="form-group" style="flex:0; align-self:flex-end;">
                    <button type="button" v-if="consultorioForm.google_maps_url" class="btn-maps" @click="abrirGoogleMaps(consultorioForm.google_maps_url)">📍 Abrir</button>
                  </div>
                </div>
                <div class="form-row">
                  <label class="checkbox-label"><input type="checkbox" v-model="consultorioForm.es_principal" /> Consultorio principal</label>
                  <button type="button" class="btn-add-consultorio" @click="agregarConsultorioNuevo()">+ Agregar</button>
                </div>
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
      <div class="modal-overlay" v-if="editando">
        <div class="modal">
          <div class="modal-header">
            <h2>Editar Medico</h2>
            <button class="modal-close" @click="cerrarEditar">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="editError" class="msg-error">{{ editError }}</div>
            <div v-if="editOk" class="msg-ok">{{ editOk }}</div>

            <!-- Foto de perfil -->
            <div class="edit-photo-section">
              <label class="section-label">Foto de perfil</label>
              <div class="edit-photo-row">
                <div class="edit-photo-preview">
                  <img v-if="editPhotoPreview" :src="editPhotoPreview" alt="Foto">
                  <div v-else class="edit-photo-placeholder">
                    <span>{{ editForm.nombre?.charAt(0) }}{{ editForm.apellido_paterno?.charAt(0) }}</span>
                  </div>
                </div>
                <div class="edit-photo-actions">
                  <label class="btn-photo-upload">
                    <input type="file" accept="image/jpeg,image/png,image/webp" @change="onEditPhotoSelected" style="display:none">
                    {{ editPhotoPreview ? 'Cambiar foto' : 'Subir foto' }}
                  </label>
                  <button v-if="editPhotoPreview" class="btn-photo-delete" @click="deleteEditPhoto" type="button">Eliminar foto</button>
                  <button v-if="editPhoto" class="btn-photo-save" @click="saveEditPhoto" :disabled="editPhotoSaving" type="button">
                    {{ editPhotoSaving ? 'Subiendo...' : 'Guardar foto' }}
                  </button>
                  <p class="photo-restrictions">JPG, PNG o WebP. Maximo 2MB. Minimo 10KB.</p>
                </div>
              </div>
              <div v-if="editPhotoError" class="msg-error" style="margin-top:0.5rem">{{ editPhotoError }}</div>
              <div v-if="editPhotoOk" class="msg-ok" style="margin-top:0.5rem">{{ editPhotoOk }}</div>
            </div>

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
              <div class="form-group">
                <label>CURP</label>
                <div class="curp-row">
                  <input v-model="editForm.curp" maxlength="18" placeholder="AAAA000000HAAAAAA00" style="text-transform:uppercase;" />
                  <button type="button" class="btn-validate" @click="validarCURPEdit" :disabled="curpValidandoEdit">
                    {{ curpValidandoEdit ? 'Validando...' : 'Validar CURP' }}
                  </button>
                </div>
                <span v-if="curpDatosEdit" class="curp-success">
                  <span class="success-icon">✓</span>
                  {{ curpDatosEdit.Solicitante?.Nombres }} {{ curpDatosEdit.Solicitante?.ApellidoPaterno }}
                </span>
                <span v-if="curpErrorEdit" class="msg-error" style="margin-top:0.4rem;display:block;">{{ curpErrorEdit }}</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Codigo Postal</label>
                <input v-model="editForm.codigo_postal" maxlength="5" @focus="buscarColoniasEdit" style="text-transform:uppercase;" />
                <span v-if="cpEditError" class="cp-error" style="color:#d22; font-size:0.8rem; margin-top:0.3rem;">{{ cpEditError }}</span>
                <span v-if="cpEditLoading" class="cp-loading" style="color:#636e72; font-size:0.8rem; margin-top:0.3rem;">Buscando...</span>
              </div>
              <div class="form-group"><label>Estado</label><input v-model="editForm.consultorio_estado" placeholder="Ej: Puebla" /></div>
            </div>
            <div v-if="coloniasEdit.length > 0" class="colonias-dropdown">
              <div class="colonias-header">
                <span>Colonias encontradas</span>
                <span v-if="cpEditResult" class="colonias-resumen">
                  {{ cpEditResult.ciudades }}, {{ cpEditResult.municipios }}, {{ cpEditResult.estados }}
                </span>
              </div>
              <select v-model="coloniaSelEdit" @change="seleccionarColoniaEdit">
                <option value="">Seleccionar colonia...</option>
                <option v-for="col in coloniasEdit" :key="col.colonia" :value="col.colonia">{{ col.colonia }} {{ col.tipo_colonia || '' }}</option>
              </select>
              <span v-if="!coloniaSelEdit" class="colonias-manual">O escribe manualmente</span>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Colonia</label><input v-model="editForm.colonia" placeholder="Nombre de la colonia" /></div>
              <div class="form-group"><label>Direccion del consultorio</label><input v-model="editForm.consultorio_direccion" placeholder="Calle y numero" /></div>
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
            <div class="form-row">
              <div class="form-group"><label>Tipo de Comision</label>
                <select v-model="editForm.comision_tipo">
                  <option :value="1">Tipo 1 — $100 MXN</option>
                  <option :value="2">Tipo 2 — $75 MXN</option>
                  <option :value="3">Tipo 3 — $50 MXN</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Biografia</label><textarea v-model="editForm.bio" rows="3"></textarea></div>

            <!-- CONSULTORIOS ADICIONALES (EDITAR) -->
            <div class="section-divider"><span>Consultorios / Ubicaciones</span></div>
            <div v-if="consultoriosEdit.length > 0" class="consultorios-list">
              <div v-for="(c, idx) in consultoriosEdit" :key="c.id || idx" class="consultorio-item" :class="{ principal: c.es_principal }">
                <div class="consultorio-info">
                  <strong>{{ c.nombre || 'Consultorio ' + (idx+1) }}</strong> <span v-if="c.es_principal" class="badge-principal">Principal</span>
                  <span>{{ c.direccion }} {{ c.colonia ? ', ' + c.colonia : '' }} {{ c.ciudad ? ', ' + c.ciudad : '' }} {{ c.estado ? ', ' + c.estado : '' }}</span>
                  <span v-if="c.hospital_consultorio">{{ c.hospital_consultorio }}</span>
                  <span v-if="c.google_maps_url"><a :href="c.google_maps_url" target="_blank" class="maps-link">📍 Ver en Maps</a></span>
                </div>
                <div class="consultorio-actions">
                  <button type="button" class="btn-sm" @click="editarConsultorio(c)">Editar</button>
                  <button type="button" class="btn-remove" @click="eliminarConsultorioEdit(idx)">✕</button>
                </div>
              </div>
            </div>
            <div class="consultorio-form">
              <div class="form-row">
                <div class="form-group"><label>Nombre</label><input v-model="consultorioForm.nombre" placeholder="Ej: Consultorio Principal" /></div>
                <div class="form-group"><label>Direccion</label><input v-model="consultorioForm.direccion" placeholder="Calle y numero" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>CP</label><input v-model="consultorioForm.codigo_postal" maxlength="5" placeholder="5 digitos" /></div>
                <div class="form-group"><label>Colonia</label><input v-model="consultorioForm.colonia" /></div>
                <div class="form-group"><label>Ciudad</label><input v-model="consultorioForm.ciudad" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Estado</label><input v-model="consultorioForm.estado" /></div>
                <div class="form-group"><label>Hospital</label><input v-model="consultorioForm.hospital_consultorio" /></div>
              </div>
              <div class="form-row">
                <div class="form-group" style="flex:2"><label>URL Google Maps</label><input v-model="consultorioForm.google_maps_url" placeholder="https://maps.google.com/..." /></div>
                <div class="form-group" style="flex:0; align-self:flex-end;">
                  <button type="button" v-if="consultorioForm.google_maps_url" class="btn-maps" @click="abrirGoogleMaps(consultorioForm.google_maps_url)">📍 Abrir</button>
                </div>
              </div>
              <div class="form-row">
                <label class="checkbox-label"><input type="checkbox" v-model="consultorioForm.es_principal" /> Consultorio principal</label>
                <button type="button" class="btn-add-consultorio" @click="guardarConsultorioEdit()">{{ editConsultorioId ? 'Actualizar' : '+ Agregar' }}</button>
                <button v-if="editConsultorioId" type="button" class="btn-cancel-sm" @click="resetConsultorioForm()">Cancelar edicion</button>
              </div>
            </div>

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
      <div class="modal-overlay" v-if="showViewModal">
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

/* Edit Photo Section */
.edit-photo-section { margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid #e0e0e0; }
.section-label { font-size: 0.8rem; font-weight: 600; color: #636e72; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.75rem; }
.edit-photo-row { display: flex; gap: 1.25rem; align-items: flex-start; }
.edit-photo-preview { width: 100px; height: 100px; border-radius: 50%; overflow: hidden; background: #f5f6fa; border: 2px solid #e0e0e0; flex-shrink: 0; }
.edit-photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.edit-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; color: #b2bec3; }
.edit-photo-actions { display: flex; flex-direction: column; gap: 0.5rem; }
.btn-photo-upload { display: inline-block; padding: 0.4rem 0.8rem; background: #0984e3; color: white; border-radius: 6px; font-size: 0.8rem; cursor: pointer; text-align: center; }
.btn-photo-upload:hover { background: #0652DD; }
.btn-photo-delete { padding: 0.4rem 0.8rem; background: none; border: 1px solid #d63031; color: #d63031; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
.btn-photo-delete:hover { background: #ffebee; }
.btn-photo-save { padding: 0.4rem 0.8rem; background: #00b894; color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
.btn-photo-save:hover { background: #00a884; }
.photo-restrictions { font-size: 0.75rem; color: #b2bec3; margin: 0; }

/* CURP + Colonias */
.curp-row { display: flex; gap: 0.5rem; align-items: center; }
.btn-validate { background: #0984e3; color: white; border: none; padding: 0.55rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; white-space: nowrap; }
.btn-validate:hover:not(:disabled) { background: #0773c5; }
.btn-validate:disabled { opacity: 0.5; cursor: not-allowed; }
.curp-success { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; font-size: 0.82rem; color: #2e7d32; background: #e8f5e9; padding: 0.4rem 0.75rem; border-radius: 6px; }
.success-icon { width: 20px; height: 20px; background: #2e7d32; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
.colonias-dropdown { margin-bottom: 0.75rem; padding: 0.75rem; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; }
.colonias-header { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem; color: #2d3436; font-weight: 600; }
.colonias-resumen { font-weight: 400; color: #636e72; font-size: 0.78rem; }
.colonias-dropdown select { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.colonias-manual { display: inline-block; margin-top: 0.4rem; font-size: 0.75rem; color: #0984e3; cursor: pointer; }

/* Consultorios multi-ubicacion */
.section-divider { margin: 1.25rem 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e0e0e0; }
.section-divider span { font-size: 0.85rem; font-weight: 700; color: #2d3436; text-transform: uppercase; letter-spacing: 0.5px; }
.consultorios-list { margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.consultorio-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; gap: 0.75rem; }
.consultorio-item.principal { border-color: #00b894; background: #f0fff4; }
.consultorio-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
.consultorio-info strong { font-size: 0.9rem; color: #2d3436; }
.consultorio-info span { font-size: 0.8rem; color: #636e72; }
.consultorio-actions { display: flex; gap: 0.35rem; flex-shrink: 0; }
.badge-principal { display: inline-block; background: #00b894; color: white; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; margin-left: 0.35rem; vertical-align: middle; }
.btn-add-consultorio { background: #00b894; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
.btn-add-consultorio:hover { background: #00a884; }
.btn-maps { background: #4285f4; color: white; border: none; padding: 0.45rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; }
.btn-maps:hover { background: #3367d6; }
.btn-remove { background: none; border: 1px solid #d63031; color: #d63031; border-radius: 4px; cursor: pointer; font-size: 0.75rem; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-remove:hover { background: #ffebee; }
.btn-sm { padding: 0.3rem 0.6rem; border: 1px solid #dfe6e9; border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: white; }
.btn-sm:hover { background: #f5f5f5; }
.maps-link { color: #4285f4; font-size: 0.8rem; text-decoration: none; font-weight: 500; }
.maps-link:hover { text-decoration: underline; }
.checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #2d3436; cursor: pointer; }
</style>
