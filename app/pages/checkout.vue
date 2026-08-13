<template>
  <div class="checkout-page">
    <div class="checkout-card">
      <div v-if="cargando" class="loading-state">
        <div class="spinner"></div>
        <p>Preparando pago...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="icon-circle red">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <h2>Error al procesar</h2>
        <p>{{ error }}</p>
        <button @click="$router.back()" class="btn-secondary">Volver</button>
      </div>

      <div v-else>
        <div class="checkout-header">
          <div class="brand-icon">M</div>
          <h2>MediProtect</h2>
          <p class="subtitle">Pago seguro</p>
        </div>

        <div class="plan-details">
          <div class="detail-row"><span>Plan:</span><strong>{{ pago.plan_nombre || 'Plan MediProtect' }}</strong></div>
          <div class="detail-row total"><span>Total a pagar:</span><strong>${{ formatMoney(pago.monto) }} {{ pago.moneda }}</strong></div>
        </div>

        <div class="payment-form">
          <h3>Metodo de pago</h3>
          <div class="metodos">
            <label v-for="metodo in metodos" :key="metodo.id" class="metodo-option" :class="{ active: metodoSeleccionado === metodo.id }">
              <input type="radio" :value="metodo.id" v-model="metodoSeleccionado" />
              <span class="metodo-icon">{{ metodo.icono }}</span>
              <div><p class="metodo-name">{{ metodo.nombre }}</p><p class="metodo-desc">{{ metodo.descripcion }}</p></div>
            </label>
          </div>

          <div v-if="metodoSeleccionado !== 'paypal'" class="card-form">
            <div class="form-group">
              <label>Numero de tarjeta</label>
              <input type="text" v-model="tarjeta.numero" placeholder="1234 5678 9012 3456" maxlength="19" @input="formatearNumero" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Vencimiento</label>
                <input type="text" v-model="tarjeta.vencimiento" placeholder="MM/AA" maxlength="5" @input="formatearVencimiento" />
              </div>
              <div class="form-group">
                <label>CVV</label>
                <input type="password" v-model="tarjeta.cvv" placeholder="123" maxlength="4" />
              </div>
            </div>
            <div class="form-group">
              <label>Nombre en la tarjeta</label>
              <input type="text" v-model="tarjeta.nombre" placeholder="Como aparece en la tarjeta" />
            </div>
          </div>

          <div v-if="metodoSeleccionado === 'paypal'" class="paypal-notice">
            Seras redirigido a PayPal para completar el pago de forma segura.
          </div>

          <div v-if="pago.sandbox" class="sandbox-notice">Modo sandbox - No se realizara un cobro real</div>

          <button @click="procesarPago" :disabled="procesando || !metodoSeleccionado" class="btn-pay">
            <span v-if="procesando" class="spinner-small"></span>
            {{ procesando ? 'Procesando...' : 'Pagar $' + formatMoney(pago.monto) }}
          </button>
          <p class="secure-text">Pago seguro con encriptacion SSL. Tus datos estan protegidos.</p>
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

const metodos = ref([])
const metodoSeleccionado = ref('')

const tarjeta = reactive({ numero: '', vencimiento: '', cvv: '', nombre: '' })

const allMetodos = [
  { id: 'mercadopago', nombre: 'MercadoPago', icono: 'MP', descripcion: 'Tarjeta de credito o debito' },
  { id: 'stripe', nombre: 'Stripe', icono: 'ST', descripcion: 'Tarjeta de credito o debito' },
  { id: 'paypal', nombre: 'PayPal', icono: 'PP', descripcion: 'Paga con tu cuenta PayPal' }
]

