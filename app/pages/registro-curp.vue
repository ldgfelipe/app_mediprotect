<script setup lang="ts">
definePageMeta({ layout: false })

const paso = ref(1)
const totalPasos = 3
const loading = ref(false)
const errorMsg = ref('')
const tokenCookie = useCookie('token')

// PASO 1: CURP
const curpInput = ref('')
const curpValidando = ref(false)
const curpError = ref('')
const curpDatos = ref<any>(null)

// PASO 2: Datos de contacto
const formContacto = reactive({
  email: '', password: '', password2: '',
  telefono: '', direccion: '', ciudad: '',
  estado: '', municipio: '', codigo_postal: ''
})

// PASO 3: Plan
const paquetes = ref<any[]>([])
const paqueteSeleccionado = ref<any>(null)

const passwordMatch = computed(() => formContacto.password === formContacto.password2 && formContacto.password2.length > 0)

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
    // Auto-fill contact data from CURP
    if (curpDatos.value?.Solicitante?.EntidadNacimiento) {
      formContacto.estado = curpDatos.value.Solicitante.EntidadNacimiento
    }
    setTimeout(() => { paso.value = 2 }, 600)
  } catch (e: any) {
    curpError.value = e?.data?.message || 'Error al validar CURP'
  }
  curpValidando.value = false
}

// ========== PASO 2: VALIDAR CONTACTO ==========
function validarContacto() {
  errorMsg.value = ''
  if (!formContacto.email) { errorMsg.value = 'El email es requerido'; return false }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formContacto.email)) { errorMsg.value = 'Email invalido'; return false }
  if (!formContacto.password || formContacto.password.length < 6) { errorMsg.value = 'La contrasena debe tener al menos 6 caracteres'; return false }
  if (formContacto.password !== formContacto.password2) { errorMsg.value = 'Las contrasenas no coinciden'; return false }
  if (!formContacto.telefono) { errorMsg.value = 'El telefono es requerido'; return false }
  return true
}

function siguientePaso() {
  errorMsg.value = ''
  if (paso.value === 2 && !validarContacto()) return
  if (paso.value < totalPasos) paso.value++
}

function pasoAnterior() {
  errorMsg.value = ''
  if (paso.value > 1) paso.value--
}

// ========== PASO 3: REGISTRO COMPLETO ==========
async function completarRegistro() {
  errorMsg.value = ''
  if (!paqueteSeleccionado.value) { errorMsg.value = 'Selecciona un plan'; return }
  loading.value = true
  try {
    const s = curpDatos.value?.Solicitante || {}
    const body = {
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
      estado: formContacto.estado || null,
      municipio: formContacto.municipio || null,
      codigo_postal: formContacto.codigo_postal || null,
      id_paquete: paqueteSeleccionado.value.id,
      acepta_terminos: true,
      acepta_marketing: false
    }
    const res: any = await $fetch('/api/auth/registro-paciente', { method: 'POST', body })
    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    navigateTo('/dashboard/paciente')
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Error al registrar'
  }
  loading.value = false
}

function formatoFecha(fecha: string) {
  if (!fecha) return ''
  const [d, m, y] = fecha.split('/')
  return `${d}/${m}/${y}`
}

const curpFormato = computed(() => {
  if (!curpInput.value) return ''
  const c = curpInput.value.toUpperCase()
  return `${c.slice(0,4)} ${c.slice(4,10)} ${c.slice(10,11)} ${c.slice(11,16)} ${c.slice(16,18)}`
})
</script>

