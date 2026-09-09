<script setup>
const props = defineProps({
  doctorName: { type: String, default: '' },
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'logged'])

const paso = ref('elegir')
const tokenCookie = useCookie('token')

// Login
const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

// Register
const regForm = reactive({
  nombre: '', apellido: '', email: '', telefono: '', password: '',
  fecha_nacimiento: '', genero: '', ciudad: '', como_nos_conociste: '',
  acepta_terminos: false, acepta_marketing: false
})
const regError = ref('')
const regLoading = ref(false)
const regSuccess = ref(false)

function closeModal() {
  paso.value = 'elegir'
  loginError.value = ''
  regError.value = ''
  regSuccess.value = false
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
  if (!regForm.nombre || !regForm.email || !regForm.password || !regForm.telefono) {
    regError.value = 'Completa nombre, email, teléfono y contraseña'
    return
  }
  if (!regForm.acepta_terminos) {
    regError.value = 'Debes aceptar los Términos y Condiciones'
    return
  }
  regLoading.value = true
  try {
    // Guardar intención de cita
    if (props.doctorName) {
      localStorage.setItem('agendar_doctor', props.doctorName)
      localStorage.setItem('agendar_pendiente', '1')
    }

    const res = await $fetch('/api/auth/registro-paciente', {
      method: 'POST',
      body: {
        nombre: regForm.nombre, apellido: regForm.apellido,
        email: regForm.email, telefono: regForm.telefono, password: regForm.password,
        fecha_nacimiento: regForm.fecha_nacimiento, genero: regForm.genero,
        ciudad: regForm.ciudad, como_nos_conociste: regForm.como_nos_conociste,
        acepta_terminos: regForm.acepta_terminos, acepta_marketing: regForm.acepta_marketing
      }
    })

    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))

    if (res.pago_id) {
      closeModal()
      navigateTo({ path: '/checkout', query: { pago_id: res.pago_id, doctor: props.doctorName } })
      return
    }

    // Mostrar mensaje de confirmación de correo
    regSuccess.value = true
  } catch (e) {
    regError.value = e.data?.message || 'Error al registrar'
  }
  regLoading.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="mp-modal-overlay" @click.self="closeModal">
      <div class="mp-modal">
        <button class="mp-modal-close" @click="closeModal">&times;</button>

        <!-- PASO: Elegir -->
        <div v-if="paso === 'elegir' && !regSuccess" class="mp-modal-content">
          <div class="mp-modal-icon">🔐</div>
          <h2>Inicia Sesión o Regístrate</h2>
          <p v-if="doctorName">Para agendar tu cita con <strong>{{ doctorName }}</strong></p>
          <div class="mp-modal-buttons">
            <button @click="paso = 'login'" class="mp-btn-primary">Ya tengo cuenta</button>
            <button @click="paso = 'registro'" class="mp-btn-secondary">Crear cuenta nueva</button>
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
            <p class="mp-switch">¿No tienes cuenta? <a @click="paso = 'registro'">Regístrate</a></p>
            <p class="mp-switch"><a @click="paso = 'elegir'">← Volver</a></p>
          </div>
        </div>

        <!-- PASO: Registro -->
        <div v-if="paso === 'registro' && !regSuccess" class="mp-modal-content">
          <h2>Crear Cuenta</h2>
          <div v-if="regError" class="mp-error">{{ regError }}</div>
          <div class="mp-form">
            <div class="mp-form-row">
              <input v-model="regForm.nombre" placeholder="Nombre(s) *" />
              <input v-model="regForm.apellido" placeholder="Apellido(s)" />
            </div>
            <input v-model="regForm.email" type="email" placeholder="Correo electrónico *" />
            <input v-model="regForm.telefono" type="tel" placeholder="Teléfono / WhatsApp *" />
            <input v-model="regForm.password" type="password" placeholder="Contraseña *" />
            <div class="mp-form-row">
              <input v-model="regForm.fecha_nacimiento" type="date" />
              <select v-model="regForm.genero">
                <option value="">Género</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <input v-model="regForm.ciudad" placeholder="Ciudad o municipio" />
            <select v-model="regForm.como_nos_conociste">
              <option value="">¿Cómo nos conociste?</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="amigo">Recomendación de amigo</option>
              <option value="medico">Recomendación de médico</option>
              <option value="otro">Otro</option>
            </select>
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
            <span>📋 Tu cita con <strong>{{ doctorName }}</strong> quedó registrada. Después de confirmar tu correo se abrirá WhatsApp para continuar.</span>
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

.mp-modal-content p {
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
</style>
