<script setup lang="ts">
definePageMeta({ layout: false })

const paso = ref('doctor')
const medicos = ref<any[]>([])
const loadingMedicos = ref(true)
const medicoSeleccionado = ref<any>(null)
const searchMedico = ref('')
const tokenCookie = useCookie('token')
const usuario = ref<any>(null)

const formRegistro = reactive({
  nombre: '', apellido_paterno: '', apellido_materno: '',
  email: '', password: '', telefono: '',
  fecha_nacimiento: '', genero: '', ciudad: ''
})
const formLogin = reactive({ email: '', password: '' })

const loading = ref(false)
const errorMsg = ref('')
const okMsg = ref('')
const citaCreada = ref<any>(null)

let searchTimeout: any = null
function buscarDoctores() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    loadingMedicos.value = true
    try {
      const data: any = await $fetch('/api/medicos/listar-public', { params: { q: searchMedico.value } })
      medicos.value = data?.medicos || []
    } catch (e) { console.error(e) }
    loadingMedicos.value = false
  }, 300)
}

const medicoFiltrado = computed(() => medicos.value)

onMounted(async () => {
  const saved = localStorage.getItem('usuario')
  const token = tokenCookie.value
  if (token && saved) {
    usuario.value = JSON.parse(saved)
    paso.value = 'seleccionar'
  }
  try {
    const data: any = await $fetch('/api/medicos/listar-public', { params: { q: searchMedico.value } })
    medicos.value = data?.medicos || []
  } catch (e) { console.error(e) }
  loadingMedicos.value = false
})

function seleccionarDoctor(medico: any) {
  medicoSeleccionado.value = medico
  if (usuario.value) {
    paso.value = 'confirmar'
  } else {
    paso.value = 'auth'
  }
}

function irRegistro() { paso.value = 'registro' }
function irLogin() { paso.value = 'login' }

async function doLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const res: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: formLogin.email, password: formLogin.password, tipo: 'paciente' }
    })
    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    usuario.value = res.usuario
    paso.value = 'confirmar'
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Credenciales invalidas'
  }
  loading.value = false
}

async function doRegistro() {
  errorMsg.value = ''
  if (!formRegistro.nombre || !formRegistro.apellido_paterno || !formRegistro.email || !formRegistro.password) {
    errorMsg.value = 'Nombre, apellidos, email y contrasena son requeridos'
    return
  }
  loading.value = true
  try {
    const res: any = await $fetch('/api/auth/registro-paciente', {
      method: 'POST',
      body: {
        nombre: formRegistro.nombre,
        apellido_paterno: formRegistro.apellido_paterno,
        apellido_materno: formRegistro.apellido_materno,
        email: formRegistro.email,
        password: formRegistro.password,
        telefono: formRegistro.telefono,
        fecha_nacimiento: formRegistro.fecha_nacimiento || null,
        genero: formRegistro.genero || null,
        ciudad: formRegistro.ciudad || null,
        acepta_terminos: true
      }
    })
    tokenCookie.value = res.token
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    usuario.value = res.usuario
    paso.value = 'confirmar'
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Error al registrar'
  }
  loading.value = false
}

