<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const tipo = ref<'paciente' | 'medico'>('paciente')
const showEmailConfirm = ref(false)
const emailConfirmMessage = ref('')
const paquetes = ref<any[]>([])
const paqueteSeleccionado = ref('')
const paso = ref<'datos' | 'plan'>('datos')
const pagosConfigurados = ref(false)

const planesDisponibles = computed(() => {
  if (pagosConfigurados.value) return paquetes.value
  return paquetes.value.filter(p => parseFloat(p.precio) === 0)
})

const formPaciente = ref({
  nombre: '', apellido: '', apellido_paterno: '', apellido_materno: '',
  email: '', password: '', telefono: '', telefono2: '',
  fecha_nacimiento: '', genero: '', direccion: '', ciudad: '',
  codigo_postal: '', estado: '', municipio: '',
  como_nos_conociste: '',
  acepta_terminos: false, acepta_marketing: false,
  id_paquete: '',
  curp: '', estado_civil: '', ocupacion: '', hospital_consultorio: '',
  beneficiario_nombre: '', beneficiario_parentesco: '', beneficiario_telefono: '',
  beneficiarios: [] as any[],
  identificacion_tipo: 'INE', identificacion_numero: '', acepta_seguro: false,
  curp_valido: false,
  curp_validando: false,
  datos_renapo: null
})

// Función para validar CURP
async function validarCurp(curp: string) {
  if (!curp || curp.length !== 18) return { valido: false, mensaje: 'La CURP debe tener 18 caracteres' }
  
  const regex = /^[A-Z]{4}\d{6}[A-Z\d]{3}$/
  if (!regex.test(curp)) return { valido: false, mensaje: 'El formato de CURP no es válido' }
  
  formPaciente.value.curp_validando = true
  try {
    const response = await $fetch('/api/auth/validar-curp', {
      method: 'POST',
      body: { curp }
    })
    const data = response as any
    if (data.existe) return { valido: false, mensaje: 'Esta CURP ya está registrada en el sistema' }
    if (data.valido) {
      formPaciente.value.datos_renapo = {
        nombre: data.nombre,
        apellido: data.apellido,
        fecha_nacimiento: data.fecha_nacimiento,
        genero: data.genero,
        nacionalidad: data.nacionalidad,
        rfc: data.rfc
      }
      // Auto-completar campos
      formPaciente.value.nombre = data.nombre
      formPaciente.value.apellido = data.apellido
      formPaciente.value.fecha_nacimiento = data.fecha_nacimiento
      formPaciente.value.genero = data.genero
      formPaciente.value.curp_valido = true
      return { valido: true, mensaje: 'CURP válida y datos verificados con RENAPO' }
    }
    return { valido: false, mensaje: 'CURP no encontrada en RENAPO' }
  } catch (e) {
    return { valido: false, mensaje: 'Error al verificar CURP con RENAPO' }
  } finally {
    formPaciente.value.curp_validando = false
  }
}

// Función para buscar CURP por RFC (opción secundaria)
async function buscarPorRfc(rfc: string) {
  if (!rfc || rfc.length !== 13) return null
  try {
    const response = await $fetch('/api/auth/buscar-por-rfc', {
      method: 'POST',
      body: { rfc }
    })
    return response
  } catch (e) {
    return null
  }
}

const formMedico = ref({
  nombre: '', apellido: '', email: '', password: '', telefono: '',
  cedula_profesional: '', consultorio_direccion: '',
  consultorio_ciudad: '', consultorio_estado: '', bio: '', titulo: 'Dr.',
  especialidad: '', rfc: '', curp: '', curp_valido: false, curp_validando: false,
  codigo_postal: '', colonia: ''
})

const coloniasMedico = ref<any[]>([])
const coloniasMedicoLoading = ref(false)
const coloniaMedicoManual = ref(false)
const tokenCookie = useCookie('token')
const usuarioCookie = useCookie('usuario')

