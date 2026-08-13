<template>
  <div class="result-page">
    <div class="result-card">
      <div class="result-icon green">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div class="result-body">
        <h1>Pago Exitoso!</h1>
        <p>Tu pago ha sido procesado correctamente.</p>
        <div v-if="pago" class="pago-info">
          <div class="info-row"><span>Monto:</span><strong>${{ formatMoney(pago.monto) }} {{ pago.moneda }}</strong></div>
          <div class="info-row"><span>Plan:</span><strong>{{ pago.plan_nombre || 'N/A' }}</strong></div>
          <div class="info-row"><span>Referencia:</span><span class="mono">{{ pago.provedor_pago_id }}</span></div>
        </div>
        <div v-if="doctorPendiente" class="doctor-info">
          <p>Tu plan ya está activo. Puedes agendar tu cita ahora.</p>
        </div>
        <button @click="irAlDashboard" class="btn-primary">
          {{ doctorPendiente ? 'Agendar mi Cita' : 'Ir a mi Dashboard' }}
        </button>
        <button @click="router.push('/')" class="btn-ghost">Volver al inicio</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const router = useRouter()
const route = useRoute()
const pago = ref(null)
const doctorPendiente = ref('')

const formatMoney = (val) => parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

const irAlDashboard = () => {
  if (doctorPendiente.value) {
    router.push(`/agendar-cita?doctor=${encodeURIComponent(doctorPendiente.value)}`)
  } else {
    router.push('/dashboard/paciente')
  }
}

onMounted(async () => {
  doctorPendiente.value = String(route.query.doctor || '') || localStorage.getItem('agendar_doctor') || ''
  const pagoId = route.query.pago_id
  if (pagoId) {
    try {
      const data = await $fetch(`/api/pagos/verificar?pago_id=${pagoId}`)
      pago.value = data.pago
    } catch (err) { console.error('Error:', err) }
  }
  localStorage.removeItem('agendar_pendiente')
})
</script>

<style scoped>
.result-page { min-height: 100vh; background: #f5f6fa; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.result-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e0e0e0; width: 100%; max-width: 420px; overflow: hidden; }
.result-icon { padding: 2rem; text-align: center; }
.result-icon.green { background: #00b894; }
.result-icon .icon { width: 50px; height: 50px; color: white; }
.result-body { padding: 2rem; text-align: center; }
.result-body h1 { margin: 0 0 0.5rem; font-size: 1.5rem; color: #2d3436; }
.result-body > p { margin: 0 0 1.5rem; color: #636e72; }
.pago-info { background: #f5f6fa; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left; }
.info-row { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.85rem; }
.info-row span { color: #636e72; }
.info-row strong { color: #00b894; }
.info-row .mono { font-family: monospace; font-size: 0.8rem; color: #636e72; }
.btn-primary { width: 100%; padding: 0.75rem; background: #00b894; color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; }
.btn-primary:hover { background: #00a381; }
.btn-ghost { width: 100%; padding: 0.75rem; background: #f5f6fa; color: #636e72; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
.btn-ghost:hover { background: #e0e0e0; }
.doctor-info { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; }
.doctor-info p { margin: 0; font-size: 0.9rem; color: #2d3436; }
</style>
