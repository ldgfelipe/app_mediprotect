<template>
  <div class="result-page">
    <div class="result-card">
      <div class="result-icon red">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>
      </div>
      <div class="result-body">
        <h1>Pago No Completado</h1>
        <p>El pago no pudo ser procesado.</p>
        <p class="detail">{{ mensaje }}</p>
        <div v-if="pago" class="pago-info">
          <div class="info-row"><span>Estado:</span><strong class="red">{{ pago.estado }}</strong></div>
          <div class="info-row"><span>Referencia:</span><span class="mono">{{ pago.id }}</span></div>
        </div>
        <button @click="reintentar" class="btn-primary">Reintentar Pago</button>
        <button @click="router.push('/planes')" class="btn-secondary">Ver Planes</button>
        <button @click="router.push('/')" class="btn-ghost">Volver al inicio</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const router = useRouter()
const route = useRoute()
const pago = ref(null)
const mensaje = ref('Intenta con otro metodo de pago o contacta soporte.')

const reintentar = () => {
  const pagoId = route.query.pago_id
  if (pagoId) router.push(`/checkout?pago_id=${pagoId}`)
  else router.push('/planes')
}

onMounted(async () => {
  const pagoId = route.query.pago_id
  if (pagoId) {
    try {
      const data = await $fetch(`/api/pagos/verificar?pago_id=${pagoId}`)
      pago.value = data.pago
      if (data.pago.error_mensaje) mensaje.value = data.pago.error_mensaje
    } catch (err) { console.error('Error:', err) }
  }
})
</script>

<style scoped>
.result-page { min-height: 100vh; background: #f5f6fa; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.result-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e0e0e0; width: 100%; max-width: 420px; overflow: hidden; }
.result-icon { padding: 2rem; text-align: center; }
.result-icon.red { background: #c0392b; }
.result-icon .icon { width: 50px; height: 50px; color: white; }
.result-body { padding: 2rem; text-align: center; }
.result-body h1 { margin: 0 0 0.5rem; font-size: 1.5rem; color: #2d3436; }
.result-body > p { margin: 0 0 0.5rem; color: #636e72; }
.detail { font-size: 0.85rem; color: #b2bec3; margin-bottom: 1.5rem !important; }
.pago-info { background: #f5f6fa; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left; }
.info-row { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.85rem; }
.info-row span { color: #636e72; }
.info-row strong { color: #2d3436; }
.info-row strong.red { color: #c0392b; }
.info-row .mono { font-family: monospace; font-size: 0.75rem; color: #636e72; }
.btn-primary { width: 100%; padding: 0.75rem; background: #00b894; color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; }
.btn-primary:hover { background: #00a381; }
.btn-secondary { width: 100%; padding: 0.75rem; background: #636e72; color: white; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; margin-bottom: 0.75rem; }
.btn-secondary:hover { background: #555; }
.btn-ghost { width: 100%; padding: 0.75rem; background: #f5f6fa; color: #636e72; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
.btn-ghost:hover { background: #e0e0e0; }
</style>