async function validarCurpMedico() {
  const curp = formMedico.value.curp.toUpperCase().trim()
  if (!curp || curp.length !== 18) {
    error.value = 'La CURP debe tener exactamente 18 caracteres'
    return
  }
  formMedico.value.curp_validando = true
  error.value = ''
  try {
    const data: any = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) {
      formMedico.value.curp_valido = false
      error.value = data.error_msg || 'No se pudieron obtener datos de la CURP'
      return
    }
    const s = data.response?.Solicitante
    if (!s) {
      formMedico.value.curp_valido = false
      error.value = 'No se encontraron datos para esta CURP'
      return
    }
    formMedico.value.curp_valido = true
    if (!formMedico.value.nombre) formMedico.value.nombre = s.Nombres || formMedico.value.nombre
    if (!formMedico.value.apellido) {
      const ap = [s.ApellidoPaterno, s.ApellidoMaterno].filter(Boolean).join(' ')
      formMedico.value.apellido = ap || formMedico.value.apellido
    }
    if (!formMedico.value.rfc && s.RFC) formMedico.value.rfc = s.RFC
  } catch (e: any) {
    formMedico.value.curp_valido = false
    error.value = e?.data?.message || 'Error al validar CURP'
  } finally {
    formMedico.value.curp_validando = false
  }
}

let cpMedicoTimeout: ReturnType<typeof setTimeout> | null = null
watch(() => formMedico.value.codigo_postal, (val) => {
  formMedico.value.colonia = ''
  coloniaMedicoManual.value = false
  coloniasMedico.value = []
  if (cpMedicoTimeout) clearTimeout(cpMedicoTimeout)
  if (!val || val.length !== 5 || !/^\d{5}$/.test(val)) return
  cpMedicoTimeout = setTimeout(() => buscarColoniasMedico(val), 400)
})

async function buscarColoniasMedico(cp: string) {
  coloniasMedicoLoading.value = true
  coloniasMedico.value = []
  try {
    const data: any = await $fetch('/api/sepomex/colonias', { params: { zip_code: cp } })
    coloniasMedico.value = data?.colonias || []
    if (data?.ciudad && !formMedico.value.consultorio_ciudad) formMedico.value.consultorio_ciudad = data.ciudad
    if (data?.estado && !formMedico.value.consultorio_estado) formMedico.value.consultorio_estado = data.estado
  } catch (e) {
    coloniasMedico.value = []
  }
  coloniasMedicoLoading.value = false
}

const esPlanPago = computed(() => {
  const p = paquetes.value.find((p: any) => p.id === paqueteSeleccionado.value)
  return p && p.precio > 0
})

async function cargarDatos() {
  try {
    const [paq, config] = await Promise.all([
      $fetch('/api/paquetes'),
      $fetch('/api/pagos/configuracion')
    ])
    paquetes.value = paq.paquetes || []
    pagosConfigurados.value = config.configurado

    // Si viene plan desde URL, pre-seleccionar e ir al paso 2
    const planSlug = route.query.plan as string
    if (planSlug) {
      const plan = paquetes.value.find((p: any) => p.slug === planSlug)
      if (plan) {
        paqueteSeleccionado.value = plan.id
        formPaciente.value.id_paquete = plan.id
        paso.value = 'plan'
      }
    } else {
      const basico = paquetes.value.find(p => p.slug === 'basico')
      if (basico) {
        paqueteSeleccionado.value = basico.id
        formPaciente.value.id_paquete = basico.id
      }
    }
  } catch (e) {
    console.error('Error cargando datos:', e)
  }
}

onMounted(cargarDatos)

function seleccionarPaquete(id: string) {
  paqueteSeleccionado.value = id
  formPaciente.value.id_paquete = id
}

function continuarAlPlan() {
  if (!formPaciente.value.nombre || !formPaciente.value.telefono || !formPaciente.value.email || !formPaciente.value.password || !formPaciente.value.acepta_terminos) {
    error.value = 'Completa nombre, teléfono, correo, contraseña y acepta los Términos'
    return
  }
  error.value = ''
  paso.value = 'plan'
}

