<script setup lang="ts">
const token = useCookie('token')
const usuario = useCookie('usuario')

const emailConfirmado = computed(() => usuario.value?.email_confirmado === true)
const estado = ref<'pendiente' | 'enviando' | 'enviado' | 'error'>('pendiente')
const errorEnvio = ref('')

async function enviarConfirmacion() {
  if (!usuario.value?.email || !usuario.value?.tipo) return
  estado.value = 'enviando'
  errorEnvio.value = ''
  try {
    await $fetch('/api/auth/enviar-confirmacion', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { email: usuario.value.email, tipo: usuario.value.tipo }
    })
    estado.value = 'enviado'
  } catch (e: any) {
    estado.value = 'error'
    errorEnvio.value = e?.data?.message || 'Error al enviar el correo'
  }
}
</script>

<template>
  <div v-if="!emailConfirmado" class="email-banner">
    <div class="email-banner-inner">
      <div class="email-banner-icon">✉</div>
      <div class="email-banner-text">
        <template v-if="estado === 'enviado'">
          <strong>Correo enviado — Esperando confirmación</strong>
          <span>Revisa tu bandeja de entrada (<strong>{{ usuario?.email }}</strong>) y haz clic en el enlace para confirmar tu correo.</span>
        </template>
        <template v-else>
          <strong>Confirma tu correo electrónico</strong>
          <span>Debes confirmar tu correo para usar todas las funciones de MediProtect.</span>
        </template>
      </div>
      <button
        v-if="estado !== 'enviado'"
        @click="enviarConfirmacion"
        :disabled="estado === 'enviando'"
        class="email-banner-btn"
      >
        {{ estado === 'enviando' ? 'Enviando...' : 'Enviar correo de confirmación' }}
      </button>
    </div>
    <p v-if="errorEnvio" class="email-banner-error">{{ errorEnvio }}</p>
  </div>
</template>

<style scoped>
.email-banner {
  background: linear-gradient(135deg, #fff3e0, #fff8e1);
  border: 1px solid #ffe0b2;
  border-radius: 10px;
  padding: 0.8rem 1.2rem;
  margin-bottom: 1.2rem;
}
.email-banner-inner {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.email-banner-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}
.email-banner-text {
  flex: 1;
  min-width: 200px;
}
.email-banner-text strong {
  display: block;
  color: #e65100;
  font-size: 0.9rem;
  margin-bottom: 0.15rem;
}
.email-banner-text span {
  font-size: 0.82rem;
  color: #636e72;
}
.email-banner-btn {
  background: #e65100;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.email-banner-btn:hover:not(:disabled) { background: #bf360c; }
.email-banner-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.email-banner-error {
  color: #c62828;
  font-size: 0.8rem;
  margin: 0.4rem 0 0;
}
</style>