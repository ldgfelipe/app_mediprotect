<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const tokenCookie = useCookie('token')
const usuarioCookie = useCookie('usuario')

const telefono = ref('')
const codigo = ref('')
const status = ref<'input' | 'sending' | 'sent' | 'verifying' | 'success' | 'error'>('input')
const mensaje = ref('')
const expiraEn = ref('')
const countdown = ref(0)
const canResend = ref(true)

let timer: ReturnType<typeof setInterval> | null = null

function formatPhone(value: string) {
  const cleaned = value.replace(/[^0-9]/g, '')
  if (cleaned.length <= 10) return cleaned
  return cleaned.substring(0, 10)
}

async function enviarCodigo() {
  if (!telefono.value || telefono.value.length < 10) {
    mensaje.value = 'Ingresa un numero de telefono valido (10 digitos)'
    status.value = 'error'
    return
  }

  status.value = 'sending'
  mensaje.value = ''

  try {
    const res: any = await $fetch('/api/auth/enviar-sms-confirmacion', {
      method: 'POST',
      body: { telefono: telefono.value }
    })

    expiraEn.value = res.expira_en
    status.value = 'sent'
    mensaje.value = `Codigo enviado a ${res.telefono}`
    canResend.value = false
    countdown.value = 60

    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        canResend.value = true
        if (timer) clearInterval(timer)
      }
    }, 1000)
  } catch (e: any) {
    status.value = 'error'
    mensaje.value = e?.data?.message || 'Error enviando el codigo'
  }
}

async function verificarCodigo() {
  if (!codigo.value || codigo.value.length !== 6) {
    mensaje.value = 'Ingresa el codigo de 6 digitos'
    status.value = 'error'
    return
  }

  status.value = 'verifying'
  mensaje.value = ''

  try {
    const res: any = await $fetch('/api/auth/confirmar-telefono', {
      method: 'POST',
      body: { codigo: codigo.value, telefono: telefono.value }
    })

    if (res.token) {
      tokenCookie.value = res.token
    }

    status.value = 'success'
    mensaje.value = res.mensaje
  } catch (e: any) {
    status.value = 'error'
    mensaje.value = e?.data?.message || 'Error verificando el codigo'
  }
}

function irADashboard() {
  const tipo = usuarioCookie.value?.tipo
  if (tipo === 'medico') navigateTo('/dashboard/medico')
  else navigateTo('/dashboard/paciente')
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="confirm-page">
    <div class="confirm-card">
      <NuxtLink to="/"><img src="https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/0a041066-aa69-4fe5-07ed-50ee74875100/public" alt="MediProtect" class="logo" /></NuxtLink>

      <div class="status-box">
        <div class="icon-sms">📱</div>
        <h2>Confirmar Telefono</h2>
        <p v-if="status === 'input'">Ingresa tu numero de telefono para recibir un codigo de verificacion por SMS.</p>
        <p v-else-if="status === 'sent'">Se envio un codigo de 6 digitos a tu telefono. Ingresa el codigo para confirmar.</p>
        <p v-else-if="status === 'success'">{{ mensaje }}</p>
        <p v-else-if="status === 'error'">{{ mensaje }}</p>
      </div>

      <!-- Formulario telefono -->
      <div v-if="status === 'input' || status === 'error'" class="form-section">
        <div class="form-group">
          <label>Numero de telefono</label>
          <input
            v-model="telefono"
            type="tel"
            placeholder="5512345678"
            maxlength="10"
            @input="telefono = formatPhone($event.target.value)"
          />
        </div>
        <button @click="enviarCodigo" class="btn-primary" :disabled="status === 'sending'">
          {{ status === 'sending' ? 'Enviando...' : 'Enviar Codigo' }}
        </button>
      </div>

      <!-- Formulario codigo -->
      <div v-if="status === 'sent' || (status === 'verifying')" class="form-section">
        <div class="form-group">
          <label>Codigo de verificacion</label>
          <input
            v-model="codigo"
            type="text"
            placeholder="000000"
            maxlength="6"
            class="code-input"
            @input="codigo = codigo.replace(/[^0-9]/g, '')"
          />
        </div>
        <button @click="verificarCodigo" class="btn-primary" :disabled="status === 'verifying'">
          {{ status === 'verifying' ? 'Verificando...' : 'Confirmar Codigo' }}
        </button>
        <button
          v-if="canResend"
          @click="enviarCodigo"
          class="btn-link"
        >
          Reenviar codigo
        </button>
        <p v-else class="resend-timer">Reenviar en {{ countdown }}s</p>
      </div>

      <!-- Exito -->
      <div v-if="status === 'success'" class="form-section">
        <div class="icon-success">✓</div>
        <button @click="irADashboard" class="btn-primary">Ir a mi panel</button>
      </div>

      <!-- Error con retry -->
      <div v-if="status === 'error' && mensaje.includes('configurado')" class="form-section">
        <button @click="irADashboard" class="btn-outline">Volver al panel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
  padding: 2rem;
}
.confirm-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.logo { height: 40px; margin-bottom: 2rem; }
.status-box { margin-top: 1rem; margin-bottom: 1.5rem; }
.status-box h2 { margin: 0.8rem 0 0.5rem; color: #2d3436; }
.status-box p { color: #636e72; font-size: 0.95rem; line-height: 1.5; }

.icon-sms {
  width: 64px; height: 64px; border-radius: 50%;
  background: #e3f2fd; color: #1565c0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 2rem;
}
.icon-success {
  width: 64px; height: 64px; border-radius: 50%;
  background: #e8f5e9; color: #2e7d32;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
  margin-bottom: 1rem;
}

.form-section { display: flex; flex-direction: column; gap: 1rem; }

.form-group { text-align: left; }
.form-group label {
  display: block; font-size: 0.85rem; font-weight: 600; color: #2d3436;
  margin-bottom: 0.4rem;
}
.form-group input {
  width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #e0e0e0;
  border-radius: 8px; font-size: 1rem; transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-group input:focus { outline: none; border-color: #00b894; }

.code-input {
  text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem;
  font-weight: 700;
}

.btn-primary {
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: white; border: none; padding: 0.75rem 2rem;
  border-radius: 8px; font-size: 1rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,184,148,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-link {
  background: none; border: none; color: #00b894;
  font-size: 0.9rem; cursor: pointer; text-decoration: underline;
}
.btn-link:hover { color: #00cec9; }

.btn-outline {
  background: transparent; color: #2d3436; border: 1.5px solid #2d3436;
  padding: 0.75rem 2rem; border-radius: 8px; font-weight: 600;
  cursor: pointer; font-size: 1rem; transition: all 0.2s;
}
.btn-outline:hover { background: #f5f5f5; }

.resend-timer { color: #636e72; font-size: 0.85rem; }
</style>
