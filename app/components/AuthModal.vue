<script setup>
const props = defineProps({
  doctorName: { type: String, default: '' },
  show: { type: Boolean, default: false },
  initialCurp: { type: String, default: '' }
})

const emit = defineEmits(['close', 'logged'])

const paso = ref('elegir')
const tokenCookie = useCookie('token')

// Auto-fill CURP si viene de pre-registro
let curpInitialized = false
watch(() => props.show, (val) => {
  if (val && props.initialCurp && !curpInitialized) {
    curpInitialized = true
    curpInput.value = props.initialCurp
    paso.value = 'curp'
    validarCURP()
  }
})

// Login
const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

// Register - CURP
const curpInput = ref('')
const curpValidando = ref(false)
const curpError = ref('')
const curpDatos = ref(null)
let curpTimeout = null

watch(curpInput, () => {
  curpError.value = ''
  if (curpDatos.value && curpDatos.value.Solicitante?.Curp !== curpInput.value.toUpperCase().trim()) {
    curpDatos.value = null
  }
  if (curpTimeout) clearTimeout(curpTimeout)
})

// Register - Contacto
const regForm = reactive({
  email: '', password: '', telefono: '',
  codigo_postal: '', colonia: '', colonia_manual: false,
  municipio: '', estado: '', ciudad: '', direccion: '',
  acepta_terminos: false, acepta_marketing: false
})

const colonias = ref([])
const coloniasLoading = ref(false)
const regError = ref('')
const regLoading = ref(false)
const regSuccess = ref(false)
const preRegistroId = ref(null)

let cpTimeout = null
watch(() => regForm.codigo_postal, (val) => {
  regForm.colonia = ''
  regForm.colonia_manual = false
  colonias.value = []
  if (cpTimeout) clearTimeout(cpTimeout)
  if (!val || val.length !== 5 || !/^\d{5}$/.test(val)) return
  cpTimeout = setTimeout(() => buscarColonias(val), 400)
})

async function buscarColonias(cp) {
  coloniasLoading.value = true
  colonias.value = []
  try {
    const data = await $fetch('/api/sepomex/colonias', { params: { zip_code: cp } })
    colonias.value = data?.colonias || []
    if (data?.municipio && !regForm.municipio) regForm.municipio = data.municipio
    if (data?.ciudad && !regForm.ciudad) regForm.ciudad = data.ciudad
    if (data?.estado && !regForm.estado) regForm.estado = data.estado
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
    const data = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) {
      curpError.value = data.error_msg || 'No se pudieron obtener datos de la CURP'
      return
    }
    curpDatos.value = data.response

    // Guardar CURP en localStorage para persistir
    localStorage.setItem('pending_curp', curp)

    // Guardar pre-registro con datos CURP
    const s = curpDatos.value.Solicitante || {}
    try {
      await $fetch('/api/pre-registro', {
        method: 'POST',
        body: {
          curp: curp,
          nombre: s.Nombres || null,
          apellido_paterno: s.ApellidoPaterno || null,
          apellido_materno: s.ApellidoMaterno || null,
          fecha_nacimiento: s.FechaNacimiento || null,
          genero: s.ClaveSexo === 'H' ? 'masculino' : s.ClaveSexo === 'M' ? 'femenino' : null,
          doctor_nombre: props.doctorName || null
        }
      })
    } catch (e) { /* no bloquear por error de pre-registro */ }

    if (curpTimeout) clearTimeout(curpTimeout)
    curpTimeout = setTimeout(() => {
      if (curpDatos.value) paso.value = 'registro'
    }, 800)
  } catch (e) {
    curpError.value = e?.data?.message || 'Error al validar CURP'
  }
  curpValidando.value = false
}

function closeModal() {
  paso.value = 'elegir'
  loginError.value = ''
  regError.value = ''
  regSuccess.value = false
  curpInput.value = ''
  curpDatos.value = null
  curpError.value = ''
  colonias.value = []
  emit('close')
}

async function doLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: loginForm.email, password: loginForm.password, tipo: 'paciente' }
    })
    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    emit('logged', res.usuario)
    closeModal()
  } catch (e) {
    loginError.value = e.data?.message || 'Credenciales incorrectas'
  }
  loginLoading.value = false
}

