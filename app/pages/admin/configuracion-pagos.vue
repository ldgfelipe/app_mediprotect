<script setup>
definePageMeta({ middleware: 'admin-auth' })

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
  pago_redireccion_error: '/pago-error'
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

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
        <NuxtLink to="/admin/configuracion-pagos" class="active">Config. Pagos</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesion</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <h1>Configuracion de Pagos</h1>
        <button @click="guardar" :disabled="guardando" class="btn-primary">
          {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </header>

      <div v-if="mensajeExito" class="msg-success">{{ mensajeExito }}</div>

      <!-- Proveedor preferido -->
      <div class="config-section">
        <h2>Proveedor Preferido</h2>
        <select v-model="config.pago_proveedor_preferido">
          <option value="mercadopago">MercadoPago</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
        <p class="hint">Proveedor que se usara por defecto para nuevos pagos</p>
      </div>

      <!-- MercadoPago -->
      <div class="config-section">
        <div class="section-header">
          <h2>MercadoPago</h2>
          <label class="toggle">
            <input type="checkbox" v-model="config.pago_mercadopago_sandbox" true-value="true" false-value="false" />
            <span>Sandbox</span>
          </label>
        </div>
        <div class="form-group">
          <label>Public Key</label>
          <input type="password" v-model="config.pago_mercadopago_key" placeholder="APP_USR-..." />
        </div>
        <div class="form-group">
          <label>Access Token</label>
          <input type="password" v-model="config.pago_mercadopago_secret" placeholder="APP_USR-..." />
        </div>
        <div class="form-group">
          <label>URL Webhook</label>
          <input type="text" v-model="config.pago_mercadopago_webhook" placeholder="https://app.mediprotect.com.mx/api/pagos/webhook?provedor=mercadopago" />
        </div>
        <p class="hint">Sandbox: Credenciales de prueba en <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank">developer panel</a></p>
      </div>

      <!-- Stripe -->
      <div class="config-section">
        <div class="section-header">
          <h2>Stripe</h2>
          <label class="toggle">
            <input type="checkbox" v-model="config.pago_stripe_sandbox" true-value="true" false-value="false" />
            <span>Sandbox</span>
          </label>
        </div>
        <div class="form-group">
          <label>Publishable Key</label>
          <input type="password" v-model="config.pago_stripe_key" placeholder="pk_test_..." />
        </div>
        <div class="form-group">
          <label>Secret Key</label>
          <input type="password" v-model="config.pago_stripe_secret" placeholder="sk_test_..." />
        </div>
        <div class="form-group">
          <label>URL Webhook</label>
          <input type="text" v-model="config.pago_stripe_webhook" placeholder="https://app.mediprotect.com.mx/api/pagos/webhook?provedor=stripe" />
        </div>
        <p class="hint">Sandbox: Credenciales de prueba en <a href="https://dashboard.stripe.com/test/apikeys" target="_blank">Stripe Dashboard</a></p>
      </div>

      <!-- PayPal -->
      <div class="config-section">
        <div class="section-header">
          <h2>PayPal</h2>
          <label class="toggle">
            <input type="checkbox" v-model="config.pago_paypal_sandbox" true-value="true" false-value="false" />
            <span>Sandbox</span>
          </label>
        </div>
        <div class="form-group">
          <label>Client ID</label>
          <input type="password" v-model="config.pago_paypal_client_id" placeholder="AYSq3RDG..." />
        </div>
        <div class="form-group">
          <label>Client Secret</label>
          <input type="password" v-model="config.pago_paypal_secret" placeholder="EGnHDxD_..." />
        </div>
        <div class="form-group">
          <label>URL Webhook</label>
          <input type="text" v-model="config.pago_paypal_webhook" placeholder="https://app.mediprotect.com.mx/api/pagos/webhook?provedor=paypal" />
        </div>
        <p class="hint">Sandbox: Credenciales de prueba en <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank">PayPal Developer</a></p>
      </div>

      <!-- Redirecciones -->
      <div class="config-section">
        <h2>Redirecciones</h2>
        <div class="form-row">
          <div class="form-group">
            <label>Pago Exitoso</label>
            <input type="text" v-model="config.pago_redireccion_exito" placeholder="/pago-exito" />
          </div>
          <div class="form-group">
            <label>Pago Fallido</label>
            <input type="text" v-model="config.pago_redireccion_error" placeholder="/pago-error" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-brand h2 { font-size: 1.1rem; margin: 0; }
.sidebar-brand .rol { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; text-align: center; text-decoration: none; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.btn-primary:hover { background: #00a381; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.msg-success { background: #e8f5e9; color: #2e7d32; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
.config-section { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; }
.config-section h2 { margin: 0 0 1rem; color: #2d3436; font-size: 1.1rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-header h2 { margin: 0; }
.toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #636e72; cursor: pointer; }
.toggle input { width: 16px; height: 16px; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; font-weight: 500; color: #2d3436; }
.form-group input, .form-group select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.85rem; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #00b894; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: #b2bec3; }
.hint a { color: #00b894; }
</style>
