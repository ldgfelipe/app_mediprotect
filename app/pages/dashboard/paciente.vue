<script setup lang="ts">
import { useSocket } from '~/composables/useSocket'

const token = useCookie('token')
const usuario = useCookie('usuario')

if (!usuario.value) {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario') : null
    if (stored) usuario.value = JSON.parse(stored)
  } catch {}
}

const plan = ref<any>(null)
const citas = ref<any[]>([])
const loadingCitas = ref(true)

definePageMeta({
  middleware: 'auth',
})

const emailConfirmado = computed(() => usuario.value?.email_confirmado === true)

const confState = ref<'idle' | 'enviando' | 'enviado' | 'error'>('idle')
const confMsg = ref('')

const cambiarEmail = ref('')
const cambiando = ref(false)
const cambioMsg = ref('')
const cambioError = ref('')

const showCitaPendiente = ref(false)
const citaPendienteDoctor = ref('')
const creandoCitaPendiente = ref(false)

const { on, onReconnect } = useSocket()

useSmartPolling('paciente-citas', cargarCitas, { fastInterval: 8000, slowInterval: 15000 })

const estadosLabels: Record<string, string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada',
  asistida: 'Asistida', no_asistida: 'No Asistida', reagendada: 'Reagendada',
  paciente_llego: 'Paciente lleg\u00f3', en_atencion: 'En atenci\u00f3n',
}

const estadosColores: Record<string, string> = {
  pendiente: '#f39c12', confirmada: '#00b894', cancelada: '#d63031',
  asistida: '#00b894', no_asistida: '#636e72', reagendada: '#0984e3',
  paciente_llego: '#e17055', en_atencion: '#6c5ce7',
}

async function cargarCitas() {
  try {
    const res: any = await $fetch('/api/citas/mis-citas', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    citas.value = res?.citas || []
  } catch {}
  loadingCitas.value = false
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(async () => {
  if (emailConfirmado.value) {
    try {
      const { data } = await useFetch('/api/paquetes/mi-plan')
      plan.value = (data.value as any)?.plan
    } catch {}

    await cargarCitas()

    const pendingDoctor = localStorage.getItem('agendar_doctor')
    if (pendingDoctor) {
      citaPendienteDoctor.value = pendingDoctor
      showCitaPendiente.value = true
    }
  }

  on('cita:created', () => { cargarCitas() })
  on('cita:confirmed', () => { cargarCitas() })
  on('cita:cancelled', () => { cargarCitas() })
  on('cita:updated', () => { cargarCitas() })

  onReconnect(() => { cargarCitas() })
})

async function enviarConfirmacion() {
  if (!usuario.value?.email || !usuario.value?.tipo) return
  confState.value = 'enviando'
  confMsg.value = ''
  try {
    await $fetch('/api/auth/enviar-confirmacion', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { email: usuario.value.email, tipo: usuario.value.tipo }
    })
    confState.value = 'enviado'
    confMsg.value = 'Revisa tu bandeja de entrada y haz clic en el enlace para confirmar tu correo.'
  } catch (e: any) {
    confState.value = 'error'
    confMsg.value = e?.data?.message || 'Error al enviar el correo de confirmación'
  }
}

async function guardarCambioEmail() {
  const nuevo = cambiarEmail.value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo)) {
    cambioError.value = 'Ingresa un correo electrónico válido'
    return
  }
  if (nuevo === usuario.value?.email) {
    cambioError.value = 'El correo es el mismo que ya estás usando'
    return
  }
  cambiando.value = true
  cambioError.value = ''
  cambioMsg.value = ''
  try {
    const res: any = await $fetch('/api/auth/cambiar-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { nuevo_email: nuevo }
    })
    usuario.value = res.usuario
    cambiarEmail.value = ''
    confState.value = 'enviado'
    confMsg.value = res.mensaje
  } catch (e: any) {
    cambioError.value = e?.data?.message || 'Error al cambiar el correo'
  } finally {
    cambiando.value = false
  }
}

function cerrarSesion() {
  token.value = null
  usuario.value = null
  navigateTo('/')
}