async function doRegister() {
  regError.value = ''
  if (!curpDatos.value?.Solicitante) {
    regError.value = 'Valida tu CURP primero'
    return
  }
  if (!regForm.email) { regError.value = 'El email es requerido'; return }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(regForm.email)) { regError.value = 'Email inválido'; return }
  if (!regForm.password || regForm.password.length < 6) { regError.value = 'La contraseña debe tener al menos 6 caracteres'; return }
  if (!regForm.telefono || regForm.telefono.length < 10) { regError.value = 'El teléfono debe tener al menos 10 dígitos'; return }
  if (!regForm.acepta_terminos) {
    regError.value = 'Debes aceptar los Términos y Condiciones'
    return
  }
  regLoading.value = true
  try {
    if (props.doctorName) {
      localStorage.setItem('agendar_doctor', props.doctorName)
      localStorage.setItem('agendar_pendiente', '1')
    }

    // Actualizar pre-registro con datos de contacto
    const s = curpDatos.value.Solicitante || {}
    try {
      const preRes = await $fetch('/api/pre-registro', {
        method: 'POST',
        body: {
          curp: curpInput.value.toUpperCase().trim(),
          nombre: s.Nombres || null,
          apellido_paterno: s.ApellidoPaterno || null,
          apellido_materno: s.ApellidoMaterno || null,
          fecha_nacimiento: s.FechaNacimiento || null,
          genero: s.ClaveSexo === 'H' ? 'masculino' : s.ClaveSexo === 'M' ? 'femenino' : null,
          email: regForm.email,
          telefono: regForm.telefono,
          password: regForm.password,
          codigo_postal: regForm.codigo_postal || null,
          colonia: regForm.colonia || null,
          municipio: regForm.municipio || null,
          estado: regForm.estado || null,
          ciudad: regForm.ciudad || null,
          direccion: regForm.direccion || null,
          doctor_nombre: props.doctorName || null
        }
      })
      if (preRes.pre_registro_id) preRegistroId.value = preRes.pre_registro_id
    } catch (e) { /* no bloquear */ }

    const res = await $fetch('/api/auth/registro-paciente', {
      method: 'POST',
      body: {
        nombre: s.Nombres || '',
        apellido_paterno: s.ApellidoPaterno || '',
        apellido_materno: s.ApellidoMaterno || '',
        email: regForm.email,
        password: regForm.password,
        telefono: regForm.telefono,
        fecha_nacimiento: s.FechaNacimiento || null,
        genero: s.ClaveSexo === 'H' ? 'masculino' : s.ClaveSexo === 'M' ? 'femenino' : null,
        curp: curpInput.value.toUpperCase().trim(),
        direccion: regForm.direccion || null,
        ciudad: regForm.ciudad || null,
        estado: regForm.estado || s.EntidadNacimiento || null,
        municipio: regForm.municipio || null,
        codigo_postal: regForm.codigo_postal || null,
        colonia: regForm.colonia || null,
        acepta_terminos: regForm.acepta_terminos,
        acepta_marketing: regForm.acepta_marketing
      }
    })

    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))

    // Marcar pre-registro como completado
    if (preRegistroId.value) {
      try {
        await $fetch('/api/pre-registro-completar', {
          method: 'POST',
          body: { pre_registro_id: preRegistroId.value }
        })
      } catch (e) { /* no bloquear */ }
    }

    if (res.pago_id) {
      closeModal()
      navigateTo({ path: '/checkout', query: { pago_id: res.pago_id, doctor: props.doctorName } })
      return
    }

    regSuccess.value = true
  } catch (e) {
    regError.value = e.data?.message || 'Error al registrar'
  }
  regLoading.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="mp-modal-overlay">
      <div class="mp-modal">
        <button v-if="paso === 'elegir' || regSuccess" class="mp-modal-close" @click="closeModal">&times;</button>

        <!-- PASO: Elegir -->
        <div v-if="paso === 'elegir' && !regSuccess" class="mp-modal-content">
          <div class="mp-modal-icon">🔐</div>
          <h2>Inicia Sesión o Regístrate</h2>
          <p v-if="doctorName">Para agendar tu cita con <strong>{{ doctorName }}</strong></p>
          <div class="mp-modal-buttons">
            <button @click="paso = 'login'" class="mp-btn-primary">Ya tengo cuenta</button>
            <button @click="paso = 'curp'" class="mp-btn-secondary">Crear cuenta nueva</button>
          </div>
        </div>

        <!-- PASO: Login -->
        <div v-if="paso === 'login'" class="mp-modal-content">
          <h2>Iniciar Sesión</h2>
          <div v-if="loginError" class="mp-error">{{ loginError }}</div>
          <div class="mp-form">
            <input v-model="loginForm.email" type="text" placeholder="Correo electrónico" />
            <input v-model="loginForm.password" type="password" placeholder="Contraseña" />
            <button @click="doLogin" :disabled="loginLoading" class="mp-btn-primary">
              {{ loginLoading ? 'Entrando...' : 'Entrar' }}
            </button>
            <p class="mp-switch">¿No tienes cuenta? <a @click="paso = 'curp'">Regístrate</a></p>
            <p class="mp-switch"><a @click="paso = 'elegir'">← Volver</a></p>
          </div>
        </div>

        <!-- PASO: CURP -->
        <div v-if="paso === 'curp'" class="mp-modal-content">
          <h2>Valida tu CURP</h2>
          <p>Ingresa tu CURP para cargar tus datos automáticamente</p>
          <div class="mp-form" style="text-align:center;">
            <div class="curp-display" v-if="curpInput">{{ curpTexto }}</div>
            <input
              v-model="curpInput"
              maxlength="18"
              placeholder="Tu CURP (18 caracteres)"
              class="curp-field"
              :class="{ error: curpError, valid: curpDatos }"
              @keyup.enter="validarCURP"
              style="text-transform:uppercase; font-family:monospace; letter-spacing:2px; text-align:center;"
            />
            <button
              class="mp-btn-primary"
              @click="validarCURP"
              :disabled="curpValidando || curpInput.toUpperCase().trim().length !== 18"
            >
              {{ curpValidando ? 'Validando...' : curpDatos ? '✓ Validada' : 'Validar CURP' }}
            </button>
            <div v-if="curpError" class="mp-error">{{ curpError }}</div>
            <div v-if="curpDatos" class="mp-success-msg">Datos cargados correctamente</div>
            <p class="mp-switch"><a @click="paso = 'elegir'">← Volver</a></p>
          </div>
        </div>

        <!-- PASO: Registro con datos CURP -->
        <div v-if="paso === 'registro' && !regSuccess" class="mp-modal-content">
          <h2>Crear Cuenta</h2>
          <div v-if="regError" class="mp-error">{{ regError }}</div>

          <!-- Resumen CURP -->
          <div v-if="curpDatos" class="curp-summary">
            <div class="summary-avatar">
              <span>{{ curpDatos.Solicitante?.Nombres?.charAt(0) }}{{ curpDatos.Solicitante?.ApellidoPaterno?.charAt(0) }}</span>
            </div>
            <div class="summary-info">
              <strong>{{ curpDatos.Solicitante?.Nombres }} {{ curpDatos.Solicitante?.ApellidoPaterno }}</strong>
              <span>{{ curpTexto }}</span>
            </div>
          </div>

          <div class="mp-form">
            <div class="mp-section-tag mp-tag-green">Cuenta</div>
            <input v-model="regForm.email" type="email" placeholder="Correo electrónico *" />
            <div class="mp-form-row">
              <input v-model="regForm.password" type="password" placeholder="Contraseña *" />
            </div>

            <div class="mp-section-tag mp-tag-blue">Comunicación</div>
            <input v-model="regForm.telefono" type="tel" placeholder="Teléfono WhatsApp * (10 dígitos)" />

            <div class="mp-section-tag mp-tag-purple">Dirección</div>
            <div class="mp-form-row">
              <input v-model="regForm.codigo_postal" placeholder="Código Postal" maxlength="5" inputmode="numeric" />
              <div style="flex:1; position:relative;">
                <template v-if="colonias.length > 0 && !regForm.colonia_manual">
                  <select v-model="regForm.colonia">
                    <option value="" disabled>Selecciona colonia</option>
                    <option v-for="c in colonias" :key="c.colonia" :value="c.colonia">{{ c.colonia }}</option>
                  </select>
                  <span class="mp-link-hint" @click="regForm.colonia_manual = true; regForm.colonia = ''">No encuentro mi colonia</span>
                </template>
                <template v-else>
                  <input v-model="regForm.colonia" placeholder="Colonia" />
                  <span v-if="regForm.codigo_postal && regForm.codigo_postal.length === 5 && !coloniasLoading && colonias.length === 0" class="mp-hint-text">
                    Ingresa colonia manualmente
                  </span>
                </template>
                <span v-if="coloniasLoading" class="mp-hint-text">Buscando colonias...</span>
              </div>
            </div>
            <div class="mp-form-row">
              <input v-model="regForm.municipio" placeholder="Municipio" />
              <input v-model="regForm.estado" placeholder="Estado" />
            </div>
            <div class="mp-form-row">
              <input v-model="regForm.ciudad" placeholder="Ciudad" />
              <input v-model="regForm.direccion" placeholder="Dirección" />
            </div>

            <label class="mp-checkbox">
              <input type="checkbox" v-model="regForm.acepta_terminos" />
              <span>Acepto <a href="/terminos" target="_blank">Términos</a> y <a href="/privacidad" target="_blank">Privacidad</a> *</span>
            </label>
            <label class="mp-checkbox">
              <input type="checkbox" v-model="regForm.acepta_marketing" />
              <span>Autorizo contacto por WhatsApp/correo</span>
            </label>
            <button @click="doRegister" :disabled="regLoading" class="mp-btn-primary">
              {{ regLoading ? 'Creando...' : 'Crear Cuenta' }}
            </button>
            <p class="mp-switch">¿Ya tienes cuenta? <a @click="paso = 'login'">Inicia sesión</a></p>
            <p class="mp-switch"><a @click="paso = 'elegir'">← Volver</a></p>
          </div>
        </div>

        <!-- PASO: Confirmación de correo -->
        <div v-if="regSuccess" class="mp-modal-content mp-success">
          <div class="mp-modal-icon">📧</div>
          <h2>Confirma tu correo</h2>
          <p>Enviamos un enlace de confirmación a <strong>{{ regForm.email }}</strong></p>
          <p class="mp-hint">Abre tu correo y haz clic en el enlace. Después podrás acceder y agendar tu cita.</p>
          <div v-if="doctorName" class="mp-pending-info">
            <span>Tu cita con <strong>{{ doctorName }}</strong> quedó registrada. Después de confirmar tu correo se abrirá WhatsApp para continuar.</span>
          </div>
          <button @click="closeModal" class="mp-btn-primary">Entendido</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mp-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.mp-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.mp-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #636e72;
  z-index: 1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.mp-modal-close:hover {
  background: #f0f0f0;
}

