<script setup lang="ts">
const usuario = useCookie('usuario')
const { config: verifConfig, loadConfig: loadVerifConfig } = useVerificacionConfig()
const showForm = ref(false)
const telefono = ref('')
const codigo = ref('')
const step = ref<'phone' | 'code'>('phone')
const loading = ref(false)
const success = ref(false)
const error = ref('')
const countdown = ref(0)
const canResend = ref(true)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const needsConfirmation = computed(() => {
  return verifConfig.value.requirePhone && usuario.value && !usuario.value.telefono_confirmado && usuario.value.telefono
})

onMounted(() => { loadVerifConfig() })

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

function formatPhone(value: string) {
  return value.replace(/[^0-9]/g, '').substring(0, 10)
}

async function enviarCodigo() {
  if (!telefono.value || telefono.value.length < 10) {
    error.value = 'Ingresa un numero valido (10 digitos)'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res: any = await $fetch('/api/auth/enviar-sms-confirmacion', {
      method: 'POST',
      body: { telefono: telefono.value }
    })
    if (res?.autoConfirmado) {
      success.value = true
      usuario.value = { ...usuario.value, telefono_confirmado: true }
      return
    }
    step.value = 'code'
    canResend.value = false
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        canResend.value = true
        clearInterval(countdownTimer!)
        countdownTimer = null
      }
    }, 1000)
  } catch (e: any) {
    error.value = e?.data?.message || 'Error enviando codigo'
  } finally {
    loading.value = false
  }
}

async function verificarCodigo() {
  if (!codigo.value || codigo.value.length !== 6) {
    error.value = 'Ingresa el codigo de 6 digitos'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res: any = await $fetch('/api/auth/confirmar-telefono', {
      method: 'POST',
      body: { codigo: codigo.value, telefono: telefono.value }
    })
    success.value = true
    usuario.value = { ...usuario.value, telefono_confirmado: true }
  } catch (e: any) {
    error.value = e?.data?.message || 'Error verificando codigo'
  } finally {
    loading.value = false
  }
}

function dismiss() {
  showForm.value = false
}
</script>

<template>
  <div v-if="needsConfirmation && !success" class="sms-banner">
    <div class="banner-content">
      <span class="banner-icon">📱</span>
      <div class="banner-text">
        <strong>Confirma tu numero de telefono</strong>
        <span>Recibe notificaciones por SMS de tus citas medicas</span>
      </div>
      <button v-if="!showForm" @click="showForm = true; telefono = usuario?.telefono || ''" class="banner-btn">
        Confirmar
      </button>
      <button v-else @click="dismiss" class="banner-close">&times;</button>
    </div>

    <div v-if="showForm" class="banner-form">
      <!-- Paso 1: Telefono -->
      <div v-if="step === 'phone'" class="banner-form-row">
        <input
          v-model="telefono"
          type="tel"
          placeholder="5512345678"
          maxlength="10"
          class="banner-input"
          @input="telefono = formatPhone($event.target.value)"
        />
        <button @click="enviarCodigo" class="banner-btn" :disabled="loading">
          {{ loading ? '...' : 'Enviar' }}
        </button>
      </div>

      <!-- Paso 2: Codigo -->
      <div v-if="step === 'code'" class="banner-form-row">
        <input
          v-model="codigo"
          type="text"
          placeholder="000000"
          maxlength="6"
          class="banner-input code"
          @input="codigo = codigo.replace(/[^0-9]/g, '')"
        />
        <button @click="verificarCodigo" class="banner-btn" :disabled="loading">
          {{ loading ? '...' : 'Verificar' }}
        </button>
      </div>

      <p v-if="error" class="banner-error">{{ error }}</p>
      <p v-if="step === 'code' && !canResend" class="banner-timer">Reenviar en {{ countdown }}s</p>
      <button v-if="step === 'code' && canResend" @click="enviarCodigo" class="banner-link">
        Reenviar codigo
      </button>
    </div>
  </div>
</template>

<style scoped>
.sms-banner {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border: 1px solid #ffcc02;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}
.banner-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.banner-icon { font-size: 1.5rem; }
.banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.banner-text strong { font-size: 0.9rem; color: #e65100; }
.banner-text span { font-size: 0.8rem; color: #bf360c; }
.banner-btn {
  background: #e65100;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.banner-btn:hover { background: #bf360c; }
.banner-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.banner-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #bf360c;
  cursor: pointer;
  padding: 0 0.5rem;
}
.banner-form {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0,0,0,0.1);
}
.banner-form-row {
  display: flex;
  gap: 0.5rem;
}
.banner-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ffcc02;
  border-radius: 6px;
  font-size: 0.9rem;
}
.banner-input.code {
  text-align: center;
  letter-spacing: 0.3rem;
  font-weight: 700;
}
.banner-input:focus { outline: none; border-color: #e65100; }
.banner-error {
  color: #c62828;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}
.banner-timer {
  color: #bf360c;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}
.banner-link {
  background: none;
  border: none;
  color: #e65100;
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin-top: 0.5rem;
}
</style>