async function handleSubmit() {
  error.value = ''
  if (tipo.value === 'medico') {
    if (!formMedico.value.nombre || !formMedico.value.apellido || !formMedico.value.email || !formMedico.value.password || !formMedico.value.especialidad) {
      error.value = 'Completa todos los campos requeridos'
      return
    }
    if (!formMedico.value.curp || formMedico.value.curp.length !== 18) {
      error.value = 'La CURP es requerida (18 caracteres)'
      return
    }
    if (!formMedico.value.curp_valido) {
      error.value = 'Valida tu CURP antes de continuar'
      return
    }
    if (!formMedico.value.codigo_postal || !/^\d{5}$/.test(formMedico.value.codigo_postal)) {
      error.value = 'El código postal debe tener 5 dígitos'
      return
    }
  }

  if (tipo.value === 'paciente') {
    if (!formPaciente.value.id_paquete) { error.value = 'Selecciona un plan'; return }
    if (esPlanPago.value && (!formPaciente.value.curp || !formPaciente.value.beneficiario_nombre || !formPaciente.value.acepta_seguro)) {
      error.value = 'Para planes de pago completa CURP, beneficiario y acepta condiciones del seguro'
      return
    }
    // Validar CURP para planes de pago
    if (esPlanPago.value) {
      const validation = await validarCurp(formPaciente.value.curp)
      if (!validation.valido) {
        error.value = validation.mensaje
        return
      }
    }
  }

  loading.value = true
  try {
    const endpoint = tipo.value === 'paciente' ? '/api/auth/registro-paciente' : '/api/auth/registro-medico'
    const body = tipo.value === 'paciente' ? { ...formPaciente.value } : { ...formMedico.value }
    const res: any = await $fetch(endpoint, { method: 'POST', body })

    tokenCookie.value = res.token
    usuarioCookie.value = res.usuario

    // Si hay pago pendiente (plan de pago), redirigir a checkout
    const pagoId = res.pago_id
    if (pagoId && tipo.value === 'paciente') {
      router.push({ path: '/checkout', query: { pago_id: pagoId } })
      return
    }

    // Mostrar mensaje de confirmación de correo en lugar de redirigir directamente
    if (tipo.value === 'paciente') {
      emailConfirmMessage.value = '¡Registro exitoso! Hemos enviado un correo de confirmación a ' + res.usuario.email + '. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para confirmar tu cuenta.'
      showEmailConfirm.value = true
    } else {
      // Para médicos, redirigir directamente al dashboard
      router.push('/dashboard/medico')
    }
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al registrarse'
  } finally {
    loading.value = false
  }
}