.mp-modal-content {
  padding: 2rem;
  text-align: center;
}

.mp-modal-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.mp-modal-content h2 {
  font-size: 1.3rem;
  color: #2d3436;
  margin: 0 0 0.5rem 0;
}

.mp-modal-content > p {
  color: #636e72;
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
}

.mp-modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.mp-btn-primary {
  background: #00b894;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
}

.mp-btn-primary:hover {
  background: #00a884;
}

.mp-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mp-btn-secondary {
  background: white;
  color: #00b894;
  border: 2px solid #00b894;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
}

.mp-btn-secondary:hover {
  background: #f0fff4;
}

.mp-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  text-align: left;
}

.mp-form input,
.mp-form select {
  padding: 0.7rem 1rem;
  border: 1px solid #dfe6e9;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}

.mp-form input:focus,
.mp-form select:focus {
  outline: none;
  border-color: #00b894;
}

.mp-form-row {
  display: flex;
  gap: 0.6rem;
}

.mp-form-row > * {
  flex: 1;
}

.mp-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #636e72;
  cursor: pointer;
}

.mp-checkbox input {
  margin-top: 0.2rem;
  width: auto;
}

.mp-checkbox a {
  color: #0984e3;
}

.mp-switch {
  font-size: 0.85rem;
  color: #636e72;
  text-align: center;
}

