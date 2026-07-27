<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/dashboard" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </NuxtLink>
          <h1 class="text-xl font-bold text-gray-800">Configuración de Pagos</h1>
        </div>
        <button @click="guardar" :disabled="guardando"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
          {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Mensaje de éxito -->
      <div v-if="mensajeExito" class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
        {{ mensajeExito }}
      </div>

      <!-- Proveedor preferido -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Proveedor Preferido</h2>
        <select v-model="config.pago_proveedor_preferido"
          class="w-full border border-gray-300 rounded-lg px-3 py-2">
          <option value="mercadopago">MercadoPago</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
        <p class="text-sm text-gray-500 mt-1">Proveedor que se usará por defecto para nuevos pagos</p>
      </div>

      <!-- MercadoPago -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-800">MercadoPago</h2>
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="config.pago_mercadopago_sandbox" true-value="true" false-value="false"
              class="w-4 h-4 rounded border-gray-300 text-green-600">
            <span class="text-sm text-gray-600">Sandbox</span>
          </label>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
            <input type="password" v-model="config.pago_mercadopago_key" placeholder="APP_USR-..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
            <input type="password" v-model="config.pago_mercadopago_secret" placeholder="APP_USR-..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL Webhook</label>
            <input type="text" v-model="config.pago_mercadopago_webhook"
              placeholder="https://app.mediprotect.com.mx/api/pagos/webhook?provedor=mercadopago"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          </div>
        </div>
        <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <strong>Sandbox:</strong> Credenciales de prueba en
          <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" class="text-green-600 underline">developer panel</a>
        </div>
      </div>

      <!-- Stripe -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-800">Stripe</h2>
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="config.pago_stripe_sandbox" true-value="true" false-value="false"
              class="w-4 h-4 rounded border-gray-300 text-green-600">
            <span class="text-sm text-gray-600">Sandbox</span>
          </label>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
            <input type="password" v-model="config.pago_stripe_key" placeholder="pk_test_..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
            <input type="password" v-model="config.pago_stripe_secret" placeholder="sk_test_..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL Webhook</label>
            <input type="text" v-model="config.pago_stripe_webhook"
              placeholder="https://app.mediprotect.com.mx/api/pagos/webhook?provedor=stripe"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          </div>
        </div>
        <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <strong>Sandbox:</strong> Credenciales de prueba en
          <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" class="text-green-600 underline">Stripe Dashboard</a>
        </div>
      </div>

      <!-- PayPal -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-800">PayPal</h2>
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="config.pago_paypal_sandbox" true-value="true" false-value="false"
              class="w-4 h-4 rounded border-gray-300 text-green-600">
            <span class="text-sm text-gray-600">Sandbox</span>
          </label>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input type="password" v-model="config.pago_paypal_client_id" placeholder="AYSq3RDG..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input type="password" v-model="config.pago_paypal_secret" placeholder="EGnHDxD_..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL Webhook</label>
            <input type="text" v-model="config.pago_paypal_webhook"
              placeholder="https://app.mediprotect.com.mx/api/pagos/webhook?provedor=paypal"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          </div>
        </div>
        <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <strong>Sandbox:</strong> Credenciales de prueba en
          <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" class="text-green-600 underline">PayPal Developer</a>
        </div>
      </div>

      <!-- Redirecciones -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Redirecciones</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pago Exitoso</label>
            <input type="text" v-model="config.pago_redireccion_exito" placeholder="/pago-exito"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pago Fallido</label>
            <input type="text" v-model="config.pago_redireccion_error" placeholder="/pago-error"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin' })

const config = reactive({
  pago_proveedor_preferido: 'mercadopago',
  pago_mercadopago_key: '',
  pago_mercadopago_secret: '',
  pago_mercadopago_webhook: '',
  pago_mercadopago_sandbox: 'true',
  pago_stripe_key: '',
  pago_stripe_secret: '',
  pago_stripe_webhook: '',
  pago_stripe_sandbox: 'true',
  pago_paypal_client_id: '',
  pago_paypal_secret: '',
  pago_paypal_webhook: '',
  pago_paypal_sandbox: 'true',
  pago_moneda_default: 'MXN',
  pago_redireccion_exito: '/pago-exito',
  pago_redireccion_error: '/pago-error'
})

const guardando = ref(false)
const mensajeExito = ref('')

const cargarConfig = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const data = await $fetch('/api/admin/configuracion-pagos', {
      headers: { Authorization: `Bearer ${token}` }
    })
    for (const item of data.configuracion) {
      if (config.hasOwnProperty(item.clave)) {
        config[item.clave] = item.valor || ''
      }
    }
  } catch (err) {
    console.error('Error cargando configuración:', err)
  }
}

const guardar = async () => {
  guardando.value = true
  mensajeExito.value = ''
  try {
    const token = localStorage.getItem('admin_token')
    const configuraciones = Object.entries(config).map(([clave, valor]) => ({ clave, valor }))
    await $fetch('/api/admin/configuracion-pagos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { configuraciones }
    })
    mensajeExito.value = 'Configuración guardada correctamente'
    setTimeout(() => { mensajeExito.value = '' }, 3000)
  } catch (err) {
    console.error('Error guardando:', err)
    alert('Error al guardar')
  } finally {
    guardando.value = false
  }
}

onMounted(() => { cargarConfig() })
</script>
