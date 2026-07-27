<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-md overflow-hidden text-center">
      <!-- Success icon -->
      <div class="bg-green-600 p-8">
        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      </div>

      <div class="p-8">
        <h1 class="text-2xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h1>
        <p class="text-gray-600 mb-6">Tu pago ha sido procesado correctamente.</p>

        <div v-if="pago" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div class="flex justify-between mb-2">
            <span class="text-gray-500 text-sm">Monto:</span>
            <span class="font-bold text-green-600">${{ formatMoney(pago.monto) }} {{ pago.moneda }}</span>
          </div>
          <div class="flex justify-between mb-2">
            <span class="text-gray-500 text-sm">Plan:</span>
            <span class="font-medium text-gray-800">{{ pago.plan_nombre || 'N/A' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 text-sm">Referencia:</span>
            <span class="font-mono text-xs text-gray-600">{{ pago.provedor_pago_id }}</span>
          </div>
        </div>

        <button @click="irAlDashboard"
          class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 mb-3">
          Ir a mi Dashboard
        </button>
        <button @click="router.push('/')"
          class="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200">
          Volver al inicio
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const router = useRouter()
const route = useRoute()
const pago = ref(null)

const formatMoney = (val) => {
  return parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

const irAlDashboard = () => {
  const usuarioCookie = useCookie('usuario')
  if (usuarioCookie.value?.tipo === 'medico') router.push('/medico')
  else router.push('/dashboard')
}

onMounted(async () => {
  const pagoId = route.query.pago_id
  if (pagoId) {
    try {
      const data = await $fetch(`/api/pagos/verificar?pago_id=${pagoId}`)
      pago.value = data.pago
    } catch (err) {
      console.error('Error:', err)
    }
  }
})
</script>