const formatMoney = (val) => parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

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
  if (!pagoId) { error.value = 'No se especifico un ID de pago'; cargando.value = false; return }
  try {
    const [pagoData, configData] = await Promise.all([
      $fetch(`/api/pagos/verificar?pago_id=${pagoId}`),
      $fetch('/api/pagos/configuracion')
    ])
    pago.value = pagoData.pago
    const proveedores = configData.proveedores || {}
    metodos.value = allMetodos.filter(m => proveedores[m.id])
    if (pago.value.provedor && proveedores[pago.value.provedor]) {
      metodoSeleccionado.value = pago.value.provedor
    } else if (metodos.value.length > 0) {
      metodoSeleccionado.value = metodos.value[0].id
    }
  } catch (err) {
    error.value = err.data?.message || 'Error al cargar informacion del pago'
  } finally { cargando.value = false }
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
          numero: tarjeta.numero.replace(/\s/g, ''), vencimiento: tarjeta.vencimiento,
          cvv: tarjeta.cvv, nombre: tarjeta.nombre
        } : null
      }
    })
    if (data.success) {
      const doctorParam = route.query.doctor ? '&doctor=' + encodeURIComponent(route.query.doctor as string) : ''
      router.push('/pago-exito?pago_id=' + pago.value.id + doctorParam)
    }
    else error.value = data.message || 'Error al procesar el pago'
  } catch (err) {
    error.value = err.data?.message || 'Error al procesar el pago'
  } finally { procesando.value = false }
}

onMounted(() => { cargarPago() })
</script>

<style scoped>
.checkout-page { min-height: 100vh; background: #f5f6fa; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.checkout-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e0e0e0; width: 100%; max-width: 440px; overflow: hidden; }
.loading-state, .error-state { padding: 3rem; text-align: center; }
.spinner { width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top-color: #00b894; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
.spinner-small { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 0.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.icon-circle { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
.icon-circle.red { background: #ffebee; }
.icon-circle.red .icon { width: 30px; height: 30px; color: #c62828; }
.error-state h2 { font-size: 1.25rem; color: #2d3436; margin: 0 0 0.5rem; }
.error-state p { color: #636e72; margin-bottom: 1.5rem; }
.checkout-header { background: #00b894; padding: 2rem; text-align: center; color: white; }
.brand-icon { width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; font-size: 1.5rem; font-weight: 700; color: #00b894; }
.checkout-header h2 { margin: 0; font-size: 1.25rem; }
.subtitle { margin: 0.25rem 0 0; font-size: 0.85rem; opacity: 0.9; }
.plan-details { padding: 1.5rem; border-bottom: 1px solid #f0f0f0; }
.detail-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; }
.detail-row span { color: #636e72; }
.detail-row strong { color: #2d3436; }
.detail-row.total strong { color: #00b894; font-size: 1.5rem; }
.payment-form { padding: 1.5rem; }
.payment-form h3 { margin: 0 0 1rem; font-size: 1rem; color: #2d3436; }
.metodos { margin-bottom: 1.5rem; }
.metodo-option { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; margin-bottom: 0.5rem; transition: border-color 0.2s; }
.metodo-option.active { border-color: #00b894; background: #f0fff4; }
.metodo-option input { margin: 0; }
.metodo-icon { width: 36px; height: 36px; background: #f5f6fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; color: #636e72; }
.metodo-name { margin: 0; font-weight: 600; font-size: 0.9rem; color: #2d3436; }
.metodo-desc { margin: 0.15rem 0 0; font-size: 0.75rem; color: #b2bec3; }
.card-form { margin-bottom: 1rem; }
.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-size: 0.8rem; font-weight: 500; color: #2d3436; }
.form-group input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; box-sizing: border-box; font-family: monospace; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.paypal-notice { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 1rem; font-size: 0.85rem; color: #f57f17; margin-bottom: 1rem; }
.sandbox-notice { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; color: #f57f17; margin-bottom: 1rem; text-align: center; }
.btn-pay { width: 100%; padding: 0.8rem; background: #00b894; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.btn-pay:hover { background: #00a381; }
.btn-pay:disabled { opacity: 0.5; cursor: not-allowed; }
.secure-text { text-align: center; font-size: 0.75rem; color: #b2bec3; margin-top: 0.75rem; }
.btn-secondary { background: #636e72; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; cursor: pointer; }
</style>