.mp-switch a {
  color: #0984e3;
  cursor: pointer;
  text-decoration: underline;
}

.mp-error {
  background: #ffeaa7;
  color: #d63031;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  text-align: left;
}

.mp-success h2 {
  color: #00b894;
}

.mp-success-msg {
  background: #f0fff4;
  color: #2e7d32;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

.mp-hint {
  font-size: 0.85rem !important;
  color: #636e72 !important;
}

.mp-pending-info {
  background: #f0fff4;
  border: 1px solid #00b894;
  border-radius: 8px;
  padding: 0.75rem;
  margin: 1rem 0;
  font-size: 0.85rem;
  text-align: left;
}

.curp-display {
  text-align: center;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.2rem;
  letter-spacing: 3px;
  color: #00b894;
  font-weight: 700;
  margin-bottom: 0.5rem;
  padding: 0.6rem;
  background: #f0fff4;
  border-radius: 8px;
  border: 1px solid #e0f5ee;
}

.curp-field.error { border-color: #d63031; background: #fff5f5; }
.curp-field.valid { border-color: #00b894; background: #f0fff4; }

.curp-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.summary-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.summary-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.summary-info strong {
  font-size: 0.9rem;
  color: #2d3436;
}

.summary-info span {
  font-size: 0.75rem;
  color: #636e72;
  font-family: monospace;
}

.mp-section-tag {
  display: inline-block;
  font-size: 0.65rem;
  color: white;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}

.mp-tag-green { background: #00b894; }
.mp-tag-blue { background: #0984e3; }
.mp-tag-purple { background: #6c5ce7; }

.mp-link-hint {
  display: inline-block;
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: #0984e3;
  cursor: pointer;
}

.mp-link-hint:hover { text-decoration: underline; }

.mp-hint-text {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: #636e72;
}
</style>
