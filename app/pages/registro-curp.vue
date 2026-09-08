<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const doctorFromUrl = ref(route.query.doctor as string || '')

const paso = ref(1)
const totalPasos = 4
const loading = ref(false)
const errorMsg = ref('')
const tokenCookie = useCookie('token')
const usuarioCookie = useCookie('usuario')

// PASO 1: CURP
const curpInput = ref('')
const curpValidando = ref(false)
const curpError = ref('')
const curpDatos = ref<any>(null)
let curpTimeout: ReturnType<typeof setTimeout> | null = null

watch(curpInput, () => {
  if (curpError.value) curpError.value = ''
  if (curpDatos.value && curpDatos.value.Solicitante?.Curp !== curpInput.value.toUpperCase().trim()) {
    curpDatos.value = null
  }
  if (curpTimeout) clearTimeout(curpTimeout)
})

// PASO 2: CURP data confirmed (no extra state needed)

// PASO 3: Datos de contacto
const formContacto = reactive({
  email: '', password: '', password2: '',
  telefono: '', direccion: '', ciudad: '',
  estado: '', municipio: '', codigo_postal: '', colonia: ''
})

// Sepomex: Colonias por CP
const colonias = ref<any[]>([])
const coloniasLoading = ref(false)
const coloniaManual = ref(false)

// PASO 4: Plan
const paquetes = ref<any[]>([])
const paqueteSeleccionado = ref<any>(null)

// Popup de pago
const showPagoPopup = ref(false)
const procesandoPago = ref(false)

const passwordMatch = computed(() => formContacto.password === formContacto.password2 && formContacto.password2.length > 0)

let cpTimeout: ReturnType<typeof setTimeout> | null = null
watch(() => formContacto.codigo_postal, (val) => {
  formContacto.colonia = ''
  coloniaManual.value = false
  colonias.value = []
  if (cpTimeout) clearTimeout(cpTimeout)
  if (!val || val.length !== 5 || !/^\d{5}$/.test(val)) return
  cpTimeout = setTimeout(() => buscarColonias(val), 400)
})

async function buscarColonias(cp: string) {
  coloniasLoading.value = true
  colonias.value = []
  try {
    const data: any = await $fetch('/api/sepomex/colonias', { params: { zip_code: cp } })
    colonias.value = data?.colonias || []
    if (data?.municipio && !formContacto.municipio) formContacto.municipio = data.municipio
    if (data?.ciudad && !formContacto.ciudad) formContacto.ciudad = data.ciudad
    if (data?.estado && !formContacto.estado) formContacto.estado = data.estado
  } catch (e) {
    colonias.value = []
  }
  coloniasLoading.value = false
}

const curpTexto = computed(() => {
  if (!curpInput.value) return ''
  const c = curpInput.value.toUpperCase()
  return `${c.slice(0,4)} ${c.slice(4,10)} ${c.slice(10,11)} ${c.slice(11,16)} ${c.slice(16,18)}`
})

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/paquetes')
    paquetes.value = data?.paquetes || []
  } catch (e) { console.error(e) }
})

// ========== PASO 1: VALIDAR CURP ==========
async function validarCURP() {
  curpError.value = ''
  curpDatos.value = null
  const curp = curpInput.value.toUpperCase().trim()
  if (!curp || curp.length !== 18) {
    curpError.value = 'La CURP debe tener exactamente 18 caracteres'
    return
  }
  curpValidando.value = true
  try {
    const data: any = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) {
      curpError.value = data.error_msg || 'No se pudieron obtener datos de la CURP'
      return
    }
    curpDatos.value = data.response
    if (curpTimeout) clearTimeout(curpTimeout)
    curpTimeout = setTimeout(() => {
      if (curpDatos.value) paso.value = 2
    }, 800)
  } catch (e: any) {
    curpError.value = e?.data?.message || 'Error al validar CURP'
  }
  curpValidando.value = false
}

// ========== PASO 2: CONFIRMAR DATOS CURP ==========
function confirmarDatos() {
  if (!curpDatos.value?.Solicitante) {
    errorMsg.value = 'No hay datos de CURP validados, vuelve al paso 1'
    paso.value = 1
    return
  }
  paso.value = 3
}

// ========== PASO 3: VALIDAR CONTACTO ==========
function validarContacto() {
  errorMsg.value = ''
  if (!formContacto.email) { errorMsg.value = 'El email es requerido para acceder a tu cuenta'; return false }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formContacto.email)) { errorMsg.value = 'Email invalido'; return false }
  if (!formContacto.password || formContacto.password.length < 6) { errorMsg.value = 'La contrasena debe tener al menos 6 caracteres'; return false }
  if (formContacto.password !== formContacto.password2) { errorMsg.value = 'Las contrasenas no coinciden'; return false }
  if (!formContacto.telefono) { errorMsg.value = 'El telefono de WhatsApp es requerido para notificaciones'; return false }
  if (formContacto.telefono.length < 10) { errorMsg.value = 'El telefono debe tener al menos 10 digitos'; return false }
  return true
}