async function confirmarCita() {
  errorMsg.value = ''
  loading.value = true
  try {
    const res: any = await $fetch('/api/citas/crear', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCookie.value}` },
      body: {
        medico_nombre: `${medicoSeleccionado.value.nombre} ${medicoSeleccionado.value.apellido}`,
        id_medico: medicoSeleccionado.value.id
      }
    })
    citaCreada.value = res.cita
    paso.value = 'exito'
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Error al crear cita'
  }
  loading.value = false
}

function abrirWhatsApp() {
  if (!medicoSeleccionado.value) return
  const nombre = usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido_paterno || usuario.value.apellido}` : ''
  const msg = `Hola, quiero una cita con el medico ${medicoSeleccionado.value.nombre} ${medicoSeleccionado.value.apellido}.\n\nMi nombre es: ${nombre}`
  window.open(`https://wa.me/522228021933?text=${encodeURIComponent(msg)}`, '_blank')
}

function nuevaCita() {
  paso.value = 'doctor'
  medicoSeleccionado.value = null
  citaCreada.value = null
  errorMsg.value = ''
  okMsg.value = ''
}
</script>

<template>
  <div class="test-page">
    <header class="test-header">
      <div class="header-inner">
        <div class="brand">
          <img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" />
          <span class="badge-test">PRUEBA</span>
        </div>
        <p class="subtitle">app.mediprotect.com.mx — Registro de Cita</p>
      </div>
    </header>

    <main class="test-content">
      <!-- PASO 1: SELECCIONAR DOCTOR -->
      <div v-if="paso === 'doctor' || paso === 'seleccionar'" class="step-card">
        <div class="step-header">
          <span class="step-num">1</span>
          <div>
            <h2>Selecciona un Medico</h2>
            <p class="step-desc">Elige el medico para tu cita</p>
          </div>
        </div>

        <div class="search-box">
          <input v-model="searchMedico" @input="buscarDoctores" placeholder="Buscar por nombre o especialidad..." />
        </div>

        <p v-if="loadingMedicos" class="loading-text">Cargando medicos...</p>

        <div v-else-if="medicoFiltrado.length > 0" class="doctors-grid">
          <div v-for="m in medicoFiltrado" :key="m.id" class="doctor-card" :class="{ selected: medicoSeleccionado?.id === m.id }" @click="seleccionarDoctor(m)">
            <div class="doctor-avatar">
              <img v-if="m.foto_url" :src="m.foto_url" :alt="m.nombre" />
              <span v-else>{{ m.nombre?.charAt(0) }}{{ m.apellido?.charAt(0) }}</span>
            </div>
            <div class="doctor-info">
              <strong>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</strong>
              <span class="specialty">{{ m.especialidad_nombre || 'Sin especialidad' }}</span>
              <span class="meta" v-if="m.ciudad">{{ m.ciudad }}</span>
            </div>
            <div class="doctor-price" v-if="m.precio_regular">
              <span class="price">${{ m.precio_regular }}</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No se encontraron medicos</p>
        </div>
      </div>

      <!-- PASO 2: AUTENTICACION -->
      <div v-if="paso === 'auth'" class="step-card">
        <div class="step-header">
          <span class="step-num">2</span>
          <div>
            <h2>Inicia sesion o Registrate</h2>
            <p class="step-desc">Necesitas una cuenta para agendar tu cita</p>
          </div>
        </div>

        <div class="selected-doctor-mini" v-if="medicoSeleccionado">
          <span>Tu medico:</span>
          <strong>{{ medicoSeleccionado.titulo || 'Dr.' }} {{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellido }}</strong>
        </div>

        <div class="auth-tabs">
          <button :class="['tab', { active: authTab === 'login' }]" @click="authTab = 'login'">Iniciar Sesion</button>
          <button :class="['tab', { active: authTab === 'registro' }]" @click="authTab = 'registro'">Crear Cuenta</button>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <!-- LOGIN -->
        <form v-if="authTab === 'login'" @submit.prevent="doLogin" class="auth-form">
          <div class="form-group">
            <label>Email</label>
            <input v-model="formLogin.email" type="email" placeholder="tu@email.com" required />
          </div>
          <div class="form-group">
            <label>Contrasena</label>
            <input v-model="formLogin.password" type="password" placeholder="Tu contrasena" required />
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Entrando...' : 'Iniciar Sesion' }}</button>
        </form>

        <!-- REGISTRO -->
        <form v-if="authTab === 'registro'" @submit.prevent="doRegistro" class="auth-form">
          <div class="form-row">
            <div class="form-group"><label>Nombre *</label><input v-model="formRegistro.nombre" required /></div>
            <div class="form-group"><label>Apellido Paterno *</label><input v-model="formRegistro.apellido_paterno" required /></div>
            <div class="form-group"><label>Apellido Materno</label><input v-model="formRegistro.apellido_materno" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Email *</label><input v-model="formRegistro.email" type="email" required /></div>
            <div class="form-group"><label>Contrasena *</label><input v-model="formRegistro.password" type="password" required minlength="6" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Telefono</label><input v-model="formRegistro.telefono" type="tel" /></div>
            <div class="form-group"><label>Ciudad</label><input v-model="formRegistro.ciudad" /></div>
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Creando cuenta...' : 'Crear Cuenta' }}</button>
        </form>
      </div>

      <!-- PASO 3: CONFIRMAR CITA -->
      <div v-if="paso === 'confirmar'" class="step-card">
        <div class="step-header">
          <span class="step-num">3</span>
          <div>
            <h2>Confirma tu Cita</h2>
            <p class="step-desc">Revisa los datos y confirma</p>
          </div>
        </div>

        <div class="confirm-card">
          <div class="confirm-section">
            <label>Medico</label>
            <div class="confirm-doctor" v-if="medicoSeleccionado">
              <div class="doctor-avatar small">
                <img v-if="medicoSeleccionado.foto_url" :src="medicoSeleccionado.foto_url" :alt="medicoSeleccionado.nombre" />
                <span v-else>{{ medicoSeleccionado.nombre?.charAt(0) }}{{ medicoSeleccionado.apellido?.charAt(0) }}</span>
              </div>
              <div>
                <strong>{{ medicoSeleccionado.titulo || 'Dr.' }} {{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellido }}</strong>
                <span>{{ medicoSeleccionado.especialidad_nombre || '' }}</span>
              </div>
            </div>
          </div>

          <div class="confirm-section">
            <label>Paciente</label>
            <span>{{ usuario?.nombre }} {{ usuario?.apellido_paterno || usuario?.apellido }}</span>
          </div>

          <div class="confirm-section" v-if="medicoSeleccionado?.precio_regular">
            <label>Costo estimado</label>
            <span class="price-big">${{ medicoSeleccionado.precio_regular }}</span>
          </div>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <div class="confirm-actions">
          <button class="btn-secondary" @click="paso = 'doctor'">Cambiar medico</button>
          <button class="btn-primary" @click="confirmarCita" :disabled="loading">{{ loading ? 'Creando...' : 'Confirmar Cita' }}</button>
        </div>
      </div>

      <!-- PASO 4: EXITO -->
      <div v-if="paso === 'exito'" class="step-card success-card">
        <div class="success-icon">&#10003;</div>
        <h2>Cita Creada Exitosamente</h2>
        <p>Tu cita con <strong>{{ medicoSeleccionado?.titulo || 'Dr.' }} {{ medicoSeleccionado?.nombre }} {{ medicoSeleccionado?.apellido }}</strong> ha sido registrada.</p>

        <div class="success-details" v-if="citaCreada">
          <div class="detail"><label>Folio</label><span>{{ citaCreada.id?.substring(0, 8) }}...</span></div>
          <div class="detail"><label>Estado</label><span class="status-badge">{{ citaCreada.estado }}</span></div>
          <div class="detail" v-if="citaCreada.costo_consulta"><label>Costo</label><span>${{ citaCreada.costo_consulta }}</span></div>
        </div>

        <div class="success-actions">
          <button class="btn-whatsapp" @click="abrirWhatsApp">Contactar por WhatsApp</button>
          <button class="btn-secondary" @click="nuevaCita">Agendar otra cita</button>
        </div>
      </div>
    </main>

    <footer class="test-footer">
      <span>MediProtect — Pagina de prueba</span>
    </footer>
  </div>
</template>

<script lang="ts">
export default { data() { return { authTab: 'login' as 'login' | 'registro' } } }
</script>

<style scoped>
.test-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5f6fa; }
.test-header { background: white; border-bottom: 1px solid #e0e0e0; padding: 0.75rem 1.5rem; }
.header-inner { max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
.brand { display: flex; align-items: center; gap: 0.75rem; }
.logo { height: 32px; }
.badge-test { background: #ff6b6b; color: white; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; letter-spacing: 1px; }
.subtitle { color: #636e72; font-size: 0.8rem; margin: 0; }
.test-content { flex: 1; max-width: 800px; margin: 2rem auto; padding: 0 1rem; width: 100%; box-sizing: border-box; }
.test-footer { text-align: center; padding: 1rem; color: #b2bec3; font-size: 0.75rem; border-top: 1px solid #e0e0e0; background: white; }

.step-card { background: white; border-radius: 12px; border: 1px solid #e0e0e0; padding: 1.5rem; margin-bottom: 1rem; }
.step-header { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.25rem; }
.step-num { width: 36px; height: 36px; background: #00b894; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; flex-shrink: 0; }
.step-header h2 { margin: 0; font-size: 1.15rem; color: #2d3436; }
.step-desc { margin: 0.2rem 0 0; color: #636e72; font-size: 0.85rem; }

.search-box { margin-bottom: 1rem; }
.search-box input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; }
.search-box input:focus { outline: none; border-color: #00b894; }

.doctors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
.doctor-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.doctor-card:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,184,148,0.12); }
.doctor-card.selected { border-color: #00b894; background: #f0fff4; }
.doctor-avatar { width: 48px; height: 48px; border-radius: 50%; background: #0984e3; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; overflow: hidden; }
.doctor-avatar.small { width: 40px; height: 40px; font-size: 0.8rem; }
.doctor-avatar img { width: 100%; height: 100%; object-fit: cover; }
.doctor-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.doctor-info strong { font-size: 0.9rem; color: #2d3436; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doctor-info .specialty { font-size: 0.78rem; color: #636e72; }
.doctor-info .meta { font-size: 0.75rem; color: #b2bec3; }
.doctor-price { text-align: right; }
.doctor-price .price { font-size: 1rem; font-weight: 700; color: #00b894; }
.empty-state { text-align: center; padding: 2rem; color: #b2bec3; }
.loading-text { text-align: center; color: #636e72; padding: 1.5rem; }

.selected-doctor-mini { background: #f0fff4; border: 1px solid #00b894; border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; display: flex; gap: 0.5rem; align-items: center; }

.auth-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.tab { flex: 1; padding: 0.6rem; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500; color: #636e72; }
.tab.active { border-color: #00b894; background: #f0fff4; color: #00b894; }

.auth-form { display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.form-group { display: flex; flex-direction: column; flex: 1 1 100%; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.2rem; font-weight: 500; }
.form-group input { padding: 0.6rem 0.8rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; }
.form-group input:focus { outline: none; border-color: #00b894; }

.btn-primary { background: #00b894; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; text-align: center; }
.btn-primary:hover:not(:disabled) { background: #00a884; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #dfe6e9; color: #2d3436; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.btn-whatsapp { background: #25d366; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
.btn-whatsapp:hover { background: #20bd5a; }
.error-msg { background: #ffebee; color: #c62828; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; border: 1px solid #ffd7d7; margin-bottom: 0.75rem; }

.confirm-card { background: #f8f9fa; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; }
.confirm-section { margin-bottom: 0.75rem; }
.confirm-section:last-child { margin-bottom: 0; }
.confirm-section label { display: block; font-size: 0.75rem; color: #636e72; margin-bottom: 0.2rem; font-weight: 500; }
.confirm-section span { font-size: 0.9rem; color: #2d3436; }
.confirm-doctor { display: flex; align-items: center; gap: 0.75rem; }
.confirm-doctor strong { font-size: 0.95rem; }
.confirm-doctor span { font-size: 0.8rem; color: #636e72; }
.price-big { font-size: 1.3rem; font-weight: 700; color: #00b894; }
.confirm-actions { display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; }

.success-card { text-align: center; }
.success-icon { width: 64px; height: 64px; background: #00b894; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem; }
.success-card h2 { margin: 0 0 0.5rem; color: #2d3436; }
.success-card > p { color: #636e72; font-size: 0.9rem; margin-bottom: 1rem; }
.success-details { background: #f8f9fa; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; display: inline-flex; gap: 2rem; flex-wrap: wrap; justify-content: center; }
.detail { display: flex; flex-direction: column; }
.detail label { font-size: 0.7rem; color: #636e72; margin-bottom: 0.1rem; }
.detail span { font-size: 0.9rem; color: #2d3436; }
.status-badge { background: #e8f5e9; color: #2e7d32; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600; }
.success-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

@media (max-width: 640px) {
  .doctors-grid { grid-template-columns: 1fr; }
  .form-row > .form-group { flex: 1 1 100%; }
  .header-inner { flex-direction: column; align-items: flex-start; }
  .success-details { flex-direction: column; gap: 0.75rem; }
}
</style>