<template>
  <div class="reg-page">
    <!-- HEADER -->
    <header class="reg-header">
      <img src="/images/LogoHorizontal2.png" alt="MediProtect" class="logo" />
    </header>

    <!-- PROGRESS BAR -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: ((paso / totalPasos) * 100) + '%' }"></div>
    </div>

    <div class="progress-steps">
      <div v-for="i in totalPasos" :key="i" class="progress-step" :class="{ active: paso >= i, current: paso === i }">
        <div class="step-circle">{{ i }}</div>
        <span class="step-label">{{ i === 1 ? 'CURP' : i === 2 ? 'Datos' : 'Plan' }}</span>
      </div>
    </div>

    <!-- PASO 1: CURP -->
    <transition name="slide" mode="out-in">
      <main v-if="paso === 1" key="paso1" class="reg-content">
        <div class="step-card">
          <div class="step-icon">&#128220;</div>
          <h1>Valida tu CURP</h1>
          <p class="step-desc">Ingresa tu CURP para cargar tus datos automaticamente</p>

          <div class="curp-display" v-if="curpInput">{{ curpFormato }}</div>

          <div class="curp-input-group">
            <input
              v-model="curpInput"
              maxlength="18"
              placeholder="Escribe tu CURP (18 caracteres)"
              class="curp-field"
              :class="{ error: curpError }"
              @keyup.enter="validarCURP"
            />
            <button class="btn-validate" @click="validarCURP" :disabled="curpValidando || curpInput.length !== 18">
              <span v-if="curpValidando" class="spinner-sm"></span>
              <span v-else>Validar</span>
            </button>
          </div>

          <div v-if="curpError" class="error-msg">
            <span class="error-icon">&#9888;</span> {{ curpError }}
          </div>

          <p class="hint-text">Ejemplo: XAXX010101HTCPRL09</p>

          <div v-if="curpDatos" class="curp-loaded">
            <div class="loaded-icon">&#10003;</div>
            <span>Datos cargados correctamente. Redirigiendo...</span>
          </div>
        </div>
      </main>

      <!-- PASO 2: DATOS DE CONTACTO -->
      <main v-else-if="paso === 2" key="paso2" class="reg-content">
        <div class="step-card">
          <div class="step-icon">&#128231;</div>
          <h1>Datos de Contacto</h1>
          <p class="step-desc">Informacion para tu cuenta y comunicacion</p>

          <!-- CURP Summary -->
          <div class="curp-summary" v-if="curpDatos">
            <div class="summary-avatar">
              <span>{{ curpDatos.Solicitante?.Nombres?.charAt(0) }}{{ curpDatos.Solicitante?.ApellidoPaterno?.charAt(0) }}</span>
            </div>
            <div class="summary-info">
              <strong>{{ curpDatos.Solicitante?.Nombres }} {{ curpDatos.Solicitante?.ApellidoPaterno }} {{ curpDatos.Solicitante?.ApellidoMaterno }}</strong>
              <span>CURP: {{ curpInput.toUpperCase() }}</span>
              <span>{{ curpDatos.Solicitante?.EntidadNacimiento }} &middot; {{ curpDatos.Solicitante?.Sexo }}</span>
            </div>
          </div>

          <div v-if="errorMsg" class="error-msg"><span class="error-icon">&#9888;</span> {{ errorMsg }}</div>

          <form @submit.prevent="siguientePaso" class="form-grid">
            <div class="form-section-title">Cuenta</div>
            <div class="form-row">
              <div class="form-group">
                <label>Email *</label>
                <input v-model="formContacto.email" type="email" placeholder="correo@ejemplo.com" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Contrasena *</label>
                <input v-model="formContacto.password" type="password" placeholder="Minimo 6 caracteres" required minlength="6" />
              </div>
              <div class="form-group">
                <label>Confirmar contrasena *</label>
                <input v-model="formContacto.password2" type="password" placeholder="Repite tu contrasena" required />
                <span v-if="formContacto.password2" class="field-status" :class="passwordMatch ? 'ok' : 'error'">
                  {{ passwordMatch ? 'Passwords match' : 'Passwords dont match' }}
                </span>
              </div>
            </div>

            <div class="form-section-title">Comunicacion</div>
            <div class="form-row">
              <div class="form-group">
                <label>Telefono WhatsApp *</label>
                <input v-model="formContacto.telefono" type="tel" placeholder="10 digitos" required />
              </div>
            </div>

            <div class="form-section-title">Direccion</div>
            <div class="form-group">
              <label>Direccion</label>
              <input v-model="formContacto.direccion" placeholder="Calle, numero, colonia" />
            </div>
            <div class="form-row">
              <div class="form-group"><label>Ciudad</label><input v-model="formContacto.ciudad" placeholder="Ciudad" /></div>
              <div class="form-group">
                <label>Estado</label>
                <input v-model="formContacto.estado" placeholder="Estado" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Municipio</label><input v-model="formContacto.municipio" placeholder="Municipio" /></div>
              <div class="form-group"><label>Codigo Postal</label><input v-model="formContacto.codigo_postal" placeholder="CP" maxlength="5" /></div>
            </div>
          </form>
        </div>
      </main>

      <!-- PASO 3: SELECCIONAR PLAN -->
      <main v-else-if="paso === 3" key="paso3" class="reg-content">
        <div class="step-card">
          <div class="step-icon">&#128179;</div>
          <h1>Selecciona tu Plan</h1>
          <p class="step-desc">Elige el plan que mejor se adapte a tus necesidades</p>

          <div v-if="errorMsg" class="error-msg"><span class="error-icon">&#9888;</span> {{ errorMsg }}</div>

          <div class="plans-grid">
            <div
              v-for="plan in paquetes" :key="plan.id"
              class="plan-card"
              :class="{ selected: paqueteSeleccionado?.id === plan.id, free: parseFloat(plan.precio) === 0 }"
              @click="paqueteSeleccionado = plan"
            >
              <div class="plan-check" v-if="paqueteSeleccionado?.id === plan.id">&#10003;</div>
              <div class="plan-price">
                <span class="currency" v-if="parseFloat(plan.precio) > 0">$</span>
                <span class="amount">{{ parseFloat(plan.precio) === 0 ? 'Gratis' : plan.precio }}</span>
                <span class="period" v-if="parseFloat(plan.precio) > 0">/mes</span>
              </div>
              <h3>{{ plan.nombre }}</h3>
              <p class="plan-desc" v-if="plan.descripcion">{{ plan.descripcion }}</p>
              <ul class="plan-features" v-if="plan.beneficios">
                <li v-for="(b, i) in plan.beneficios.filter((x: any) => x.beneficio)" :key="i">
                  <span class="check">&#10003;</span> {{ b.beneficio }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </transition>

    <!-- BOTTOM NAV -->
    <div class="reg-bottom" v-if="paso > 0 && paso <= totalPasos">
      <button v-if="paso > 1" class="btn-back" @click="pasoAnterior">&#8592; Atras</button>
      <div v-else></div>

      <button v-if="paso < totalPasos" class="btn-next" @click="siguientePaso" :disabled="(paso === 1 && !curpDatos)">
        Siguiente &#8594;
      </button>
      <button v-else class="btn-finish" @click="completarRegistro" :disabled="loading || !paqueteSeleccionado">
        <span v-if="loading" class="spinner-sm"></span>
        <span v-else>Crear mi cuenta</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.reg-page { min-height: 100vh; display: flex; flex-direction: column; background: linear-gradient(135deg, #f8fffe 0%, #f0f4ff 100%); }

/* HEADER */
.reg-header { background: white; padding: 0.75rem 1.5rem; border-bottom: 1px solid #e8e8e8; text-align: center; }
.logo { height: 36px; }

/* PROGRESS */
.progress-bar { height: 3px; background: #e8e8e8; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #00b894, #00cec9); transition: width 0.5s ease; border-radius: 0 2px 2px 0; }

.progress-steps { display: flex; justify-content: center; gap: 2rem; padding: 1rem; }
.progress-step { display: flex; align-items: center; gap: 0.5rem; opacity: 0.4; transition: all 0.3s; }
.progress-step.active { opacity: 1; }
.progress-step.current { opacity: 1; }
.step-circle { width: 28px; height: 28px; border-radius: 50%; background: #e0e0e0; color: #636e72; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; transition: all 0.3s; }
.progress-step.active .step-circle { background: #00b894; color: white; }
.step-label { font-size: 0.8rem; color: #636e72; font-weight: 500; }
.progress-step.active .step-label { color: #2d3436; }

/* CONTENT */
.reg-content { flex: 1; display: flex; justify-content: center; padding: 1.5rem 1rem 6rem; }
.step-card { background: white; border-radius: 16px; border: 1px solid #e8e8e8; padding: 2rem; width: 100%; max-width: 600px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
.step-icon { font-size: 2.5rem; text-align: center; margin-bottom: 0.5rem; }
.step-card h1 { text-align: center; margin: 0 0 0.3rem; font-size: 1.4rem; color: #2d3436; }
.step-desc { text-align: center; color: #636e72; font-size: 0.9rem; margin: 0 0 1.5rem; }

/* CURP STEP */
.curp-display { text-align: center; font-family: monospace; font-size: 1.3rem; letter-spacing: 3px; color: #00b894; font-weight: 700; margin-bottom: 1rem; padding: 0.5rem; background: #f0fff4; border-radius: 8px; }
.curp-input-group { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
.curp-field { flex: 1; padding: 0.85rem 1rem; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 1rem; font-family: monospace; letter-spacing: 2px; text-transform: uppercase; transition: border-color 0.2s; text-align: center; }
.curp-field:focus { outline: none; border-color: #00b894; }
.curp-field.error { border-color: #d63031; }
.btn-validate { background: #00b894; color: white; border: none; padding: 0.85rem 1.5rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600; white-space: nowrap; min-width: 100px; display: flex; align-items: center; justify-content: center; }
.btn-validate:hover:not(:disabled) { background: #00a884; }
.btn-validate:disabled { opacity: 0.5; cursor: not-allowed; }
.hint-text { text-align: center; color: #b2bec3; font-size: 0.8rem; margin: 0.5rem 0 1rem; }
.curp-loaded { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #00b894; font-size: 0.9rem; font-weight: 500; padding: 0.75rem; background: #f0fff4; border-radius: 8px; }
.loaded-icon { width: 24px; height: 24px; background: #00b894; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }

/* CURP SUMMARY */
.curp-summary { display: flex; align-items: center; gap: 1rem; background: #f8f9fa; border: 1px solid #e8e8e8; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; }
.summary-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #00b894, #00cec9); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
.summary-info { display: flex; flex-direction: column; }
.summary-info strong { font-size: 0.95rem; color: #2d3436; }
.summary-info span { font-size: 0.78rem; color: #636e72; }

/* FORM */
.form-grid { display: flex; flex-direction: column; gap: 0.5rem; }
.form-section-title { font-size: 0.75rem; color: #00b894; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0.75rem 0 0.25rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; }
.form-section-title:first-child { border-top: none; margin-top: 0; }
.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.form-group { display: flex; flex-direction: column; flex: 1 1 100%; margin-bottom: 0.5rem; position: relative; }
.form-group label { font-size: 0.78rem; color: #636e72; margin-bottom: 0.2rem; font-weight: 500; }
.form-group input { padding: 0.65rem 0.8rem; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; }
.form-group input:focus { outline: none; border-color: #00b894; }
.field-status { font-size: 0.7rem; margin-top: 0.15rem; }
.field-status.ok { color: #00b894; }
.field-status.error { color: #d63031; }

/* PLANS */
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.plan-card { border: 2px solid #e8e8e8; border-radius: 12px; padding: 1.25rem; cursor: pointer; transition: all 0.2s; background: white; position: relative; }
.plan-card:hover { border-color: #00b894; box-shadow: 0 4px 12px rgba(0,184,148,0.1); }
.plan-card.selected { border-color: #00b894; background: #f0fff4; box-shadow: 0 4px 16px rgba(0,184,148,0.15); }
.plan-card.free { border-style: dashed; }
.plan-check { position: absolute; top: 0.75rem; right: 0.75rem; width: 24px; height: 24px; background: #00b894; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; }
.plan-price { display: flex; align-items: baseline; gap: 0.15rem; margin-bottom: 0.5rem; }
.plan-price .currency { font-size: 1rem; color: #636e72; }
.plan-price .amount { font-size: 1.8rem; font-weight: 700; color: #2d3436; }
.plan-price .period { font-size: 0.8rem; color: #636e72; }
.plan-card h3 { margin: 0 0 0.3rem; font-size: 1rem; color: #2d3436; }
.plan-desc { font-size: 0.8rem; color: #636e72; margin: 0 0 0.75rem; }
.plan-features { list-style: none; padding: 0; margin: 0; }
.plan-features li { font-size: 0.8rem; color: #636e72; padding: 0.2rem 0; display: flex; align-items: center; gap: 0.4rem; }
.plan-features .check { color: #00b894; font-weight: 700; }

/* BOTTOM NAV */
.reg-bottom { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e8e8e8; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
.btn-back { background: none; border: 1.5px solid #dfe6e9; color: #636e72; padding: 0.65rem 1.25rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
.btn-back:hover { background: #f5f6fa; }
.btn-next, .btn-finish { background: linear-gradient(135deg, #00b894, #00cec9); color: white; border: none; padding: 0.7rem 2rem; border-radius: 10px; cursor: pointer; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
.btn-next:hover:not(:disabled), .btn-finish:hover:not(:disabled) { background: linear-gradient(135deg, #00a884, #00b894); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,184,148,0.3); }
.btn-next:disabled, .btn-finish:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

/* ERROR */
.error-msg { background: #fff5f5; color: #c62828; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; border: 1px solid #ffd7d7; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.4rem; }

/* SPINNER */
.spinner-sm { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* TRANSITIONS */
.slide-enter-active, .slide-leave-active { transition: all 0.35s ease; }
.slide-enter-from { opacity: 0; transform: translateX(30px); }
.slide-leave-to { opacity: 0; transform: translateX(-30px); }

@media (max-width: 640px) {
  .step-card { padding: 1.25rem; border-radius: 12px; }
  .curp-input-group { flex-direction: column; }
  .curp-field { font-size: 0.9rem; letter-spacing: 1px; }
  .form-row > .form-group { flex: 1 1 100%; }
  .plans-grid { grid-template-columns: 1fr; }
  .progress-steps { gap: 1rem; }
  .step-label { display: none; }
  .reg-bottom { padding: 0.75rem 1rem; }
}
</style>