// ========== CITA PENDIENTE: NOTIFICAR AL ASISTENTE ==========
async function agendarCitaPendiente() {
  creandoCitaPendiente.value = true
  const nombre = usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido}` : ''
  const userId = usuario.value?.id || ''
  const email = usuario.value?.email || ''
  const tel = usuario.value?.telefono || ''
  const msg = `Hola MediProtect, soy ${nombre} y solicito una cita con el médico ${citaPendienteDoctor.value}.\n\n📧 Email: ${email}\n📱 Teléfono: ${tel}\n🆔 ID: ${userId}\n\nPor favor, confirmen disponibilidad.`
  window.open(`https://wa.me/522228021933?text=${encodeURIComponent(msg)}`, '_blank')
  limpiarCitaPendiente()
  creandoCitaPendiente.value = false
}

async function cerrarCitaPendiente() {
  limpiarCitaPendiente()
}

function limpiarCitaPendiente() {
  localStorage.removeItem('agendar_doctor')
  localStorage.removeItem('agendar_pendiente')
  localStorage.removeItem('pending_curp')
  showCitaPendiente.value = false
  citaPendienteDoctor.value = ''
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="dashboard-header-inner">
        <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo-sm" /></NuxtLink>
        <nav v-if="emailConfirmado">
          <NuxtLink to="/dashboard/paciente">Inicio</NuxtLink>
          <a href="https://www.mediprotect.com.mx/red-medica" target="_blank">Buscar Médicos</a>
          <NuxtLink to="/mis-citas">Mis Citas</NuxtLink>
          <NuxtLink to="/paquetes">Mi Plan</NuxtLink>
        </nav>
        <div class="user-info">
          <NotificationBell />
          <span>{{ usuario?.nombre }} {{ usuario?.apellido }}</span>
          <button @click="cerrarSesion" class="btn-logout">Salir</button>
        </div>
      </div>
    </header>

    <main class="dashboard-content">
      <!-- Modal de cita pendiente -->
      <Teleport to="body">
        <div v-if="showCitaPendiente" class="cita-pendiente-overlay">
          <div class="cita-pendiente-modal">
            <div class="cita-pendiente-icon">📋</div>
            <h2>Tienes una cita pendiente</h2>
            <p class="cita-pendiente-text">
              Quieres agendar tu cita con:
            </p>
            <div class="cita-pendiente-doctor">
              <strong>{{ citaPendienteDoctor }}</strong>
            </div>
            <p class="cita-pendiente-hint">
              Presiona <strong>"Agendar Cita"</strong> para abrir WhatsApp y coordinar tu consulta, o <strong>"Cerrar"</strong> para guardar la cita y continuar después.
            </p>
            <div class="cita-pendiente-actions">
              <button
                class="btn-agendar-wa"
                @click="agendarCitaPendiente"
                :disabled="creandoCitaPendiente"
              >
                {{ creandoCitaPendiente ? 'Procesando...' : '📱 Agendar Cita (WhatsApp)' }}
              </button>
              <button
                class="btn-cerrar-modal"
                @click="cerrarCitaPendiente"
                :disabled="creandoCitaPendiente"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </Teleport>
      <!-- Panel bloqueado hasta confirmar el correo -->
      <div v-if="!emailConfirmado" class="confirm-panel">
        <div class="confirm-card">
          <div class="confirm-icon">✉️</div>
          <h2>Confirma tu correo electrónico</h2>
          <p class="confirm-subtitle">Para usar todas las funciones de MediProtect, primero debes confirmar tu correo.</p>

          <div class="confirm-box">
            <span class="info-label">Correo en uso</span>
            <strong class="info-email">{{ usuario?.email }}</strong>

            <button
              class="btn-resend"
              @click="enviarConfirmacion"
              :disabled="confState === 'enviando'"
            >
              {{ confState === 'enviando' ? 'Enviando...' : 'Enviar correo de confirmación' }}
            </button>

            <p v-if="confState === 'enviado'" class="msg-success">{{ confMsg }}</p>
            <p v-if="confState === 'error'" class="msg-error">{{ confMsg }}</p>
          </div>

          <div class="divider">
            <span>¿El correo no es correcto?</span>
          </div>

          <div class="change-email">
            <span class="info-label">Cambiar correo</span>
            <div class="change-row">
              <input
                v-model="cambiarEmail"
                type="email"
                placeholder="nuevocorreo@ejemplo.com"
                @keyup.enter="guardarCambioEmail"
              >
              <button class="btn-change" @click="guardarCambioEmail" :disabled="cambiando">
                {{ cambiando ? 'Guardando...' : 'Cambiar correo' }}
              </button>
            </div>
            <p v-if="cambioMsg" class="msg-success">{{ cambioMsg }}</p>
            <p v-if="cambioError" class="msg-error">{{ cambioError }}</p>
            <p class="hint">Al cambiar el correo, se actualizará tu registro y se enviará una nueva confirmación a la dirección nueva.</p>
          </div>
        </div>
      </div>

      <!-- Panel completo tras confirmar el correo -->
      <template v-else>
        <SmsConfirmBanner />
        <h1>Bienvenido, {{ usuario?.nombre }}</h1>
        <p class="subtitle">Panel de Paciente — MediProtect</p>

        <div v-if="plan" class="plan-badge" :class="plan.slug">
          <strong>{{ plan.nombre }}</strong>
          <span v-if="plan.precio > 0">${{ plan.precio.toLocaleString() }}/año</span>
          <span v-else>Gratuito</span>
        </div>

        <!-- PROXIMAS CITAS -->
        <div class="section-citas" v-if="!loadingCitas">
          <h2 class="section-title">Mis Próximas Citas</h2>
          <div v-if="citas.length === 0" class="empty-citas">
            <p>No tienes citas programadas</p>
            <NuxtLink to="/mis-citas" class="btn-card">Agendar Cita</NuxtLink>
          </div>
          <div v-else class="citas-timeline">
            <div v-for="cita in citas.slice(0, 5)" :key="cita.id" class="cita-item" :style="{ borderLeftColor: estadosColores[cita.estado] || '#636e72' }">
              <div class="cita-item-header">
                <span class="cita-estado" :style="{ background: estadosColores[cita.estado] || '#636e72' }">{{ estadosLabels[cita.estado] || cita.estado }}</span>
                <span class="cita-fecha">{{ formatearFecha(cita.fecha_hora) }}</span>
              </div>
              <div class="cita-item-body">
                <div class="cita-doctor">
                  <strong>{{ cita.medico_nombre || 'Sin médico asignado' }}</strong>
                  <span v-if="cita.medico_apellido">{{ cita.medico_apellido }}</span>
                </div>
                <div v-if="cita.notas_asistente" class="cita-notas">{{ cita.notas_asistente }}</div>
              </div>
            </div>
          </div>
          <div v-if="citas.length > 5" class="citas-more">
            <NuxtLink to="/mis-citas">Ver todas ({{ citas.length }})</NuxtLink>
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <h3>Buscar Especialistas</h3>
            <p>Encuentra médicos en nuestra red y agenda tu consulta.</p>
            <a href="https://www.mediprotect.com.mx/red-medica" target="_blank" class="btn-card">Buscar</a>
          </div>
          <div class="card">
            <h3>Mis Citas</h3>
            <p>Revisa y administra tus citas agendadas.</p>
            <NuxtLink to="/mis-citas" class="btn-card">Ver Citas</NuxtLink>
          </div>
          <div class="card">
            <h3>Mi Plan</h3>
            <p>Conoce los beneficios de tu plan o mejora a uno superior.</p>
            <NuxtLink to="/paquetes" class="btn-card">Ver Planes</NuxtLink>
          </div>
          <div class="card">
            <h3>Mi Perfil</h3>
            <p>Actualiza tus datos personales.</p>
            <NuxtLink to="/perfil" class="btn-card">Editar</NuxtLink>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.logo-sm { height: 35px; }
.user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: #636e72; }
.btn-logout { background: none; border: 1px solid #e0e0e0; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; color: #636e72; font-size: 0.85rem; }
.btn-logout:hover { background: #d63031; color: white; border-color: #d63031; }

/* Panel de confirmación de correo */
.confirm-panel {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 0;
  min-height: 60vh;
}

.confirm-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 2rem 2rem 2.5rem;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

.confirm-icon {
  font-size: 2.6rem;
  margin-bottom: 0.75rem;
}

.confirm-card h2 {
  margin: 0 0 0.4rem;
  color: #2d3436;
  font-size: 1.3rem;
}

.confirm-subtitle {
  color: #636e72;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.5rem;
}

.confirm-box {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 10px;
  padding: 1.25rem;
}

.info-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #b2bec3;
  margin-bottom: 0.25rem;
}

.info-email {
  display: block;
  font-size: 1.05rem;
  color: #2d3436;
  word-break: break-all;
  margin-bottom: 1rem;
}

.btn-resend {
  background: #e65100;
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-resend:hover:not(:disabled) { background: #bf360c; }
.btn-resend:disabled { opacity: 0.6; cursor: not-allowed; }

.msg-success { color: #2e7d32; font-size: 0.85rem; margin: 0.75rem 0 0; line-height: 1.4; }
.msg-error { color: #c62828; font-size: 0.85rem; margin: 0.75rem 0 0; line-height: 1.4; }

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
  color: #b2bec3;
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.change-email {
  text-align: left;
}

.change-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.change-row input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
}

.change-row input:focus {
  outline: none;
  border-color: #00b894;
}

.btn-change {
  background: #00b894;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-change:hover:not(:disabled) { background: #00a884; }
.btn-change:disabled { opacity: 0.6; cursor: not-allowed; }

.hint {
  font-size: 0.78rem;
  color: #b2bec3;
  margin: 0.6rem 0 0;
  line-height: 1.4;
}

/* ========== SECCION CITAS ========== */
.section-citas { margin-bottom: 2rem; }
.section-title { font-size: 1.2rem; color: #2d3436; margin-bottom: 1rem; }
.empty-citas { text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 12px; color: #636e72; }
.empty-citas .btn-card { display: inline-block; margin-top: 0.75rem; }
.citas-timeline { display: flex; flex-direction: column; gap: 0.75rem; }
.cita-item { background: white; border: 1px solid #eaeaea; border-left: 4px solid; border-radius: 10px; padding: 1rem 1.25rem; transition: box-shadow 0.2s; }
.cita-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.cita-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.cita-estado { font-size: 0.75rem; font-weight: 600; color: white; padding: 0.2rem 0.6rem; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; }
.cita-fecha { font-size: 0.85rem; color: #636e72; }
.cita-item-body { display: flex; flex-direction: column; gap: 0.3rem; }
.cita-doctor { font-size: 0.95rem; color: #2d3436; }
.cita-notas { font-size: 0.8rem; color: #b2bec3; font-style: italic; }
.citas-more { text-align: center; margin-top: 0.75rem; }
.citas-more a { color: #0984e3; font-size: 0.85rem; font-weight: 500; }

/* ========== MODAL CITA PENDIENTE ========== */
.cita-pendiente-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.cita-pendiente-modal {
  background: white;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.cita-pendiente-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.cita-pendiente-modal h2 {
  font-size: 1.3rem;
  color: #2d3436;
  margin: 0 0 0.5rem;
}

.cita-pendiente-text {
  color: #636e72;
  font-size: 0.95rem;
  margin: 0 0 0.75rem;
}

.cita-pendiente-doctor {
  background: #f0fff4;
  border: 1px solid #00b894;
  border-radius: 10px;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #2d3436;
}

.cita-pendiente-hint {
  font-size: 0.85rem;
  color: #636e72;
  line-height: 1.5;
  margin: 0 0 1.5rem;
}

.cita-pendiente-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-agendar-wa {
  background: #25d366;
  color: white;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-agendar-wa:hover:not(:disabled) {
  background: #1da851;
}

.btn-agendar-wa:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cerrar-modal {
  background: white;
  color: #636e72;
  border: 1px solid #dfe6e9;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cerrar-modal:hover:not(:disabled) {
  background: #f5f6fa;
  border-color: #b2bec3;
}

.btn-cerrar-modal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>