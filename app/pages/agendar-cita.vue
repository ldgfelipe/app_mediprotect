<script setup>
const route = useRoute()
const doctorName = ref(route.query.doctor || '')
const usuario = ref(null)
const paso = ref('inicio')
const paquetes = ref([])
const paqueteSeleccionado = ref(null)
const showDetalles = ref(false)
const yaRedirigio = ref(false)
const creandoCita = ref(false)
const pagosConfigurados = ref(false)

const tokenCookie = useCookie('token')

const planesDisponibles = computed(() => {
  if (pagosConfigurados.value) return paquetes.value
  return paquetes.value.filter(p => parseFloat(p.precio) === 0)
})

const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

const regForm = reactive({
  nombre: '', apellido: '', email: '', telefono: '', password: '',
  fecha_nacimiento: '', genero: '', ciudad: '', como_nos_conociste: '',
  acepta_terminos: false, acepta_marketing: false
})
const regError = ref('')
const regLoading = ref(false)

onMounted(async () => {
  const token = tokenCookie.value
  const saved = localStorage.getItem('usuario')
  if (token && saved) {
    usuario.value = JSON.parse(saved)
    await crearCitaYWhatsApp()
    return
  }
  try {
    const data = await $fetch('/api/paquetes')
    paquetes.value = data.paquetes || []
  } catch (e) { console.error(e) }
  try {
    const config = await $fetch('/api/pagos/configuracion')
    pagosConfigurados.value = config.configurado
  } catch (e) { console.error(e) }
})

function seleccionarPlan(plan) {
  paqueteSeleccionado.value = plan
}

function continuarRegistro() {
  if (!paqueteSeleccionado.value) return
  paso.value = 'registro'
}