function irADashboard() {
  showEmailConfirm.value = false
  router.push('/dashboard/paciente')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>
        <h1>Crear tu Cuenta</h1>
        <p>Únete a MediProtect</p>
      </div>

      <!-- Selector Paciente / Médico -->
      <div class="tipo-selector">
        <button type="button" :class="['tipo-btn', { active: tipo === 'paciente' }]" @click="tipo = 'paciente'; paso = 'datos'">Soy Paciente</button>
        <button type="button" :class="['tipo-btn', { active: tipo === 'medico' }]" @click="tipo = 'medico'">Soy Médico</button>
      </div>

      <!-- PASO 1: AFILIACIÓN GRATUITA -->
      <div v-if="tipo === 'paciente' && paso === 'datos'" class="auth-form paciente-redirect">
        <div class="redirect-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#f0fff4"/>
            <path d="M32 20v24M20 32h24" stroke="#00b894" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <h2>Registro de Paciente</h2>
        <p class="redirect-desc">Valida tu CURP y completa tus datos en un proceso rapido y seguro</p>
        <button type="button" class="btn-primary btn-register" @click="navigateTo('/registro-curp')">
          Registrarme como Paciente
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <p class="auth-footer">¿Ya tienes cuenta? <NuxtLink to="/login">Inicia sesion</NuxtLink></p>
      </div>

      <!-- PASO 2: SELECCIÓN DE PLAN -->
      <form v-if="tipo === 'paciente' && paso === 'plan'" @submit.prevent="handleSubmit" class="auth-form">
        <h2 class="form-section-title">Elige tu Plan</h2>

        <div class="planes-grid">
          <div v-for="p in planesDisponibles" :key="p.id" class="plan-card" :class="{ selected: paqueteSeleccionado === p.id }" @click="seleccionarPaquete(p.id)">
            <div class="plan-header">
              <span class="plan-nombre">{{ p.nombre }}</span>
              <span class="plan-precio">{{ p.precio > 0 ? '$' + p.precio.toLocaleString() + '/mes' : 'Gratis' }}</span>
            </div>
            <ul class="plan-beneficios">
              <li v-for="b in p.beneficios" :key="b.beneficio">{{ b.beneficio }}</li>
            </ul>
            <div class="plan-check" v-if="paqueteSeleccionado === p.id">✓ Seleccionado</div>
          </div>
        </div>

        <!-- Fecha de nacimiento (siempre requerida) -->
        <div class="form-group">
          <label>Fecha de Nacimiento *</label>
          <input v-model="formPaciente.fecha_nacimiento" type="date" required />
          <span v-if="formPaciente.datos_renapo && formPaciente.fecha_nacimiento" class="field-hint">Auto-completada desde tu CURP</span>
        </div>

        <!-- Género (siempre requerido) -->
        <div class="form-group">
          <label>Género *</label>
          <select v-model="formPaciente.genero" required>
            <option value="">Seleccionar...</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
          <span v-if="formPaciente.datos_renapo && formPaciente.genero" class="field-hint">Auto-completado desde tu CURP</span>
        </div>

        <!-- Campos adicionales para planes de pago -->
        <div v-if="esPlanPago" class="seguro-section">
          <div class="seguro-banner">
            <p><strong>Seguro por Accidentes Personales</strong></p>
            <p class="seguro-text">Respaldo por <strong>VRIM</strong> en convenio con <strong>Grupo Financiero Inbursa</strong></p>
          </div>

          <h3 class="form-section-subtitle">Datos para la póliza de seguro</h3>

          <div class="form-group"><label>CURP *</label>
          <div class="curp-input-group">
            <input v-model="formPaciente.curp" type="text" placeholder="18 caracteres" maxlength="18" required />
            <button 
              type="button" 
              @click="validarCurp(formPaciente.curp)" 
              :disabled="formPaciente.curp_validando || formPaciente.curp.length !== 18"
              class="btn-validar-curp"
            >
              {{ formPaciente.curp_validando ? 'Validando...' : 'Validar CURP' }}
            </button>
          </div>
          <div class="curp-validation" v-if="formPaciente.curp_valido">
            <span class="valid-icon">✅</span>
            <span class="valid-text">CURP válida y verificada con RENAPO</span>
          </div>
          <div class="curp-validation error" v-else-if="formPaciente.curp && !formPaciente.curp_valido && !formPaciente.curp_validando">
            <span class="error-icon">❌</span>
            <span class="error-text">CURP inválida</span>
          </div>
<div class="curp-validation info" v-if="formPaciente.datos_renapo">
            <span class="info-icon">ℹ️</span>
            <span>Datos completados: {{ formPaciente.datos_renapo.nombre }} {{ formPaciente.datos_renapo.apellido }} | {{ formPaciente.datos_renapo.fecha_nacimiento }} | {{ formPaciente.datos_renapo.genero }}</span>
          </div>

          <div class="form-group"><label>Domicilio completo</label><input v-model="formPaciente.direccion" type="text" placeholder="Calle, número, colonia" /></div>

          <!-- Cómo nos conociste -->
          <div class="form-group">
            <label>¿Cómo nos conociste?</label>
            <select v-model="formPaciente.como_nos_conociste">
              <option value="">Seleccionar...</option>
              <option value="google">Google / Búsqueda web</option>
              <option value="facebook">Facebook / Instagram</option>
              <option value="referido">Referido por un amigo/familiar</option>
              <option value="medico">Recomendado por mi médico</option>
              <option value="publicidad">Publicidad / Anuncio</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group"><label>Código Postal</label><input v-model="formPaciente.codigo_postal" type="text" placeholder="72000" maxlength="5" /></div>
            <div class="form-group"><label>Estado</label>
              <select v-model="formPaciente.estado">
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
            <div class="form-group"><label>Municipio</label><input v-model="formPaciente.municipio" type="text" placeholder="Municipio" /></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Estado civil</label>
              <select v-model="formPaciente.estado_civil">
                <option value="">Seleccionar...</option>
                <option value="soltero">Soltero(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viudo">Viudo(a)</option>
                <option value="union_libre">Unión libre</option>
              </select>
            </div>
            <div class="form-group"><label>Ocupación</label><input v-model="formPaciente.ocupacion" type="text" placeholder="Ej: Ingeniero" /></div>
            <div class="form-group"><label>Hospital / Consultorio</label><input v-model="formPaciente.hospital_consultorio" type="text" placeholder="Ej: Hospital Ángeles" /></div>
          </div>

          <h3 class="form-section-subtitle">Beneficiario(s)</h3>
          <div class="form-group"><label>Nombre completo *</label><input v-model="formPaciente.beneficiario_nombre" type="text" placeholder="Nombre del beneficiario" /></div>
          <div class="form-row">
            <div class="form-group"><label>Parentesco</label><input v-model="formPaciente.beneficiario_parentesco" type="text" placeholder="Ej: Esposo/a" /></div>
            <div class="form-group"><label>Teléfono</label><input v-model="formPaciente.beneficiario_telefono" type="tel" placeholder="2221234567" /></div>
          </div>

          <div v-for="(ben, idx) in formPaciente.beneficiarios" :key="idx" class="beneficiario-card">
            <div class="beneficiario-header">
              <strong>Beneficiario {{ idx + 2 }}</strong>
              <button type="button" class="btn-remove-ben" @click="formPaciente.beneficiarios.splice(idx, 1)">✕</button>
            </div>
            <div class="form-group"><label>Nombre</label><input v-model="ben.nombre" type="text" placeholder="Nombre completo" /></div>
            <div class="form-row">
              <div class="form-group"><label>Apellido paterno</label><input v-model="ben.apellido_paterno" type="text" /></div>
              <div class="form-group"><label>Apellido materno</label><input v-model="ben.apellido_materno" type="text" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Parentesco</label><input v-model="ben.parentesco" type="text" placeholder="Ej: Hijo/a" /></div>
              <div class="form-group"><label>Teléfono</label><input v-model="ben.telefono" type="tel" placeholder="2221234567" /></div>
            </div>
          </div>
          <button type="button" class="btn-add-ben" @click="formPaciente.beneficiarios.push({ nombre: '', apellido_paterno: '', apellido_materno: '', parentesco: '', telefono: '' })">+ Agregar otro beneficiario</button>

          <h3 class="form-section-subtitle">Identificación oficial</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo</label>
              <select v-model="formPaciente.identificacion_tipo">
                <option value="INE">INE</option>
                <option value="pasaporte">Pasaporte</option>
                <option value="licencia">Licencia</option>
              </select>
            </div>
            <div class="form-group"><label>Número</label><input v-model="formPaciente.identificacion_numero" type="text" placeholder="Número de identificación" /></div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formPaciente.acepta_seguro" />
              <span>Acepto las condiciones específicas del seguro por accidentes personales respaldado por VRIM / Grupo Financiero Inbursa *</span>
            </label>
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <div class="btn-row">
          <button type="button" @click="paso = 'datos'" class="btn-secondary">← Atrás</button>
          <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Registrando...' : 'Crear Cuenta' }}</button>
        </div>
      </form>

      <!-- Mensaje de confirmación de correo -->
      <div v-if="showEmailConfirm && tipo === 'paciente'" class="auth-form email-confirm-screen">
        <div class="confirm-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="#00b894" stroke-width="3" fill="#f0fff4"/>
            <path d="M20 32l8 8 16-16" stroke="#00b894" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <h2>¡Registro Exitoso!</h2>
        <p class="confirm-message">{{ emailConfirmMessage }}</p>
        <button type="button" class="btn-primary btn-confirm" @click="irADashboard">
          Ir a mi Panel
        </button>
        <p class="auth-footer">También puedes <NuxtLink to="/login">iniciar sesión</NuxtLink> más tarde</p>
      </div>

      <!-- FORMULARIO MÉDICO (sin cambios) -->
      <form v-if="tipo === 'medico'" @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-row">
          <div class="form-group"><label>Nombre</label><input v-model="formMedico.nombre" type="text" placeholder="Dr. Juan" required /></div>
          <div class="form-group"><label>Apellido</label><input v-model="formMedico.apellido" type="text" placeholder="Pérez" required /></div>
        </div>
        <div class="form-group"><label>Correo electrónico</label><input v-model="formMedico.email" type="email" placeholder="correo@ejemplo.com" required /></div>
        <div class="form-group"><label>Contraseña</label><input v-model="formMedico.password" type="password" placeholder="Mínimo 6 caracteres" required /></div>
        <div class="form-group">
          <label>CURP *</label>
          <div class="curp-input-group">
            <input v-model="formMedico.curp" type="text" placeholder="18 caracteres" maxlength="18" style="text-transform:uppercase; font-family:monospace; letter-spacing:1px;" @keyup.enter="formMedico.curp.length === 18 && validarCurpMedico()" required />
            <button type="button" class="btn-validar-curp" @click="validarCurpMedico()" :disabled="formMedico.curp_validando || formMedico.curp.length !== 18">
              {{ formMedico.curp_validando ? 'Validando...' : 'Validar CURP' }}
            </button>
          </div>
          <div class="curp-validation" v-if="formMedico.curp_valido">
            <span class="valid-icon">✅</span>
            <span class="valid-text">CURP válida y verificada</span>
          </div>
          <div class="curp-validation error" v-else-if="formMedico.curp && !formMedico.curp_valido && !formMedico.curp_validando && formMedico.curp.length === 18">
            <span class="error-icon">❌</span>
            <span class="error-text">CURP inválida</span>
          </div>
        </div>
         <div class="form-row">
           <div class="form-group"><label>Teléfono</label><input v-model="formMedico.telefono" type="tel" placeholder="2221234567" /></div>
           <div class="form-group"><label>Cédula Profesional</label><input v-model="formMedico.cedula_profesional" type="text" placeholder="12345678" /></div>
         </div>
         <div class="form-row">
           <div class="form-group"><label>RFC (opcional)</label><input v-model="formMedico.rfc" type="text" placeholder="ABC123456DEF" maxlength="13" /></div>
           <div class="form-group"><label>Especialidad</label><input v-model="formMedico.especialidad" type="text" placeholder="Ej: Medicina General" required /></div>
         </div>
        <div class="form-group"><label>Dirección del Consultorio</label><input v-model="formMedico.consultorio_direccion" type="text" placeholder="Calle, número" /></div>
        <div class="form-row">
          <div class="form-group"><label>Código Postal</label><input v-model="formMedico.codigo_postal" type="text" placeholder="72000" maxlength="5" @input="formMedico.codigo_postal = formMedico.codigo_postal.replace(/\D/g, '')" /></div>
          <div class="form-group">
            <label>Colonia</label>
            <template v-if="coloniasMedico.length > 0 && !coloniaMedicoManual">
              <select v-model="formMedico.colonia">
                <option value="">Seleccionar colonia...</option>
                <option v-for="c in coloniasMedico" :key="c.colonia" :value="c.colonia">{{ c.colonia }}</option>
              </select>
              <span class="sepomex-hint" @click="coloniaMedicoManual = true">Escribir manualmente</span>
            </template>
            <template v-else>
              <input v-model="formMedico.colonia" type="text" placeholder="Nombre de la colonia" />
              <span v-if="coloniasMedico.length > 0 && coloniaMedicoManual" class="sepomex-hint" @click="coloniaMedicoManual = false">Elegir del listado</span>
            </template>
            <span v-if="coloniasMedicoLoading" class="loading-hint"><span class="spinner-xs"></span> Buscando colonias...</span>
            <span v-else-if="formMedico.codigo_postal && formMedico.codigo_postal.length === 5 && !coloniaMedicoManual && coloniasMedico.length === 0 && !coloniasMedicoLoading" class="loading-hint">No se encontraron colonias para este CP, ingresa manualmente</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Ciudad</label><input v-model="formMedico.consultorio_ciudad" type="text" placeholder="Puebla" /></div>
          <div class="form-group"><label>Estado</label><input v-model="formMedico.consultorio_estado" type="text" placeholder="Puebla" /></div>
        </div>
        <div class="form-group"><label>Sobre ti</label><textarea v-model="formMedico.bio" placeholder="Breve descripción profesional..." rows="3"></textarea></div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Registrando...' : 'Crear Cuenta' }}</button>
        <p class="auth-footer">¿Ya tienes cuenta? <NuxtLink to="/login">Inicia sesión</NuxtLink></p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-section-title { font-size: 1.1rem; color: #2d3436; margin-bottom: 1rem; font-weight: 700; }
.plan-seleccionado-banner { display: flex; justify-content: space-between; align-items: center; background: #f0fff4; border: 1px solid #00b894; border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; }
.cambiar-plan { color: #0984e3; font-size: 0.85rem; text-decoration: none; }
.form-section-subtitle { font-size: 0.95rem; color: #2d3436; margin: 1.2rem 0 0.6rem; font-weight: 600; border-top: 1px solid #eee; padding-top: 0.8rem; }
.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.checkbox-group { margin-top: 0.3rem; }
.checkbox-label { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.85rem; color: #636e72; cursor: pointer; }
.checkbox-label input[type="checkbox"] { margin-top: 0.2rem; width: auto; }
.checkbox-label a { color: #0984e3; }
.btn-row { display: flex; gap: 0.8rem; }
.btn-secondary { background: #dfe6e9; color: #2d3436; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-primary.full { width: 100%; }
.planes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.8rem; margin-bottom: 1rem; }
.plan-card { border: 2px solid #e0e0e0; border-radius: 10px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: #fafafa; position: relative; }
.plan-card:hover { border-color: #0984e3; }
.plan-card.selected { border-color: #00b894; background: #f0fff4; }
.plan-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
.plan-nombre { font-weight: 700; font-size: 1rem; }
.plan-precio { font-size: 0.9rem; color: #636e72; }
.plan-beneficios { list-style: none; padding: 0; margin: 0 0 0.5rem 0; }
.plan-beneficios li { font-size: 0.78rem; color: #636e72; padding: 0.15rem 0; }
.plan-check { position: absolute; top: 0.5rem; right: 0.5rem; color: #00b894; font-weight: 700; font-size: 0.85rem; }
.seguro-section { margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
.seguro-banner { background: #f0f4ff; border: 1px solid #d0d9ff; border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; }
.seguro-banner p { margin: 0.2rem 0; }
.seguro-text { color: #636e72; font-size: 0.8rem; }

.curp-input-group { display: flex; gap: 0.5rem; }
.curp-input-group input { flex: 1; padding: 0.6rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; font-family: monospace; text-transform: uppercase; }
.btn-validar-curp { background: #0984e3; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
.btn-validar-curp:hover:not(:disabled) { background: #0770c2; }
.btn-validar-curp:disabled { opacity: 0.5; cursor: not-allowed; }
.curp-validation { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.4rem; font-size: 0.82rem; padding: 0.4rem 0.6rem; border-radius: 6px; }
.curp-validation .valid-icon, .curp-validation .error-icon, .curp-validation .info-icon { font-size: 0.9rem; }
.curp-validation:not(.error):not(.info) { background: #e8f5e9; color: #2e7d32; }
.curp-validation.error { background: #ffebee; color: #c62828; }
.curp-validation.info { background: #e3f2fd; color: #1565c0; }
.sepomex-hint, .loading-hint { display: inline-block; margin-top: 0.35rem; font-size: 0.78rem; color: #0984e3; cursor: pointer; }
.sepomex-hint:hover { text-decoration: underline; }
.loading-hint { color: #636e72; cursor: default; display: flex; align-items: center; gap: 0.4rem; }
.spinner-xs { width: 12px; height: 12px; border: 2px solid #dfe6e9; border-top-color: #0984e3; border-radius: 50%; display: inline-block; animation: spin-xs .6s linear infinite; }
@keyframes spin-xs { to { transform: rotate(360deg); } }
.beneficiario-card { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
.beneficiario-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.beneficiario-header strong { font-size: 0.9rem; color: #2d3436; }
.btn-remove-ben { background: none; border: none; color: #d63031; cursor: pointer; font-size: 1.1rem; padding: 0.2rem 0.5rem; }
.btn-remove-ben:hover { background: #ffebee; border-radius: 4px; }
.btn-add-ben { background: none; border: 1px dashed #00b894; color: #00b894; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; width: 100%; margin-top: 0.5rem; }
.btn-add-ben:hover { background: #f0fff4; }

/* Redirect to CURP registration */
.paciente-redirect { text-align: center; padding: 2rem 0; }
.redirect-icon { margin-bottom: 1rem; }
.paciente-redirect h2 { font-size: 1.3rem; color: #2d3436; margin: 0 0 0.5rem; }
.redirect-desc { color: #636e72; font-size: 0.9rem; margin: 0 0 1.5rem; line-height: 1.5; }
.btn-register {
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: white; border: none; padding: 0.85rem 2rem; border-radius: 10px;
  cursor: pointer; font-size: 1rem; font-weight: 600;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: all 0.2s;
}
.btn-register:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,184,148,0.3); }

@media (max-width: 640px) {
  .form-row > .form-group { flex: 1 1 100%; min-width: 0; }
  .curp-input-group { flex-direction: column; }
  .planes-grid { grid-template-columns: 1fr; }
  .plan-seleccionado-banner { flex-direction: column; gap: 0.5rem; text-align: center; }
}

/* Email confirmation screen */
.email-confirm-screen { text-align: center; padding: 2rem 0; }
.confirm-icon { margin-bottom: 1rem; }
.email-confirm-screen h2 { font-size: 1.3rem; color: #2d3436; margin: 0 0 0.5rem; }
.confirm-message { color: #636e72; font-size: 0.9rem; margin: 0 0 1.5rem; line-height: 1.6; }
.btn-confirm {
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: white; border: none; padding: 0.85rem 2rem; border-radius: 10px;
  cursor: pointer; font-size: 1rem; font-weight: 600;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: all 0.2s;
}
.btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,184,148,0.3); }
</style>