function siguientePaso() {
  errorMsg.value = ''
  if (paso.value === 3 && !validarContacto()) return
  if (paso.value === 4) return
  if (paso.value < totalPasos) paso.value++
}

function pasoAnterior() {
  errorMsg.value = ''
  if (paso.value > 1) paso.value--
}

// ========== PASO 4: PLAN ==========
function seleccionarPlan(plan: any) {
  paqueteSeleccionado.value = plan
}

function continuarPlan() {
  errorMsg.value = ''
  if (!paqueteSeleccionado.value) { errorMsg.value = 'Selecciona un plan'; return }

  if (parseFloat(paqueteSeleccionado.value.precio) === 0) {
    completarRegistro()
  } else {
    showPagoPopup.value = true
  }
}

function cerrarPagoPopup() {
  showPagoPopup.value = false
}

async function procesarPago() {
  procesandoPago.value = true
  await completarRegistro(true)
  procesandoPago.value = false
}

// ========== REGISTRO COMPLETO ==========
async function completarRegistro(esPago = false) {
  errorMsg.value = ''
  loading.value = true
  try {
    const s = curpDatos.value?.Solicitante || {}
    const body: any = {
      nombre: s.Nombres || '',
      apellido_paterno: s.ApellidoPaterno || '',
      apellido_materno: s.ApellidoMaterno || '',
      email: formContacto.email,
      password: formContacto.password,
      telefono: formContacto.telefono,
      fecha_nacimiento: s.FechaNacimiento || null,
      genero: s.ClaveSexo === 'H' ? 'masculino' : s.ClaveSexo === 'M' ? 'femenino' : null,
      curp: curpInput.value.toUpperCase().trim(),
      direccion: formContacto.direccion || null,
      ciudad: formContacto.ciudad || null,
      estado: formContacto.estado || s.EntidadNacimiento || null,
      municipio: formContacto.municipio || null,
      codigo_postal: formContacto.codigo_postal || null,
      colonia: formContacto.colonia || null,
      id_paquete: paqueteSeleccionado.value?.id || null,
      acepta_terminos: true,
      acepta_marketing: false
    }
    const res: any = await $fetch('/api/auth/registro-paciente', { method: 'POST', body })
    tokenCookie.value = res.token
    usuarioCookie.value = res.usuario
    localStorage.setItem('usuario', JSON.stringify(res.usuario))

    const pagoId = res.pago_id
    if (pagoId) {
      navigateTo({ path: '/checkout', query: { pago_id: pagoId, doctor: doctorFromUrl.value } })
    } else if (doctorFromUrl.value) {
      navigateTo({ path: '/agendar-cita', query: { doctor: doctorFromUrl.value } })
    } else {
      navigateTo('/dashboard/paciente')
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Error al registrar'
  }
  loading.value = false
}

function formatoFecha(fecha: string) {
  if (!fecha) return ''
  if (fecha.includes('-')) {
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }
  if (fecha.includes('/')) {
    const [d, m, y] = fecha.split('/')
    return `${d}/${m}/${y}`
  }
  return fecha
}

const esPlanGratis = computed(() => paqueteSeleccionado.value && parseFloat(paqueteSeleccionado.value.precio) === 0)
const esPlanPago = computed(() => paqueteSeleccionado.value && parseFloat(paqueteSeleccionado.value.precio) > 0)
</script>

<template>
  <div class="reg-page">
    <!-- HEADER -->
    <header class="reg-header">
      <div class="header-inner">
        <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" />
        <NuxtLink to="/login" class="login-link">Ya tengo cuenta</NuxtLink>
      </div>
    </header>

    <!-- PROGRESS BAR -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: ((paso / totalPasos) * 100) + '%' }"></div>
      </div>

      <div class="progress-steps">
        <div v-for="i in totalPasos" :key="i" class="progress-step" :class="{ active: paso >= i, current: paso === i }">
          <div class="step-circle">
            <span v-if="paso > i" class="check-icon">&#10003;</span>
            <span v-else>{{ i }}</span>
          </div>
          <span class="step-label">{{ i === 1 ? 'CURP' : i === 2 ? 'Datos' : i === 3 ? 'Contacto' : 'Plan' }}</span>
        </div>
      </div>
    </div>

    <!-- CONTENT AREA CON TRANSICIONES -->
    <div class="steps-wrapper">
      <transition :name="paso > 1 ? 'slide-left' : 'slide-right'" mode="out-in">

        <!-- ==================== PASO 1: CURP ==================== -->
        <div v-if="paso === 1" key="paso1" class="step-content">
          <div class="step-card step-card--hero">
            <div class="step-visual">
              <div class="curp-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="#f0fff4"/>
                  <path d="M14 16h20M14 24h16M14 32h12" stroke="#00b894" stroke-width="2.5" stroke-linecap="round"/>
                  <circle cx="36" cy="36" r="8" fill="#00b894"/>
                  <path d="M34 36l1.5 1.5L39 34" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <h1>Valida tu CURP</h1>
            <p class="step-desc">Ingresa tu CURP para cargar tus datos automaticamente del registro civil</p>

            <div class="curp-display" v-if="curpInput">{{ curpTexto }}</div>

            <div class="curp-input-group">
              <input
                v-model="curpInput"
                maxlength="18"
                placeholder="Tu CURP (18 caracteres)"
                class="curp-field"
                :class="{ error: curpError, valid: curpDatos }"
                @keyup.enter="validarCURP"
                autocomplete="off"
              />
              <button
                class="btn-validate"
                @click="validarCURP"
                :disabled="curpValidando || curpInput.toUpperCase().trim().length !== 18"
              >
                <span v-if="curpValidando" class="spinner-sm"></span>
                <span v-else-if="curpDatos">&#10003; Validada</span>
                <span v-else>Validar</span>
              </button>
            </div>

            <transition name="fade">
              <div v-if="curpError" class="error-msg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ curpError }}
              </div>
            </transition>

            <transition name="fade">
              <div v-if="curpDatos" class="success-msg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2 2 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Datos cargados correctamente
              </div>
            </transition>

            <p class="hint-text">Ejemplo: XAXX010101HTCPRL09</p>
          </div>
        </div>

        <!-- ==================== PASO 2: DATOS DEL CURP ==================== -->
        <div v-else-if="paso === 2" key="paso2" class="step-content">
          <div class="step-card">
            <div class="step-visual">
              <div class="curp-icon curp-icon--blue">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="#f0f4ff"/>
                  <path d="M16 14h16v20H16z" stroke="#0984e3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M20 20h8M20 24h8M20 28h5" stroke="#0984e3" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>

            <h1>Tus Datos Oficiales</h1>
            <p class="step-desc">Verifica que la informacion sea correcta antes de continuar</p>

            <div v-if="curpDatos" class="curp-data-card">
              <div class="data-avatar">
                <span>{{ curpDatos.Solicitante?.Nombres?.charAt(0) }}{{ curpDatos.Solicitante?.ApellidoPaterno?.charAt(0) }}</span>
              </div>

              <div class="data-name">
                <h2>{{ curpDatos.Solicitante?.Nombres }} {{ curpDatos.Solicitante?.ApellidoPaterno }} {{ curpDatos.Solicitante?.ApellidoMaterno }}</h2>
                <span class="data-curp">{{ curpTexto }}</span>
              </div>

              <div class="data-grid">
                <div class="data-item">
                  <span class="data-label">Sexo</span>
                  <span class="data-value">{{ curpDatos.Solicitante?.Sexo || 'N/A' }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">Fecha de Nacimiento</span>
                  <span class="data-value">{{ formatoFecha(curpDatos.Solicitante?.FechaNacimiento) || 'N/A' }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">Lugar de Nacimiento</span>
                  <span class="data-value">{{ curpDatos.Solicitante?.EntidadNacimiento || 'N/A' }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">Nacionalidad</span>
                  <span class="data-value">{{ curpDatos.Solicitante?.Nacionalidad || 'N/A' }}</span>
                </div>
                <div class="data-item" v-if="curpDatos.Solicitante?.Rfc">
                  <span class="data-label">RFC</span>
                  <span class="data-value data-value--mono">{{ curpDatos.Solicitante.Rfc }}</span>
                </div>
                <div class="data-item" v-if="curpDatos.Solicitante?.DocumentoIdentificacion">
                  <span class="data-label">INE / FIEL</span>
                  <span class="data-value data-value--mono">{{ curpDatos.Solicitante.DocumentoIdentificacion }}</span>
                </div>
              </div>

              <div class="data-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#0984e3" stroke-width="1.2"/><path d="M7 4v3M7 9v.5" stroke="#0984e3" stroke-width="1.2" stroke-linecap="round"/></svg>
                Esta informacion proviene del Registro Nacional de Poblacion (RENAPO)
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== PASO 3: DATOS DE CONTACTO ==================== -->
        <div v-else-if="paso === 3" key="paso3" class="step-content">
          <div class="step-card">
            <div class="step-visual">
              <div class="curp-icon curp-icon--orange">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="#fff8f0"/>
                  <path d="M14 34l4-6 4 4 6-10 6 8" stroke="#e17055" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="12" y="12" width="24" height="24" rx="3" stroke="#e17055" stroke-width="2"/>
                </svg>
              </div>
            </div>

            <h1>Datos de Contacto</h1>
            <p class="step-desc">Informacion para tu cuenta y comunicacion</p>

            <!-- Mini resumen CURP -->
            <div class="curp-summary" v-if="curpDatos">
              <div class="summary-avatar">
                <span>{{ curpDatos.Solicitante?.Nombres?.charAt(0) }}{{ curpDatos.Solicitante?.ApellidoPaterno?.charAt(0) }}</span>
              </div>
              <div class="summary-info">
                <strong>{{ curpDatos.Solicitante?.Nombres }} {{ curpDatos.Solicitante?.ApellidoPaterno }}</strong>
                <span>{{ curpTexto }}</span>
              </div>
            </div>

            <transition name="fade">
              <div v-if="errorMsg" class="error-msg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ errorMsg }}
              </div>
            </transition>

            <form @submit.prevent="siguientePaso" class="form-grid">
              <div class="form-section">
                <div class="section-tag section-tag--green">Cuenta</div>
                <div class="form-group">
                  <label>Email *</label>
                  <div class="input-wrapper">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l7 4 7-4" stroke="currentColor" stroke-width="1.2"/></svg>
                    <input v-model="formContacto.email" type="email" placeholder="correo@ejemplo.com" required />
                  </div>
                  <span class="field-hint">Con este email accederas a tu cuenta</span>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Contrasena *</label>
                    <div class="input-wrapper">
                      <svg class="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="7" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.2"/></svg>
                      <input v-model="formContacto.password" type="password" placeholder="Minimo 6 caracteres" required minlength="6" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Confirmar *</label>
                    <div class="input-wrapper">
                      <svg class="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="7" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.2"/></svg>
                      <input v-model="formContacto.password2" type="password" placeholder="Repite tu contrasena" required />
                    </div>
                    <span v-if="formContacto.password2" class="field-status" :class="passwordMatch ? 'ok' : 'error'">
                      {{ passwordMatch ? 'Coinciden' : 'No coinciden' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-tag section-tag--blue">Comunicacion</div>
                <div class="form-group">
                  <label>Telefono WhatsApp *</label>
                  <div class="input-wrapper">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2.5A1.5 1.5 0 014.5 1h7A1.5 1.5 0 0113 2.5v11a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13.5v-11z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="12" r="1" fill="currentColor"/></svg>
                    <input v-model="formContacto.telefono" type="tel" placeholder="10 digitos" required />
                  </div>
                  <span class="field-hint">Recibe notificaciones y confirmaciones de tus citas</span>
                </div>
              </div>

              <div class="form-section">
                <div class="section-tag section-tag--purple">Direccion</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Codigo Postal</label>
                    <input
                      v-model="formContacto.codigo_postal"
                      placeholder="Ej: 06600"
                      maxlength="5"
                      inputmode="numeric"
                      pattern="\d*"
                      @input="formContacto.codigo_postal = formContacto.codigo_postal.replace(/\D/g, '')"
                    />
                  </div>
                  <div class="form-group">
                    <label>Colonia</label>
                    <template v-if="colonias.length > 0 && !coloniaManual">
                      <select v-model="formContacto.colonia">
                        <option value="" disabled>Selecciona una colonia</option>
                        <option v-for="c in colonias" :key="c.colonia" :value="c.colonia">
                          {{ c.colonia }}
                        </option>
                      </select>
                      <span class="field-hint link-hint" @click="coloniaManual = true; formContacto.colonia = ''">
                        No encuentro mi colonia — agregar manualmente
                      </span>
                    </template>
                    <template v-else>
                      <input v-model="formContacto.colonia" placeholder="Colonia" />
                      <span v-if="colonias.length > 0" class="field-hint link-hint" @click="coloniaManual = false">
                        Volver a la lista
                      </span>
                      <span v-else-if="formContacto.codigo_postal && formContacto.codigo_postal.length === 5 && !coloniasLoading" class="field-hint">
                        No se encontraron colonias para este CP, ingresa manualmente
                      </span>
                    </template>
                    <span v-if="coloniasLoading" class="field-hint loading-hint">
                      <span class="spinner-xs"></span> Buscando colonias...
                    </span>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Municipio</label>
                    <input v-model="formContacto.municipio" placeholder="Municipio" />
                  </div>
                  <div class="form-group">
                    <label>Estado</label>
                    <input v-model="formContacto.estado" placeholder="Estado" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Ciudad</label>
                    <input v-model="formContacto.ciudad" placeholder="Ciudad" />
                  </div>
                  <div class="form-group">
                    <label>Direccion</label>
                    <div class="input-wrapper">
                      <svg class="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="2" stroke="currentColor" stroke-width="1.2"/></svg>
                      <input v-model="formContacto.direccion" placeholder="Calle, numero" />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- ==================== PASO 4: SELECCIONAR PLAN ==================== -->
        <div v-else-if="paso === 4" key="paso4" class="step-content">
          <div class="step-card">
            <div class="step-visual">
              <div class="curp-icon curp-icon--green">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="#f0fff4"/>
                  <path d="M15 24l6 6 12-12" stroke="#00b894" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <h1>Elige tu Plan</h1>
            <p class="step-desc">Selecciona el plan que mejor se adapte a tus necesidades</p>

            <transition name="fade">
              <div v-if="errorMsg" class="error-msg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ errorMsg }}
              </div>
            </transition>

            <div class="plans-grid">
              <div
                v-for="plan in paquetes" :key="plan.id"
                class="plan-card"
                :class="{
                  selected: paqueteSeleccionado?.id === plan.id,
                  free: parseFloat(plan.precio) === 0,
                  popular: plan.es_popular
                }"
                @click="seleccionarPlan(plan)"
              >
                <div class="plan-badge" v-if="plan.es_popular">Popular</div>
                <div class="plan-check" v-if="paqueteSeleccionado?.id === plan.id">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#00b894"/><path d="M6 10l3 3 5-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="plan-price">
                  <span class="currency" v-if="parseFloat(plan.precio) > 0">$</span>
                  <span class="amount">{{ parseFloat(plan.precio) === 0 ? 'Gratis' : plan.precio }}</span>
                  <span class="period" v-if="parseFloat(plan.precio) > 0">/mes</span>
                </div>
                <h3>{{ plan.nombre }}</h3>
                <p class="plan-desc" v-if="plan.descripcion">{{ plan.descripcion }}</p>
                <ul class="plan-features" v-if="plan.beneficios">
                  <li v-for="(b, i) in plan.beneficios.filter((x: any) => x.beneficio)" :key="i">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 5" stroke="#00b894" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    {{ b.beneficio }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- BOTTOM NAV -->
    <div class="reg-bottom">
      <button v-if="paso > 1" class="btn-back" @click="pasoAnterior">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Atras
      </button>
      <div v-else></div>

      <!-- PASO 1: Solo mostrar si NO hay datos validados -->
      <button
        v-if="paso === 1 && !curpDatos"
        class="btn-next"
        @click="validarCURP"
        :disabled="curpValidando || curpInput.toUpperCase().trim().length !== 18"
      >
        <span v-if="curpValidando" class="spinner-sm"></span>
        <span v-else>Validar CURP</span>
      </button>

      <!-- PASO 1: Despues de validar, avanzar -->
      <button
        v-if="paso === 1 && curpDatos"
        class="btn-next"
        @click="siguientePaso"
      >
        Continuar
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <!-- PASO 2: Confirmar datos CURP -->
      <button v-if="paso === 2" class="btn-next" @click="confirmarDatos">
        Los datos son correctos
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <!-- PASO 3: Siguiente a plan -->
      <button v-if="paso === 3" class="btn-next" @click="siguientePaso">
        Elegir Plan
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <!-- PASO 4: Crear cuenta -->
      <button
        v-if="paso === 4"
        class="btn-finish"
        @click="continuarPlan"
        :disabled="loading || !paqueteSeleccionado"
      >
        <span v-if="loading" class="spinner-sm"></span>
        <span v-else-if="esPlanGratis">Crear mi cuenta</span>
        <span v-else>Continuar al pago</span>
      </button>
    </div>

    <!-- ==================== POPUP DE PAGO ==================== -->
    <transition name="modal">
      <div v-if="showPagoPopup" class="modal-overlay" @click.self="cerrarPagoPopup">
        <div class="modal-content">
          <button class="modal-close" @click="cerrarPagoPopup">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>

          <div class="modal-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#fff8f0"/>
              <path d="M14 20h20v14H14z" stroke="#e17055" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 20l4-6h12l4 6" stroke="#e17055" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="24" cy="27" r="2" fill="#e17055"/>
            </svg>
          </div>

          <h2>Plan {{ paqueteSeleccionado?.nombre }}</h2>
          <p class="modal-subtitle">Para completar tu registro con este plan, realiza el pago de</p>

          <div class="modal-price">
            <span class="currency">$</span>
            <span class="amount">{{ paqueteSeleccionado?.precio }}</span>
            <span class="period">/mes</span>
          </div>

          <div class="modal-info">
            <div class="info-row">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00b894" stroke-width="1.2"/><path d="M4.5 7l2 2 3.5-4" stroke="#00b894" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Tu cuenta se creara con el plan <strong>Basico (Gratis)</strong></span>
            </div>
            <div class="info-row">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00b894" stroke-width="1.2"/><path d="M4.5 7l2 2 3.5-4" stroke="#00b894" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Al completar el pago, se activara tu plan premium</span>
            </div>
            <div class="info-row">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#00b894" stroke-width="1.2"/><path d="M4.5 7l2 2 3.5-4" stroke="#00b894" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Cancela en cualquier momento desde tu panel</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-modal-cancel" @click="cerrarPagoPopup">Elegir otro plan</button>
            <button class="btn-modal-pay" @click="procesarPago" :disabled="procesandoPago">
              <span v-if="procesandoPago" class="spinner-sm"></span>
              <span v-else>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8a7 7 0 0114 0 7 7 0 01-14 0z" stroke="white" stroke-width="1.2"/><path d="M5.5 8l2 2 3.5-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Pagar ahora
              </span>
            </button>
          </div>

          <p class="modal-note">Seras redirigido a la pasarela de pago segura</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.reg-page { min-height: 100vh; display: flex; flex-direction: column; background: linear-gradient(160deg, #f8fffe 0%, #f0f4ff 50%, #fff8f0 100%); }

/* HEADER */
.reg-header { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding: 0.75rem 1.5rem; border-bottom: 1px solid #e8e8e8; position: sticky; top: 0; z-index: 50; }
.header-inner { max-width: 700px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
.logo { height: 34px; }
.login-link { font-size: 0.85rem; color: #00b894; font-weight: 500; text-decoration: none; }
.login-link:hover { color: #00a884; }

/* PROGRESS */
.progress-container { padding: 1rem 1.5rem 0; max-width: 700px; margin: 0 auto; width: 100%; }
.progress-bar { height: 3px; background: #e8e8e8; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #00b894, #00cec9); transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 3px; }

.progress-steps { display: flex; justify-content: space-between; padding: 0.75rem 0 0; }
.progress-step { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; opacity: 0.35; transition: all 0.3s; flex: 1; }
.progress-step.active { opacity: 0.7; }
.progress-step.current { opacity: 1; }
.step-circle { width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; color: #999; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; transition: all 0.3s; }
.progress-step.active .step-circle { background: #00b894; color: white; }
.progress-step.current .step-circle { background: linear-gradient(135deg, #00b894, #00cec9); color: white; box-shadow: 0 0 0 4px rgba(0,184,148,0.2); }
.check-icon { font-size: 0.9rem; }
.step-label { font-size: 0.7rem; color: #636e72; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.progress-step.active .step-label { color: #2d3436; }

/* STEPS WRAPPER */
.steps-wrapper { flex: 1; display: flex; justify-content: center; padding: 1.5rem 1rem 7rem; overflow: hidden; }
.step-content { width: 100%; max-width: 600px; }

/* STEP CARD */
.step-card { background: white; border-radius: 20px; border: 1px solid #e8e8e8; padding: 2rem; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.step-card--hero { text-align: center; }
.step-visual { display: flex; justify-content: center; margin-bottom: 1rem; }
.curp-icon { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; background: #f0fff4; border-radius: 16px; }
.curp-icon--blue { background: #f0f4ff; }
.curp-icon--orange { background: #fff8f0; }
.curp-icon--green { background: #f0fff4; }
.step-card h1 { text-align: center; margin: 0 0 0.3rem; font-size: 1.35rem; color: #2d3436; font-weight: 700; }
.step-desc { text-align: center; color: #636e72; font-size: 0.88rem; margin: 0 0 1.5rem; line-height: 1.5; }

/* CURP DISPLAY */
.curp-display { text-align: center; font-family: 'SF Mono', 'Consolas', monospace; font-size: 1.4rem; letter-spacing: 4px; color: #00b894; font-weight: 700; margin-bottom: 1rem; padding: 0.75rem; background: #f0fff4; border-radius: 10px; border: 1px solid #e0f5ee; }

/* CURP INPUT */
.curp-input-group { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
.curp-field { flex: 1; padding: 0.9rem 1rem; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 1.05rem; font-family: 'SF Mono', 'Consolas', monospace; letter-spacing: 3px; text-transform: uppercase; transition: all 0.2s; text-align: center; background: #fafafa; }
.curp-field:focus { outline: none; border-color: #00b894; background: white; box-shadow: 0 0 0 4px rgba(0,184,148,0.1); }
.curp-field.error { border-color: #d63031; background: #fff5f5; }
.curp-field.valid { border-color: #00b894; background: #f0fff4; }
.btn-validate { background: linear-gradient(135deg, #00b894, #00cec9); color: white; border: none; padding: 0.9rem 1.5rem; border-radius: 12px; cursor: pointer; font-size: 0.9rem; font-weight: 600; white-space: nowrap; min-width: 120px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-validate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,184,148,0.3); }
.btn-validate:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

/* CURP DATA CARD (PASO 2) */
.curp-data-card { background: #f8f9fa; border: 1px solid #e8e8e8; border-radius: 14px; padding: 1.5rem; }
.data-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #00b894, #00cec9); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; margin: 0 auto 0.75rem; }
.data-name { text-align: center; margin-bottom: 1.25rem; }
.data-name h2 { font-size: 1.15rem; color: #2d3436; margin: 0 0 0.25rem; }
.data-curp { font-family: monospace; font-size: 0.8rem; color: #636e72; letter-spacing: 1px; }
.data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
.data-item { background: white; padding: 0.75rem; border-radius: 10px; border: 1px solid #eee; }
.data-label { display: block; font-size: 0.7rem; color: #636e72; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem; font-weight: 500; }
.data-value { font-size: 0.9rem; color: #2d3436; font-weight: 500; }
.data-value--mono { font-family: monospace; letter-spacing: 1px; }
.data-note { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: #0984e3; background: #f0f4ff; padding: 0.6rem 0.8rem; border-radius: 8px; }

/* CURP SUMMARY (PASO 3) */
.curp-summary { display: flex; align-items: center; gap: 0.75rem; background: #f8f9fa; border: 1px solid #e8e8e8; border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; }
.summary-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #00b894, #00cec9); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
.summary-info { display: flex; flex-direction: column; min-width: 0; }
.summary-info strong { font-size: 0.9rem; color: #2d3436; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.summary-info span { font-size: 0.75rem; color: #636e72; font-family: monospace; }

/* FORM */
.form-grid { display: flex; flex-direction: column; gap: 1rem; }
.form-section { position: relative; }
.section-tag { display: inline-block; font-size: 0.65rem; color: white; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 0.2rem 0.6rem; border-radius: 4px; margin-bottom: 0.75rem; }
.section-tag--green { background: #00b894; }
.section-tag--blue { background: #0984e3; }
.section-tag--purple { background: #6c5ce7; }
.form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.form-group { display: flex; flex-direction: column; flex: 1 1 100%; position: relative; }
.form-group label { font-size: 0.78rem; color: #636e72; margin-bottom: 0.25rem; font-weight: 500; }
.input-wrapper { position: relative; }
.input-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #b2bec3; pointer-events: none; }
.input-wrapper input { width: 100%; padding: 0.7rem 0.8rem 0.7rem 2.25rem; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 0.9rem; transition: all 0.2s; background: #fafafa; }
.input-wrapper input:focus { outline: none; border-color: #00b894; background: white; box-shadow: 0 0 0 3px rgba(0,184,148,0.08); }
.form-group > input:not(.input-wrapper input) { padding: 0.7rem 0.8rem; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 0.9rem; transition: all 0.2s; background: #fafafa; }
.form-group > input:not(.input-wrapper input):focus { outline: none; border-color: #00b894; background: white; box-shadow: 0 0 0 3px rgba(0,184,148,0.08); }
.field-hint { font-size: 0.72rem; color: #b2bec3; margin-top: 0.2rem; }
.link-hint { cursor: pointer; color: #0984e3; transition: color 0.2s; }
.link-hint:hover { color: #00b894; text-decoration: underline; }
.loading-hint { display: flex; align-items: center; gap: 0.35rem; }
.spinner-xs { width: 12px; height: 12px; border: 1.5px solid #b2bec3; border-top-color: #0984e3; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
select { width: 100%; padding: 0.7rem 0.8rem; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 0.9rem; transition: all 0.2s; background: #fafafa; color: #2d3436; appearance: auto; cursor: pointer; }
select:focus { outline: none; border-color: #00b894; background: white; box-shadow: 0 0 0 3px rgba(0,184,148,0.08); }
.field-status { font-size: 0.72rem; margin-top: 0.2rem; }
.field-status.ok { color: #00b894; }
.field-status.error { color: #d63031; }

/* PLANS */
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.plan-card { border: 2px solid #e8e8e8; border-radius: 14px; padding: 1.25rem; cursor: pointer; transition: all 0.25s; background: white; position: relative; overflow: hidden; }
.plan-card:hover { border-color: #00b894; box-shadow: 0 4px 16px rgba(0,184,148,0.1); transform: translateY(-2px); }
.plan-card.selected { border-color: #00b894; background: #f0fff4; box-shadow: 0 4px 20px rgba(0,184,148,0.15); }
.plan-card.free { border-style: dashed; }
.plan-card.popular { border-color: #0984e3; }
.plan-badge { position: absolute; top: 0; right: 0; background: #0984e3; color: white; font-size: 0.65rem; font-weight: 700; padding: 0.25rem 0.75rem 0.25rem 0.75rem; border-radius: 0 12px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.plan-check { position: absolute; top: 0.75rem; right: 0.75rem; }
.plan-price { display: flex; align-items: baseline; gap: 0.1rem; margin-bottom: 0.5rem; }
.plan-price .currency { font-size: 1rem; color: #636e72; }
.plan-price .amount { font-size: 1.8rem; font-weight: 700; color: #2d3436; }
.plan-price .period { font-size: 0.8rem; color: #636e72; }
.plan-card h3 { margin: 0 0 0.3rem; font-size: 1rem; color: #2d3436; }
.plan-desc { font-size: 0.8rem; color: #636e72; margin: 0 0 0.75rem; line-height: 1.4; }
.plan-features { list-style: none; padding: 0; margin: 0; }
.plan-features li { font-size: 0.8rem; color: #636e72; padding: 0.3rem 0; display: flex; align-items: center; gap: 0.4rem; }

/* BOTTOM NAV */
.reg-bottom { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-top: 1px solid #e8e8e8; padding: 0.85rem 1.5rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
.btn-back { background: none; border: 1.5px solid #dfe6e9; color: #636e72; padding: 0.6rem 1.1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; }
.btn-back:hover { background: #f5f6fa; border-color: #b2bec3; }
.btn-next, .btn-finish { background: linear-gradient(135deg, #00b894, #00cec9); color: white; border: none; padding: 0.7rem 1.75rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
.btn-next:hover:not(:disabled), .btn-finish:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,184,148,0.3); }
.btn-next:disabled, .btn-finish:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-finish { background: linear-gradient(135deg, #0984e3, #74b9ff); padding: 0.7rem 2rem; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.modal-content { background: white; border-radius: 20px; padding: 2rem; width: 100%; max-width: 420px; position: relative; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #b2bec3; cursor: pointer; padding: 0.25rem; border-radius: 6px; transition: all 0.2s; }
.modal-close:hover { background: #f5f6fa; color: #636e72; }
.modal-icon { margin-bottom: 1rem; }
.modal-content h2 { font-size: 1.3rem; color: #2d3436; margin: 0 0 0.3rem; }
.modal-subtitle { color: #636e72; font-size: 0.88rem; margin: 0 0 1rem; }
.modal-price { display: flex; align-items: baseline; justify-content: center; gap: 0.15rem; margin-bottom: 1.25rem; padding: 1rem; background: #f8f9fa; border-radius: 12px; }
.modal-price .currency { font-size: 1.2rem; color: #636e72; }
.modal-price .amount { font-size: 2.5rem; font-weight: 700; color: #2d3436; }
.modal-price .period { font-size: 1rem; color: #636e72; }
.modal-info { text-align: left; margin-bottom: 1.5rem; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.82rem; color: #636e72; }
.modal-actions { display: flex; gap: 0.75rem; }
.btn-modal-cancel { flex: 1; background: #f5f6fa; color: #636e72; border: none; padding: 0.7rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; }
.btn-modal-cancel:hover { background: #e8e8e8; }
.btn-modal-pay { flex: 2; background: linear-gradient(135deg, #00b894, #00cec9); color: white; border: none; padding: 0.7rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; }
.btn-modal-pay:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,184,148,0.3); }
.btn-modal-pay:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-note { font-size: 0.72rem; color: #b2bec3; margin-top: 0.75rem; }

/* MSGS */
.hint-text { text-align: center; color: #b2bec3; font-size: 0.78rem; margin: 0.5rem 0 0; }
.error-msg { background: #fff5f5; color: #c62828; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.82rem; border: 1px solid #ffd7d7; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.success-msg { background: #f0fff4; color: #2e7d32; padding: 0.65rem 1rem; border-radius: 10px; font-size: 0.82rem; border: 1px solid #c8e6c9; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }

/* SPINNER */
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* TRANSITIONS */
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active { transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-left-enter-from { opacity: 0; transform: translateX(40px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-40px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-40px); }
.slide-right-leave-to { opacity: 0; transform: translateX(40px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s; }
.modal-enter-active .modal-content, .modal-leave-active .modal-content { transition: transform 0.25s, opacity 0.25s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.95) translateY(10px); opacity: 0; }
.modal-leave-to .modal-content { transform: scale(0.95) translateY(10px); opacity: 0; }

@media (max-width: 640px) {
  .step-card { padding: 1.25rem; border-radius: 14px; }
  .curp-input-group { flex-direction: column; }
  .curp-field { font-size: 0.95rem; letter-spacing: 2px; }
  .form-row > .form-group { flex: 1 1 100%; }
  .plans-grid { grid-template-columns: 1fr; }
  .progress-steps { gap: 0.5rem; }
  .step-label { font-size: 0.6rem; }
  .reg-bottom { padding: 0.75rem 1rem; }
  .data-grid { grid-template-columns: 1fr; }
  .modal-actions { flex-direction: column; }
  .btn-modal-cancel, .btn-modal-pay { flex: none; width: 100%; }
}
</style>