function abrirWhatsApp() {
  if (yaRedirigio.value || !doctorName.value) return
  yaRedirigio.value = true
  const nombre = usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido}` : ''
  const userId = usuario.value?.id || ''
  const msg = `Hola, quiero una cita con el médico ${doctorName.value}.\n\nMi nombre es: ${nombre}\nMi ID de usuario es: ${userId}`
  const whatsappNum = '522228021933'
  window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank')
}

async function crearCitaYWhatsApp() {
  creandoCita.value = true
  try {
    const token = tokenCookie.value
    await $fetch('/api/citas/crear', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { medico_nombre: doctorName.value }
    })
  } catch (e) {
    console.error('Error creando cita:', e)
  }
  localStorage.removeItem('agendar_doctor')
  localStorage.removeItem('agendar_pendiente')
  creandoCita.value = false
  abrirWhatsApp()
  return navigateTo('/dashboard/paciente')
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
    usuario.value = res.usuario
    await crearCitaYWhatsApp()
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
    if (doctorName.value) {
      localStorage.setItem('agendar_doctor', doctorName.value)
    }
    const res = await $fetch('/api/auth/registro-paciente', {
      method: 'POST',
      body: {
        nombre: regForm.nombre, apellido: regForm.apellido,
        email: regForm.email, telefono: regForm.telefono, password: regForm.password,
        fecha_nacimiento: regForm.fecha_nacimiento, genero: regForm.genero,
        ciudad: regForm.ciudad, como_nos_conociste: regForm.como_nos_conociste,
        acepta_terminos: regForm.acepta_terminos, acepta_marketing: regForm.acepta_marketing,
        id_paquete: paqueteSeleccionado.value?.id || ''
      }
    })
    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    usuario.value = res.usuario
    if (res.pago_id) {
      localStorage.setItem('agendar_pendiente', '1')
      navigateTo({ path: '/checkout', query: { pago_id: res.pago_id } })
      return
    }
    await crearCitaYWhatsApp()
  } catch (e) {
    regError.value = e.data?.message || 'Error al registrar'
  }
  regLoading.value = false
}
</script>

<template>
  <div class="agendar-page">
    <header class="header">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>
    </header>

    <main class="content">
      <h1>Agendar Cita</h1>
      <p class="doctor-name" v-if="doctorName">Médico: <strong>{{ doctorName }}</strong></p>

      <!-- Ya logueado -->
      <div v-if="usuario && !yaRedirigio" class="redirect-section">
        <div class="spinner"></div>
        <p>{{ creandoCita ? 'Creando tu cita...' : 'Abriendo WhatsApp...' }}</p>
      </div>

      <!-- PASO INICIO: Login o crear cuenta -->
      <div v-if="!usuario && paso === 'inicio'" class="auth-section">
        <p>Para agendar una cita con <strong>{{ doctorName }}</strong>, primero inicia sesión o crea una cuenta.</p>
        <div class="auth-buttons">
          <button @click="paso = 'login'" class="btn-primary">Iniciar Sesión</button>
          <NuxtLink :to="'/registro-curp?doctor=' + encodeURIComponent(doctorName)" class="btn-secondary">Crear Cuenta</NuxtLink>
        </div>
      </div>

      <!-- PASO LOGIN -->
      <div v-if="!usuario && paso === 'login'" class="auth-section">
        <h2>Iniciar Sesión</h2>
        <div v-if="loginError" class="error">{{ loginError }}</div>
        <div class="auth-form">
          <input v-model="loginForm.email" type="text" placeholder="Correo electrónico" />
          <input v-model="loginForm.password" type="password" placeholder="Contraseña" />
          <button @click="doLogin" :disabled="loginLoading" class="btn-primary">
            {{ loginLoading ? 'Entrando...' : 'Entrar' }}
          </button>
          <p class="switch-text">¿No tienes cuenta? <NuxtLink :to="'/registro-curp?doctor=' + encodeURIComponent(doctorName)">Regístrate</NuxtLink></p>
          <p class="switch-text"><a @click="paso = 'inicio'">← Volver</a></p>
        </div>
      </div>

      <!-- PASO PAQUETES: Seleccionar plan -->
      <div v-if="paso === 'paquetes'" class="auth-section">
        <h2>Elige tu Plan</h2>
        <p class="subtitle">Selecciona el plan que mejor se adapte a tus necesidades</p>

        <div class="planes-grid">
          <div v-for="p in planesDisponibles" :key="p.id" class="plan-card" :class="{ selected: paqueteSeleccionado?.id === p.id }" @click="seleccionarPlan(p)">
            <div class="plan-header">
              <span class="plan-nombre">{{ p.nombre }}</span>
              <span class="plan-precio">{{ p.precio > 0 ? '$' + p.precio.toLocaleString() + '/año' : 'Gratis' }}</span>
            </div>
            <ul class="plan-beneficios">
              <li v-for="(b, i) in (p.beneficios || []).slice(0, 4)" :key="i">{{ b.beneficio }}</li>
            </ul>
            <button class="btn-detalles" @click.stop="showDetalles = p">Ver detalles</button>
            <div v-if="paqueteSeleccionado?.id === p.id" class="plan-check">✓ Seleccionado</div>
          </div>
        </div>

        <div class="btn-row">
          <button @click="paso = 'inicio'" class="btn-secondary">← Atrás</button>
          <button @click="continuarRegistro" :disabled="!paqueteSeleccionado" class="btn-primary">Continuar →</button>
        </div>
      </div>

      <!-- PASO REGISTRO: Formulario de datos -->
      <div v-if="paso === 'registro'" class="auth-section">
        <div v-if="paqueteSeleccionado" class="plan-seleccionado-banner">
          <span>📋 <strong>{{ paqueteSeleccionado.nombre }}</strong> — {{ paqueteSeleccionado.precio > 0 ? '$' + paqueteSeleccionado.precio.toLocaleString() + '/año' : 'Gratis' }}</span>
          <a @click="paso = 'paquetes'" class="cambiar-link">Cambiar</a>
        </div>

        <h2>Completa tus datos</h2>
        <div v-if="regError" class="error">{{ regError }}</div>

        <div class="reg-form">
          <div class="form-row">
            <input v-model="regForm.nombre" placeholder="Nombre(s) *" />
            <input v-model="regForm.apellido" placeholder="Apellido(s)" />
          </div>
          <input v-model="regForm.email" type="email" placeholder="Correo electrónico *" />
          <input v-model="regForm.telefono" type="tel" placeholder="Teléfono / WhatsApp *" />
          <input v-model="regForm.password" type="password" placeholder="Contraseña *" />
          <div class="form-row">
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
          <label class="checkbox-label">
            <input type="checkbox" v-model="regForm.acepta_terminos" />
            <span>Acepto <a href="/terminos" target="_blank">Términos</a> y <a href="/privacidad" target="_blank">Privacidad</a> *</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="regForm.acepta_marketing" />
            <span>Autorizo contacto por WhatsApp/correo</span>
          </label>

          <div class="btn-row">
            <button @click="paso = 'paquetes'" class="btn-secondary">← Atrás</button>
            <button @click="doRegister" :disabled="regLoading" class="btn-primary">
              {{ regLoading ? 'Creando...' : 'Crear Cuenta' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Detalles del Plan -->
      <div v-if="showDetalles" class="modal-overlay" @click.self="showDetalles = null">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ showDetalles.nombre }}</h2>
            <button @click="showDetalles = null" class="close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-precio">{{ showDetalles.precio > 0 ? '$' + showDetalles.precio.toLocaleString() + '/año' : 'Gratis' }}</div>
            <p class="modal-desc">{{ showDetalles.descripcion }}</p>
            <h3>Beneficios incluidos</h3>
            <ul class="modal-beneficios">
              <li v-for="(b, i) in showDetalles.beneficios" :key="i">
                <span v-if="b.tipo === 'check'" class="icon-check">✓</span>
                <span v-else class="icon-cross">—</span>
                {{ b.beneficio }}: <strong>{{ b.valor }}</strong>
              </li>
            </ul>
            <button @click="showDetalles = null" class="btn-primary full">Cerrar</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.agendar-page { min-height: 100vh; background: #f8f9fa; }
.header { background: white; padding: 1rem 2rem; border-bottom: 1px solid #e0e0e0; }
.logo { height: 40px; }
.content { max-width: 700px; margin: 2rem auto; padding: 0 1rem; text-align: center; }
h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.5rem; }
.doctor-name { font-size: 1.1rem; color: #636e72; margin-bottom: 1.5rem; }

.auth-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: left; }
.subtitle { color: #636e72; font-size: 0.9rem; margin-bottom: 1rem; }
.auth-buttons { display: flex; gap: 1rem; margin: 1rem 0; }
.auth-form { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
.auth-form h2 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.auth-form input { padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; }
.switch-text { font-size: 0.85rem; color: #636e72; }
.switch-text a { color: #0984e3; cursor: pointer; text-decoration: underline; }

.planes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem; }
.plan-card { border: 2px solid #e0e0e0; border-radius: 10px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: #fafafa; position: relative; text-align: left; }
.plan-card:hover { border-color: #0984e3; }
.plan-card.selected { border-color: #00b894; background: #f0fff4; }
.plan-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
.plan-nombre { font-weight: 700; font-size: 1rem; }
.plan-precio { font-size: 0.85rem; color: #636e72; }
.plan-beneficios { list-style: none; padding: 0; margin: 0 0 0.5rem 0; }
.plan-beneficios li { font-size: 0.78rem; color: #636e72; padding: 0.15rem 0; }
.btn-detalles { background: none; border: 1px solid #dfe6e9; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; color: #636e72; cursor: pointer; }
.btn-detalles:hover { border-color: #0984e3; color: #0984e3; }
.plan-check { position: absolute; top: 0.5rem; right: 0.5rem; color: #00b894; font-weight: 700; font-size: 0.85rem; }

.plan-seleccionado-banner { display: flex; justify-content: space-between; align-items: center; background: #f0fff4; border: 1px solid #00b894; border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; }
.cambiar-link { color: #0984e3; font-size: 0.85rem; cursor: pointer; text-decoration: underline; }

.reg-form { display: flex; flex-direction: column; gap: 0.7rem; margin-top: 1rem; }
.reg-form input, .reg-form select { padding: 0.7rem 1rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.95rem; width: 100%; box-sizing: border-box; }
.form-row { display: flex; gap: 0.8rem; }
.form-row > * { flex: 1; }
.checkbox-label { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.85rem; color: #636e72; cursor: pointer; }
.checkbox-label input { margin-top: 0.2rem; width: auto; }
.checkbox-label a { color: #0984e3; }

.btn-row { display: flex; gap: 0.8rem; margin-top: 1rem; }
.btn-primary { background: #0984e3; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; flex: 1; }
.btn-primary:hover { background: #0770c2; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: white; color: #0984e3; border: 1px solid #0984e3; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.btn-primary.full { width: 100%; flex: none; }

.redirect-section { padding: 3rem 0; }
.spinner { width: 40px; height: 40px; border: 4px solid #dfe6e9; border-top-color: #25d366; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
.modal-header h2 { margin: 0; font-size: 1.2rem; }
.close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-body { padding: 1.5rem; }
.modal-precio { font-size: 1.5rem; font-weight: 700; color: #2d3436; text-align: center; margin-bottom: 0.5rem; }
.modal-desc { color: #636e72; font-size: 0.9rem; text-align: center; margin-bottom: 1rem; }
.modal-body h3 { font-size: 1rem; margin-bottom: 0.8rem; }
.modal-beneficios { list-style: none; padding: 0; margin: 0 0 1rem 0; }
.modal-beneficios li { padding: 0.4rem 0; font-size: 0.9rem; border-bottom: 1px solid #f5f5f5; }
.icon-check { color: #00b894; font-weight: bold; margin-right: 0.3rem; }
.icon-cross { color: #d63031; margin-right: 0.3rem; }

.error { background: #ffeaa7; color: #d63031; padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.8rem; }
</style>
