<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-md overflow-hidden text-center">
      <!-- Error icon -->
      <div class="bg-red-600 p-8">
        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
      </div>

      <div class="p-8">
        <h1 class="text-2xl font-bold text-gray-800 mb-2">Pago No Completado</h1>
        <p class="text-gray-600 mb-4">El pago no pudo ser procesado.</p>
        <p class="text-sm text-gray-500 mb-6">{{ mensaje }}</p>

        <div v-if="pago" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div class="flex justify-between mb-2">
            <span class="text-gray-500 text-sm">Estado:</span>
            <span class="font-bold text-red-600">{{ pago.estado }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 text-sm">Referencia:</span>
            <span class="font-mono text-xs text-gray-600">{{ pago.id }}</span>
          </div>
        </div>

        <button @click="reintentar"
          class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 mb-3">
          Reintentar Pago
        </button>
        <button @click="router.push('/planes')"
          class="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 mb-3">
          Ver Planes
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
const mensaje = ref('Intenta con otro método de pago o contacta soporte.')

const reintentar = () => {
  const pagoId = route.query.pago_id
  if (pagoId) {
    router.push(`/checkout?pago_id=${pagoId}`)
  } else {
    router.push('/planes')
  }
}

onMounted(async () => {
  const pagoId = route.query.pago_id
  if (pagoId) {
    try {
      const data = await $fetch(`/api/pagos/verificar?pago_id=${pagoId}`)
      pago.value = data.pago
      if (data.pago.error_mensaje) mensaje.value = data.pago.error_mensaje
    } catch (err) {
      console.error('Error:', err)
    }
  }
})
</script>
