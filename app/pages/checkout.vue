<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-md overflow-hidden">
      <!-- Loading -->
      <div v-if="cargando" class="p-8 text-center">
        <div class="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">Preparando pago...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Error al procesar</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button @click="$router.back()" class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
          Volver
        </button>
      </div>

      <!-- Formulario de pago -->
      <div v-else>
        <!-- Header -->
        <div class="bg-green-600 p-6 text-white text-center">
          <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-2xl">🛡️</span>
          </div>
          <h2 class="text-xl font-bold">MediProtect</h2>
          <p class="text-green-100 text-sm mt-1">Pago seguro</p>
        </div>

        <!-- Detalles del plan -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-600">Plan:</span>
            <span class="font-bold text-gray-800">{{ pago.plan_nombre || 'Plan MediProtect' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Total a pagar:</span>
            <span class="text-2xl font-bold text-green-600">${{ formatMoney(pago.monto) }} {{ pago.moneda }}</span>
          </div>
        </div>

        <!-- Selección de método de pago -->
        <div class="p-6">
          <h3 class="font-bold text-gray-800 mb-3">Método de pago</h3>
          <div class="space-y-2 mb-6">
            <label v-for="metodo in metodos" :key="metodo.id"
              class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition"
              :class="metodoSeleccionado === metodo.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'">
              <input type="radio" :value="metodo.id" v-model="metodoSeleccionado"
                class="text-green-600 focus:ring-green-500">
              <span class="text-2xl">{{ metodo.icono }}</span>
              <div>
                <p class="font-medium text-gray-800">{{ metodo.nombre }}</p>
                <p class="text-xs text-gray-500">{{ metodo.descripcion }}</p>
              </div>
            </label>
          </div>

          <!-- Formulario de tarjeta (solo para MercadoPago/Stripe) -->
          <div v-if="metodoSeleccionado !== 'paypal'" class="space-y-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Número de tarjeta</label>
              <input type="text" v-model="tarjeta.numero" placeholder="1234 5678 9012 3456" maxlength="19"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                @input="formatearNumero">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
                <input type="text" v-model="tarjeta.vencimiento" placeholder="MM/AA" maxlength="5"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                  @input="formatearVencimiento">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input type="password" v-model="tarjeta.cvv" placeholder="123" maxlength="4"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre en la tarjeta</label>
              <input type="text" v-model="tarjeta.nombre" placeholder="Como aparece en la tarjeta"
                class="w-full border border-gray-300 rounded-lg px-3 py-2">
            </div>
          </div>

          <!-- PayPal notice -->
          <div v-if="metodoSeleccionado === 'paypal'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
            Serás redirigido a PayPal para completar el pago de forma segura.
          </div>

          <!-- Sandbox notice -->
          <div v-if="pago.sandbox" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-700 flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            Modo sandbox — No se realizará un cobro real
          </div>

          <!-- Botón de pago -->
          <button @click="procesarPago" :disabled="procesando || !metodoSeleccionado"
            class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <div v-if="procesando" class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            {{ procesando ? 'Procesando...' : `Pagar $${formatMoney(pago.monto)}` }}
          </button>

          <p class="text-xs text-gray-400 text-center mt-3">
            Pago seguro con encriptación SSL. Tus datos están protegidos.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()

const cargando = ref(true)
const error = ref('')
const procesando = ref(false)
const pago = ref({ monto: 0, moneda: 'MXN', plan_nombre: '', sandbox: true })
const metodoSeleccionado = ref('mercadopago')

const tarjeta = reactive({
  numero: '',
  vencimiento: '',
  cvv: '',
  nombre: ''
})

const metodos = [
  { id: 'mercadopago', nombre: 'MercadoPago', icono: '💳', descripcion: 'Tarjeta de crédito o débito' },
  { id: 'stripe', nombre: 'Stripe', icono: '💳', descripcion: 'Tarjeta de crédito o débito' },
  { id: 'paypal', nombre: 'PayPal', icono: '🅿️', descripcion: 'Paga con tu cuenta PayPal' }
]

const formatMoney = (val) => {
  return parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

const formatearNumero = () => {
  let val = tarjeta.numero.replace(/\D/g, '')
  val = val.replace(/(.{4})/g, '$1 ').trim()
  tarjeta.numero = val
}

const formatearVencimiento = () => {
  let val = tarjeta.vencimiento.replace(/\D/g, '')
  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2)
  tarjeta.vencimiento = val
}

const cargarPago = async () => {
  const pagoId = route.query.pago_id
  if (!pagoId) {
    error.value = 'No se especificó un ID de pago'
    cargando.value = false
    return
  }

  try {
    const user = JSON.parse(localStorage.getItem('mediprotect_user') || '{}')
    const data = await $fetch(`/api/pagos/verificar?pago_id=${pagoId}`, {
      headers: user.token ? { Authorization: `Bearer ${user.token}` } : {}
    })
    pago.value = data.pago
    metodoSeleccionado.value = data.pago.provedor || 'mercadopago'
  } catch (err) {
    error.value = err.data?.message || 'Error al cargar información del pago'
  } finally {
    cargando.value = false
  }
}

const procesarPago = async () => {
  if (metodoSeleccionado.value !== 'paypal' && (!tarjeta.numero || !tarjeta.vencimiento || !tarjeta.cvv || !tarjeta.nombre)) {
    return alert('Completa todos los datos de la tarjeta')
  }

  procesando.value = true
  try {
    const user = JSON.parse(localStorage.getItem('mediprotect_user') || '{}')
    const data = await $fetch('/api/pagos/procesar', {
      method: 'POST',
      headers: user.token ? { Authorization: `Bearer ${user.token}` } : {},
      body: {
        pago_id: pago.value.id,
        metodo: metodoSeleccionado.value,
        tarjeta: metodoSeleccionado.value !== 'paypal' ? {
          numero: tarjeta.numero.replace(/\s/g, ''),
          vencimiento: tarjeta.vencimiento,
          cvv: tarjeta.cvv,
          nombre: tarjeta.nombre
        } : null
      }
    })

    if (data.success) {
      router.push('/pago-exito?pago_id=' + pago.value.id)
    } else {
      error.value = data.message || 'Error al procesar el pago'
    }
  } catch (err) {
    error.value = err.data?.message || 'Error al procesar el pago'
  } finally {
    procesando.value = false
  }
}

onMounted(() => { cargarPago() })
</script>
