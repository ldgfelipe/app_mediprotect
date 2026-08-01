<script setup>
const adminToken = useCookie('admin_token')

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
  pago_redireccion_error: '/pago-error',
  costo_minimo_cita: '500',
})

const guardando = ref(false)
const mensajeExito = ref('')

const cargarConfig = async () => {
  try {
    const data = await $fetch('/api/admin/configuracion-pagos', {
      headers: { Authorization: `Bearer ${adminToken.value}` }
    })
    for (const item of data.configuracion) {
      if (config.hasOwnProperty(item.clave)) {
        config[item.clave] = item.valor || ''
      }
    }
  } catch (err) {
    console.error('Error cargando configuracion:', err)
  }
}

const guardar = async () => {
  guardando.value = true
  mensajeExito.value = ''
  try {
    const configuraciones = Object.entries(config).map(([clave, valor]) => ({ clave, valor }))
    await $fetch('/api/admin/configuracion-pagos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken.value}` },
      body: { configuraciones }
    })
    mensajeExito.value = 'Configuracion guardada correctamente'
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