<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const token = useCookie('token')
const usuario = useCookie('usuario')
const { config: verifConfig, loadConfig: loadVerifConfig } = useVerificacionConfig()
const loading = ref(false)
const uploadingPhoto = ref(false)
const success = ref('')
const error = ref('')
const photoPreview = ref<string | null>(null)

const smsStep = ref<'phone' | 'code'>('phone')
const smsCodigo = ref('')
const smsLoading = ref(false)
const smsError = ref('')
const smsSuccess = ref(false)
const smsCountdown = ref(0)
const smsCanResend = ref(true)
const showSmsVerification = ref(false)

const phoneConfirmed = computed(() => usuario.value?.telefono_confirmado === true)
const phoneExists = computed(() => !!form.value.telefono)
const emailConfirmed = computed(() => usuario.value?.email_confirmado === true)
const showPhoneVerification = computed(() => verifConfig.value.requirePhone && phoneExists.value && !phoneConfirmed.value && !smsSuccess.value)
const showEmailVerification = computed(() => verifConfig.value.requireEmail && !emailConfirmed.value)
const emailSending = ref(false)
const emailSent = ref(false)

const form = ref({
  nombre: usuario.value?.nombre || '',
  apellido: usuario.value?.apellido || '',
  curp: usuario.value?.curp || '',
  fecha_nacimiento: usuario.value?.fecha_nacimiento || '',
  genero: usuario.value?.genero || '',
  estado_civil: usuario.value?.estado_civil || '',
  ocupacion: usuario.value?.ocupacion || '',
  telefono: usuario.value?.telefono || '',
  email: usuario.value?.email || '',
  direccion: usuario.value?.direccion || '',
  ciudad: usuario.value?.ciudad || '',
  beneficiario_nombre: usuario.value?.beneficiario_nombre || '',
  beneficiario_parentesco: usuario.value?.beneficiario_parentesco || '',
  beneficiario_telefono: usuario.value?.beneficiario_telefono || '',
  codigo_postal: usuario.value?.codigo_postal || '',
  colonia: usuario.value?.colonia || '',
  cedula_profesional: usuario.value?.cedula_profesional || '',
  consultorio_direccion: usuario.value?.consultorio_direccion || '',
  consultorio_ciudad: usuario.value?.consultorio_ciudad || '',
  consultorio_estado: usuario.value?.consultorio_estado || '',
  bio: usuario.value?.bio || '',
  rfc: usuario.value?.rfc || '',
  hospital_consultorio: usuario.value?.hospital_consultorio || '',
  tipo_consulta: usuario.value?.tipo_consulta || '',
  comision_tipo: usuario.value?.comision_tipo || 1,
})

const planContratado = ref(usuario.value?.plan_contratado || null)
const esPlanPago = computed(() => planContratado.value && planContratado.value !== 'basico')

const beneficiarios = ref<any[]>([])
const nuevoBeneficiario = ref({ nombre: '', apellido_paterno: '', apellido_materno: '', parentesco: '', telefono: '' })

const estudios = ref<any[]>([])
const nuevoEstudio = ref({ titulo: '', institucion: '', anio: '', descripcion: '' })
const showFormEstudio = ref(false)

const esMedico = computed(() => usuario.value?.tipo === 'medico')
const esPaciente = computed(() => usuario.value?.tipo === 'paciente')
const fotoUrl = computed(() => usuario.value?.foto_url || photoPreview.value)

const coloniasPerfil = ref<any[]>([])
const coloniasPerfilLoading = ref(false)
const coloniaPerfilManual = ref(false)

let cpPerfilTimeout: ReturnType<typeof setTimeout> | null = null
watch(() => form.value.codigo_postal, (val) => {
  form.value.colonia = ''
  coloniaPerfilManual.value = false
  coloniasPerfil.value = []
  if (cpPerfilTimeout) clearTimeout(cpPerfilTimeout)
  if (!val || val.length !== 5 || !/^\d{5}$/.test(val)) return
  cpPerfilTimeout = setTimeout(() => buscarColoniasPerfil(val), 400)
})

async function buscarColoniasPerfil(cp: string) {
  coloniasPerfilLoading.value = true
  coloniasPerfil.value = []
  try {
    const data: any = await $fetch('/api/sepomex/colonias', { params: { zip_code: cp } })
    coloniasPerfil.value = data?.colonias || []
    if (data?.ciudad && !form.value.consultorio_ciudad) form.value.consultorio_ciudad = data.ciudad
    if (data?.estado && !form.value.consultorio_estado) form.value.consultorio_estado = data.estado
  } catch (e) {
    coloniasPerfil.value = []
  }
  coloniasPerfilLoading.value = false
}

onMounted(async () => {
  loadVerifConfig()
  try {
    const { data } = await useFetch('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    const u = (data.value as any)?.usuario
    if (u) {
      form.value.nombre = u.nombre || ''
      form.value.apellido = u.apellido || ''
      form.value.curp = u.curp || ''
      form.value.fecha_nacimiento = u.fecha_nacimiento ? u.fecha_nacimiento.slice(0, 10) : ''
      form.value.genero = u.genero || ''
      form.value.estado_civil = u.estado_civil || ''
      form.value.ocupacion = u.ocupacion || ''
      form.value.telefono = u.telefono || ''
      form.value.email = u.email || ''
      form.value.direccion = u.direccion || ''
      form.value.ciudad = u.ciudad || ''
      form.value.beneficiario_nombre = u.beneficiario_nombre || ''
      form.value.beneficiario_parentesco = u.beneficiario_parentesco || ''
      form.value.beneficiario_telefono = u.beneficiario_telefono || ''
      planContratado.value = u.plan_contratado || null
      if (u.beneficiarios) beneficiarios.value = u.beneficiarios
      if (esMedico.value) {
        form.value.curp = u.curp || ''
        form.value.cedula_profesional = u.cedula_profesional || ''
        form.value.codigo_postal = u.codigo_postal || ''
        form.value.colonia = u.colonia || ''
        form.value.consultorio_direccion = u.consultorio_direccion || ''
        form.value.consultorio_ciudad = u.consultorio_ciudad || ''
        form.value.consultorio_estado = u.consultorio_estado || ''
        form.value.bio = u.bio || ''
        form.value.comision_tipo = u.comision_tipo || 1
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

async function enviarCodigoSms() {
  if (!form.value.telefono) return
  smsLoading.value = true
  smsError.value = ''
  try {
    const res: any = await $fetch('/api/auth/enviar-sms-confirmacion', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { telefono: form.value.telefono }
    })
    if (res?.autoConfirmado) {
      smsSuccess.value = true
      usuario.value = { ...usuario.value, telefono_confirmado: true }
      showSmsVerification.value = false
      return
    }
    smsStep.value = 'code'
    smsCanResend.value = false
    smsCountdown.value = 60
    const timer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0) { smsCanResend.value = true; clearInterval(timer) }
    }, 1000)
  } catch (e: any) {
    smsError.value = e?.data?.message || 'Error enviando codigo'
  } finally {
    smsLoading.value = false
  }
}

async function verificarCodigoSms() {
  if (!smsCodigo.value || smsCodigo.value.length !== 6) { smsError.value = 'Ingresa el codigo de 6 digitos'; return }
  smsLoading.value = true
  smsError.value = ''
  try {
    await $fetch('/api/auth/confirmar-telefono', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { codigo: smsCodigo.value, telefono: form.value.telefono }
    })
    smsSuccess.value = true
    usuario.value = { ...usuario.value, telefono_confirmado: true }
    showSmsVerification.value = false
  } catch (e: any) {
    smsError.value = e?.data?.message || 'Error verificando codigo'
  } finally {
    smsLoading.value = false
  }
}

async function enviarConfirmacionEmail() {
  emailSending.value = true
  try {
    await $fetch('/api/auth/enviar-confirmacion', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { email: form.value.email, tipo: usuario.value?.tipo }
    })
    emailSent.value = true
  } catch (e: any) {
    error.value = e?.data?.message || 'Error enviando confirmacion'
  } finally {
    emailSending.value = false
  }
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
          <div class="form-group"><label>Apellido</label><input v-model="form.apellido" /></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefono</label>
            <input v-model="form.telefono" type="tel" placeholder="+52 55 1234 5678" />
          </div>
          <div class="form-group"><label>Email</label><input v-model="form.email" type="email" disabled style="background:#f5f5f5" /></div>
        </div>

        <div v-if="verifConfig.requireEmail && emailConfirmed" class="email-verified-badge">
          <span>✅</span> Correo verificado
        </div>
        <div v-else-if="verifConfig.requireEmail && emailSent" class="email-sent-badge">
          <span>📩</span> Correo de verificacion enviado. Revisa tu bandeja de entrada.
        </div>
        <div v-else-if="showEmailVerification" class="email-unverified-section">
          <div class="email-verify-header">
            <span class="email-verify-icon">✉️</span>
            <div class="email-verify-text">
              <strong>Tu correo no esta verificado</strong>
              <span>Confirma tu email para recibir notificaciones importantes</span>
            </div>
            <button type="button" class="btn-verify btn-email" @click="enviarConfirmacionEmail" :disabled="emailSending">
              {{ emailSending ? '...' : 'Enviar confirmacion' }}
            </button>
          </div>
        </div>

        <div v-if="showPhoneVerification" class="phone-verify-section">
          <div class="phone-verify-header">
            <span class="phone-verify-icon">📱</span>
            <div class="phone-verify-text">
              <strong>Tu numero no esta verificado</strong>
              <span>Confirma tu telefono para recibir notificaciones SMS</span>
            </div>
            <button v-if="!showSmsVerification" type="button" class="btn-verify" @click="showSmsVerification = true; smsStep = 'phone'">Verificar</button>
            <button v-else type="button" class="btn-close-verify" @click="showSmsVerification = false">&times;</button>
          </div>

          <div v-if="showSmsVerification" class="phone-verify-form">
            <div v-if="smsStep === 'phone'" class="phone-verify-row">
              <input :value="form.telefono" type="tel" disabled class="phone-verify-input" />
              <button type="button" class="btn-verify-send" @click="enviarCodigoSms" :disabled="smsLoading">
                {{ smsLoading ? '...' : 'Enviar codigo' }}
              </button>
            </div>
            <div v-if="smsStep === 'code'" class="phone-verify-row">
              <input v-model="smsCodigo" type="text" placeholder="000000" maxlength="6" class="phone-verify-input code" @input="smsCodigo = smsCodigo.replace(/[^0-9]/g, '')" />
              <button type="button" class="btn-verify-send" @click="verificarCodigoSms" :disabled="smsLoading">
                {{ smsLoading ? '...' : 'Verificar' }}
              </button>
            </div>
            <p v-if="smsError" class="phone-verify-error">{{ smsError }}</p>
            <p v-if="smsStep === 'code' && !smsCanResend" class="phone-verify-timer">Reenviar en {{ smsCountdown }}s</p>
            <button v-if="smsStep === 'code' && smsCanResend" type="button" class="phone-verify-link" @click="enviarCodigoSms">Reenviar codigo</button>
          </div>
        </div>

        <div v-if="verifConfig.requirePhone && phoneExists && (phoneConfirmed || smsSuccess)" class="phone-verified-badge">
          <span>✅</span> Telefono verificado
        </div>

        <template v-if="esPaciente">
          <div class="section-divider">
            <span>Datos del CURP</span>
          </div>
          <div class="form-group"><label>CURP</label><input v-model="form.curp" disabled style="background:#f5f5f5; font-family:monospace; letter-spacing:1px" /></div>
          <div class="form-row">
            <div class="form-group"><label>Fecha de Nacimiento</label><input v-model="form.fecha_nacimiento" type="date" disabled style="background:#f5f5f5" /></div>
            <div class="form-group">
              <label>Genero</label>
              <select v-model="form.genero" disabled style="background:#f5f5f5"><option value="">Seleccionar</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Estado Civil</label><select v-model="form.estado_civil"><option value="">Seleccionar</option><option value="soltero">Soltero/a</option><option value="casado">Casado/a</option><option value="divorciado">Divorciado/a</option><option value="viudo">Viudo/a</option><option value="union_libre">Union libre</option></select></div>
            <div class="form-group"><label>Ocupacion</label><input v-model="form.ocupacion" /></div>
          </div>

          <div class="section-divider">
            <span>Direccion</span>
          </div>
          <div class="form-group"><label>Direccion</label><textarea v-model="form.direccion" rows="2"></textarea></div>
          <div class="form-group"><label>Ciudad</label><input v-model="form.ciudad" /></div>
        </template>

        <template v-if="esMedico">
          <div class="section-divider">
            <span>Datos de identificación</span>
          </div>
          <div class="form-group"><label>CURP</label><input v-model="form.curp" disabled style="background:#f5f5f5; font-family:monospace; letter-spacing:1px" /></div>
          <div class="form-group"><label>Cedula Profesional</label><input v-model="form.cedula_profesional" /></div>
          <div class="section-divider">
            <span>Consultorio</span>
          </div>
          <div class="form-group"><label>Direccion del Consultorio</label><input v-model="form.consultorio_direccion" /></div>
          <div class="form-row">
            <div class="form-group"><label>Codigo Postal</label><input v-model="form.codigo_postal" maxlength="5" @input="form.codigo_postal = form.codigo_postal.replace(/\D/g, '')" /></div>
            <div class="form-group">
              <label>Colonia</label>
              <template v-if="coloniasPerfil.length > 0 && !coloniaPerfilManual">
                <select v-model="form.colonia">
                  <option value="">Seleccionar colonia...</option>
                  <option v-for="c in coloniasPerfil" :key="c.colonia" :value="c.colonia">{{ c.colonia }}</option>
                </select>
                <span class="sepomex-hint" @click="coloniaPerfilManual = true">Escribir manualmente</span>
              </template>
              <template v-else>
                <input v-model="form.colonia" type="text" placeholder="Nombre de la colonia" />
                <span v-if="coloniasPerfil.length > 0 && coloniaPerfilManual" class="sepomex-hint" @click="coloniaPerfilManual = false">Elegir del listado</span>
              </template>
              <span v-if="coloniasPerfilLoading" class="loading-hint">Buscando colonias...</span>
              <span v-else-if="form.codigo_postal && form.codigo_postal.length === 5 && !coloniaPerfilManual && coloniasPerfil.length === 0 && !coloniasPerfilLoading" class="loading-hint">No se encontraron colonias para este CP, ingresa manualmente</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Ciudad</label><input v-model="form.consultorio_ciudad" /></div>
            <div class="form-group"><label>Estado</label><input v-model="form.consultorio_estado" /></div>
          </div>
          <div class="form-group"><label>Biografia</label><textarea v-model="form.bio" rows="3"></textarea></div>
          <div class="form-group">
            <label>Tipo de Comision</label>
            <select v-model="form.comision_tipo">
              <option :value="1">Tipo 1 - $100 MXN por cita</option>
              <option :value="2">Tipo 2 - $75 MXN por cita</option>
              <option :value="3">Tipo 3 - $50 MXN por cita</option>
            </select>
            <span class="photo-hint">Comision que se cobra por cada cita confirmada</span>
          </div>
        </template>

        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Guardando...' : 'Guardar Cambios' }}</button>
      </form>

      <div v-if="esPaciente && esPlanPago" class="section-divider"></div>

      <div v-if="esPaciente && esPlanPago" class="section-card">
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

      <div v-if="esPaciente && esPlanPago" class="section-divider"></div>

      <div v-if="esPaciente && esPlanPago" class="section-card">
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

      <div v-if="esMedico" class="section-divider"></div>

      <div v-if="esMedico" class="section-card">
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
.section-divider { border-top: 1px solid #eee; padding-top: 0.75rem; margin-top: 0.5rem; }
.section-divider span { font-size: 0.75rem; color: #00b894; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
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
.sepomex-hint, .loading-hint { display: inline-block; margin-top: 0.35rem; font-size: 0.78rem; color: #0984e3; cursor: pointer; }
.sepomex-hint:hover { text-decoration: underline; }
.loading-hint { color: #636e72; cursor: default; }
.study-form { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
.studies-list { display: flex; flex-direction: column; gap: 0.5rem; }
.study-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; }
.study-info { display: flex; flex-direction: column; gap: 0.15rem; }
.study-info strong { font-size: 0.95rem; }
.study-info span { font-size: 0.8rem; color: #636e72; }
.btn-delete { background: none; border: none; color: #d63031; cursor: pointer; font-size: 0.8rem; }
.btn-delete:hover { text-decoration: underline; }
.empty-state { text-align: center; color: #b2bec3; padding: 1.5rem; font-size: 0.9rem; }
.phone-verify-section { background: linear-gradient(135deg, #fff3e0, #ffe0b2); border: 1px solid #ffcc02; border-radius: 10px; padding: 0.75rem 1rem; margin: 0.5rem 0; }
.phone-verify-header { display: flex; align-items: center; gap: 0.75rem; }
.phone-verify-icon { font-size: 1.5rem; }
.phone-verify-text { flex: 1; display: flex; flex-direction: column; }
.phone-verify-text strong { font-size: 0.9rem; color: #e65100; }
.phone-verify-text span { font-size: 0.8rem; color: #bf360c; }
.btn-verify { background: #e65100; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-verify:hover { background: #bf360c; }
.btn-close-verify { background: none; border: none; font-size: 1.2rem; color: #bf360c; cursor: pointer; padding: 0 0.5rem; }
.phone-verify-form { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(0,0,0,0.1); }
.phone-verify-row { display: flex; gap: 0.5rem; }
.phone-verify-input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #ffcc02; border-radius: 6px; font-size: 0.9rem; background: white; }
.phone-verify-input.code { text-align: center; letter-spacing: 0.3rem; font-weight: 700; }
.phone-verify-input:focus { outline: none; border-color: #e65100; }
.btn-verify-send { background: #e65100; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-verify-send:hover { background: #bf360c; }
.btn-verify-send:disabled { opacity: 0.5; cursor: not-allowed; }
.phone-verify-error { color: #c62828; font-size: 0.8rem; margin-top: 0.5rem; }
.phone-verify-timer { color: #bf360c; font-size: 0.8rem; margin-top: 0.5rem; }
.phone-verify-link { background: none; border: none; color: #e65100; font-size: 0.8rem; cursor: pointer; text-decoration: underline; padding: 0; margin-top: 0.5rem; }
.phone-verified-badge { display: flex; align-items: center; gap: 0.5rem; color: #00b894; font-size: 0.9rem; font-weight: 600; margin: 0.5rem 0; }
.email-verified-badge { display: flex; align-items: center; gap: 0.5rem; color: #00b894; font-size: 0.9rem; font-weight: 600; margin: 0.5rem 0; }
.email-sent-badge { display: flex; align-items: center; gap: 0.5rem; color: #0984e3; font-size: 0.9rem; margin: 0.5rem 0; background: #e3f2fd; padding: 0.5rem 0.75rem; border-radius: 8px; }
.email-unverified-section { background: linear-gradient(135deg, #e3f2fd, #bbdefb); border: 1px solid #90caf9; border-radius: 10px; padding: 0.75rem 1rem; margin: 0.5rem 0; }
.email-verify-header { display: flex; align-items: center; gap: 0.75rem; }
.email-verify-icon { font-size: 1.5rem; }
.email-verify-text { flex: 1; display: flex; flex-direction: column; }
.email-verify-text strong { font-size: 0.9rem; color: #1565c0; }
.email-verify-text span { font-size: 0.8rem; color: #1976d2; }
.btn-email { background: #1976d2; }
.btn-email:hover { background: #1565c0; }
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
