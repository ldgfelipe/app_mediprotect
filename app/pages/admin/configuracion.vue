<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h2>MediProtect</h2>
        <span class="role-badge">{{ adminUsuario?.rol_nombre || 'Administrador' }}</span>
      </div>
      <nav>
        <NuxtLink to="/admin" class="nav-link">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes" class="nav-link">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos" class="nav-link">Médicos</NuxtLink>
        <NuxtLink to="/admin/citas" class="nav-link">Citas</NuxtLink>
        <NuxtLink to="/admin/pagos" class="nav-link">Pagos</NuxtLink>
        <NuxtLink to="/admin/planes" class="nav-link">Planes</NuxtLink>
        <NuxtLink to="/admin/empresas" class="nav-link">Empresas</NuxtLink>
        <NuxtLink to="/admin/asistentes" class="nav-link">Asistentes</NuxtLink>
        <NuxtLink to="/admin/configuracion" class="nav-link active">Configuración</NuxtLink>
        <NuxtLink to="/admin/configuracion/datos" class="nav-link">Gestión de Datos</NuxtLink>
      </nav>
      <button class="btn-logout" @click="logout">Cerrar Sesión</button>
    </aside>

    <main class="admin-content">
      <header class="content-header">
        <h1>Configuración</h1>
        <p>Configura los proveedores de inteligencia artificial para búsqueda de médicos</p>
      </header>

      <!-- Estado de proveedores -->
      <div class="providers-status">
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="provider-badge"
          :class="{ active: provider.enabled && provider.hasKey }"
        >
          <span class="provider-icon">{{ provider.icon }}</span>
          <span class="provider-name">{{ provider.name }}</span>
          <span v-if="provider.enabled && provider.hasKey" class="status-active">Activo</span>
          <span v-else-if="provider.hasKey" class="status-configured">Configurado</span>
          <span v-else class="status-inactive">Sin configurar</span>
        </div>
      </div>

      <!-- Configuración de cada proveedor -->
      <div class="config-sections">
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="config-section"
        >
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">{{ provider.icon }}</span>
              <div>
                <h3>{{ provider.fullName }}</h3>
                <p class="section-desc">{{ provider.description }}</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="provider.enabled" @change="markDirty">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="section-body" v-if="provider.enabled">
            <div class="form-row">
              <div class="form-group flex-1">
                <label>API Key</label>
                <div class="input-with-action">
                  <input
                    :type="provider.showKey ? 'text' : 'password'"
                    v-model="provider.apiKey"
                    :placeholder="`Ingresa tu API Key de ${provider.fullName}`"
                    @input="markDirty"
                  >
                  <button class="btn-icon" @click="provider.showKey = !provider.showKey">
                    {{ provider.showKey ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
              <div class="form-group" v-if="provider.id === 'cloudflare'">
                <label>Account ID</label>
                <input
                  type="text"
                  v-model="provider.accountId"
                  placeholder="Account ID de Cloudflare"
                  @input="markDirty"
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Modelo</label>
                <select v-model="provider.model" @change="markDirty">
                  <option v-for="m in provider.models" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="provider-info" v-if="provider.info">
              <p v-html="provider.info"></p>
            </div>
          </div>
        </div>

        <!-- Configuración CURP -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">🪪</span>
              <div>
                <h3>Validación CURP</h3>
                <p class="section-desc">API para consulta de datos oficiales del Registro Nacional de Población</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="curp.enabled" @change="markDirty">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="section-body" v-if="curp.enabled">
            <!-- Modo Producción / Prueba -->
            <div class="mode-switcher">
              <div class="mode-option" :class="{ active: curp.modo === 'produccion' }" @click="curp.modo = 'produccion'; markDirty()">
                <div class="mode-icon mode-icon--prod">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="mode-info">
                  <strong>Produccion</strong>
                  <span>API Key real con consultas ilimitadas</span>
                </div>
                <div class="mode-radio" :class="{ checked: curp.modo === 'produccion' }"></div>
              </div>

              <div class="mode-option" :class="{ active: curp.modo === 'prueba' }" @click="curp.modo = 'prueba'; markDirty()">
                <div class="mode-icon mode-icon--test">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <div class="mode-info">
                  <strong>Prueba</strong>
                  <span>Token de prueba con consultas limitadas</span>
                </div>
                <div class="mode-radio" :class="{ checked: curp.modo === 'prueba' }"></div>
              </div>
            </div>

            <!-- API Key (solo en modo produccion) -->
            <div v-if="curp.modo === 'produccion'" class="form-row" style="margin-top: 1rem;">
              <div class="form-group flex-1">
                <label>API Key de Valida CURP</label>
                <div class="input-with-action">
                  <input
                    :type="curp.showKey ? 'text' : 'password'"
                    v-model="curp.apiKey"
                    placeholder="Ingresa tu API Key de valida-curp.com.mx"
                    @input="markDirty"
                  >
                  <button class="btn-icon" @click="curp.showKey = !curp.showKey">
                    {{ curp.showKey ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Token de prueba (solo en modo prueba) -->
            <div v-if="curp.modo === 'prueba'" class="form-row" style="margin-top: 1rem;">
              <div class="form-group flex-1">
                <label>Token de prueba</label>
                <input
                  type="text"
                  v-model="curp.testToken"
                  placeholder="pruebas"
                  @input="markDirty"
                >
              </div>
            </div>

            <div class="provider-info">
              <p>Obtén tu API Key en <a href="https://api.valida-curp.com.mx" target="_blank">api.valida-curp.com.mx</a>.
              En modo prueba se usa el token generico con limites de consultas.</p>
            </div>

            <div class="curp-status" :class="curp.modo === 'produccion' ? 'status-prod' : 'status-test'">
              <span class="status-badge" :class="curp.modo === 'produccion' ? 'badge-prod' : 'badge-test'">
                {{ curp.modo === 'produccion' ? 'Produccion' : 'Prueba' }}
              </span>
              <span class="status-detail">
                {{ curp.modo === 'produccion'
                  ? (curp.apiKey ? 'API Key configurada - consultas reales' : 'Configura tu API Key para activar')
                  : 'Token de prueba activo - consultas de demostracion' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Configuración SMS / Confirmación Telefono -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">📱</span>
              <div>
                <h3>SMS - Confirmación de Teléfono</h3>
                <p class="section-desc">Proveedor SMS para envío de códigos de verificación de teléfono</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="sms.enabled" @change="markDirty">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="section-body" v-if="sms.enabled">
            <!-- Proveedor SMS -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>Proveedor SMS</label>
                <select v-model="sms.provider" @change="markDirty">
                  <option value="twilio">Twilio</option>
                  <option value="vonage" disabled>Vonage (próximamente)</option>
                  <option value="aws_sns" disabled>AWS SNS (próximamente)</option>
                </select>
              </div>
            </div>

            <!-- Twilio Config -->
            <div v-if="sms.provider === 'twilio'" class="twilio-config">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Account SID</label>
                  <div class="input-with-action">
                    <input
                      :type="sms.showSid ? 'text' : 'password'"
                      v-model="sms.twilioAccountSid"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      @input="markDirty"
                    >
                    <button class="btn-icon" @click="sms.showSid = !sms.showSid">
                      {{ sms.showSid ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Auth Token</label>
                  <div class="input-with-action">
                    <input
                      :type="sms.showToken ? 'text' : 'password'"
                      v-model="sms.twilioAuthToken"
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      @input="markDirty"
                    >
                    <button class="btn-icon" @click="sms.showToken = !sms.showToken">
                      {{ sms.showToken ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Numero de Twilio</label>
                  <input
                    type="text"
                    v-model="sms.twilioFromNumber"
                    placeholder="+1234567890"
                    @input="markDirty"
                  >
                </div>
              </div>
            </div>

            <!-- Modo -->
            <div class="mode-switcher" style="margin-top: 1rem;">
              <div class="mode-option" :class="{ active: sms.modo === 'produccion' }" @click="sms.modo = 'produccion'; markDirty()">
                <div class="mode-icon mode-icon--prod">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="mode-info">
                  <strong>Producción</strong>
                  <span>SMS reales a números verificados</span>
                </div>
                <div class="mode-radio" :class="{ checked: sms.modo === 'produccion' }"></div>
              </div>

              <div class="mode-option" :class="{ active: sms.modo === 'sandbox' }" @click="sms.modo = 'sandbox'; markDirty()">
                <div class="mode-icon mode-icon--test">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <div class="mode-info">
                  <strong>Sandbox</strong>
                  <span>Solo envía al número verificado en Twilio Console</span>
                </div>
                <div class="mode-radio" :class="{ checked: sms.modo === 'sandbox' }"></div>
              </div>
            </div>

            <div class="provider-info">
              <p>Crea una cuenta gratuita en <a href="https://www.twilio.com" target="_blank">twilio.com</a> para obtener tus credenciales.
              En sandbox, solo se envían SMS al número verificado en tu consola de Twilio.</p>
            </div>

            <div class="curp-status" :class="sms.modo === 'produccion' ? 'status-prod' : 'status-test'">
              <span class="status-badge" :class="sms.modo === 'produccion' ? 'badge-prod' : 'badge-test'">
                {{ sms.modo === 'produccion' ? 'Producción' : 'Sandbox' }}
              </span>
              <span class="status-detail">
                {{ sms.twilioAccountSid && sms.twilioAuthToken
                  ? (sms.modo === 'produccion' ? 'Configurado - SMS reales' : 'Sandbox activo - SMS de prueba')
                  : 'Configura las credenciales para activar' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Configuración general de IA -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">⚙️</span>
              <div>
                <h3>Configuración General</h3>
                <p class="section-desc">Preferencias de búsqueda de médicos</p>
              </div>
            </div>
          </div>

          <div class="section-body">
            <div class="form-row">
              <div class="form-group flex-1">
                <label>Proveedor preferido</label>
                <select v-model="general.preferido" @change="markDirty">
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="claude">Anthropic (Claude)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="cloudflare">Cloudflare Workers AI</option>
                </select>
              </div>
              <div class="form-group">
                <label>Idioma de búsqueda</label>
                <select v-model="general.idioma" @change="markDirty">
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="general.buscarFotos" @change="markDirty">
                Buscar fotos de médicos en la red
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="action-bar" v-if="isDirty">
        <button class="btn-cancel" @click="loadConfig" :disabled="saving">
          Cancelar cambios
        </button>
        <button class="btn-primary" @click="saveConfig" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar configuración' }}
        </button>
      </div>

      <!-- Toast de éxito -->
      <div class="toast-success" v-if="showSuccess">
        Configuración guardada correctamente
      </div>
    </main>
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'admin-auth' })

const router = useRouter()
const adminUsuario = useCookie('admin_usuario')

const isDirty = ref(false)
const saving = ref(false)
const showSuccess = ref(false)

const markDirty = () => { isDirty.value = true }

const providers = ref([
  {
    id: 'openai',
    name: 'OpenAI',
    fullName: 'OpenAI (GPT-4o)',
    icon: '🤖',
    description: 'Modelos GPT-4o para extracción de información médica',
    enabled: false,
    apiKey: '',
    model: 'gpt-4o',
    showKey: false,
    hasKey: false,
    info: 'Obtén tu API Key en <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>. Costo aproximado: $0.01-0.05 por búsqueda.',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Más barato)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
    ]
  },
  {
    id: 'claude',
    name: 'Claude',
    fullName: 'Anthropic (Claude)',
    icon: '🧠',
    description: 'Claude para comprensión profunda de texto médico',
    enabled: false,
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    showKey: false,
    hasKey: false,
    info: 'Obtén tu API Key en <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a>. Excelente para textos médicos largos.',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recomendado)' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Más rápido)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Más potente)' }
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini',
    fullName: 'Google Gemini',
    icon: '✨',
    description: 'Gemini para búsqueda y análisis de información',
    enabled: false,
    apiKey: '',
    model: 'gemini-2.0-flash',
    showKey: false,
    hasKey: false,
    info: 'Obtén tu API Key en <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a>. Generous free tier disponible.',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recomendado)' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Más barato)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
    ]
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    fullName: 'Cloudflare Workers AI',
    icon: '☁️',
    description: 'Modelos de lenguaje en la nube de Cloudflare',
    enabled: false,
    apiKey: '',
    accountId: '',
    model: '@cf/meta/llama-3.1-8b-instruct',
    showKey: false,
    hasKey: false,
    info: 'Obtén tu API Key en <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank">dash.cloudflare.com</a>. Free tier con 10,000 requests/día.',
    models: [
      { value: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Recomendado)' },
      { value: '@cf/meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Más potente)' },
      { value: '@cf/mistral/mistral-7b-instruct-v0.1', label: 'Mistral 7B' }
    ]
  }
])

const general = ref({
  preferido: 'openai',
  idioma: 'es',
  buscarFotos: true
})

const curp = ref({
  enabled: true,
  modo: 'prueba',
  apiKey: '',
  testToken: 'pruebas',
  showKey: false,
})

const sms = ref({
  enabled: true,
  provider: 'twilio',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '',
  modo: 'sandbox',
  showSid: false,
  showToken: false,
})

const loadConfig = async () => {
  try {
    const { data } = await useFetch('/api/admin/configuracion', {
      query: { categoria: 'ia' }
    })

    const config = data.value?.configuracion || []
    const configMap = {}
    for (const c of config) {
      configMap[c.clave] = c.valor
    }

    // Actualizar proveedores
    for (const p of providers.value) {
      p.enabled = configMap[`ai_${p.id}_enabled`] === 'true'
      p.apiKey = configMap[`ai_${p.id}_key`] || ''
      p.model = configMap[`ai_${p.id}_model`] || p.model
      if (p.id === 'cloudflare') {
        p.accountId = configMap[`ai_cloudflare_account_id`] || ''
      }
      p.hasKey = !!p.apiKey
    }

    general.value.preferido = configMap['ai_provider_preferido'] || 'openai'
    general.value.idioma = configMap['ai_idioma_busqueda'] || 'es'
    general.value.buscarFotos = configMap['ai_buscar_fotos'] === 'true'

    // CURP config
    curp.value.enabled = configMap['curp_enabled'] !== 'false'
    curp.value.modo = configMap['curp_modo'] || 'prueba'
    curp.value.apiKey = configMap['curp_api_key'] || ''
    curp.value.testToken = configMap['curp_test_token'] || 'pruebas'

    // SMS config
    sms.value.enabled = configMap['sms_enabled'] !== 'false'
    sms.value.provider = configMap['sms_provider'] || 'twilio'
    sms.value.twilioAccountSid = configMap['sms_twilio_account_sid'] || ''
    sms.value.twilioAuthToken = configMap['sms_twilio_auth_token'] || ''
    sms.value.twilioFromNumber = configMap['sms_twilio_from_number'] || ''
    sms.value.modo = configMap['sms_modo'] || 'sandbox'

    isDirty.value = false
  } catch (err) {
    console.error('Error cargando configuración:', err)
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const configuraciones = []

    for (const p of providers.value) {
      configuraciones.push({ clave: `ai_${p.id}_enabled`, valor: p.enabled ? 'true' : 'false' })
      configuraciones.push({ clave: `ai_${p.id}_key`, valor: p.apiKey || '' })
      configuraciones.push({ clave: `ai_${p.id}_model`, valor: p.model })
      if (p.id === 'cloudflare') {
        configuraciones.push({ clave: 'ai_cloudflare_account_id', valor: p.accountId || '' })
      }
    }

    configuraciones.push({ clave: 'ai_provider_preferido', valor: general.value.preferido })
    configuraciones.push({ clave: 'ai_idioma_busqueda', valor: general.value.idioma })
    configuraciones.push({ clave: 'ai_buscar_fotos', valor: general.value.buscarFotos ? 'true' : 'false' })

    // CURP config
    configuraciones.push({ clave: 'curp_enabled', valor: curp.value.enabled ? 'true' : 'false' })
    configuraciones.push({ clave: 'curp_modo', valor: curp.value.modo })
    configuraciones.push({ clave: 'curp_api_key', valor: curp.value.apiKey || '' })
    configuraciones.push({ clave: 'curp_test_token', valor: curp.value.testToken || 'pruebas' })

    // SMS config
    configuraciones.push({ clave: 'sms_enabled', valor: sms.value.enabled ? 'true' : 'false' })
    configuraciones.push({ clave: 'sms_provider', valor: sms.value.provider })
    configuraciones.push({ clave: 'sms_twilio_account_sid', valor: sms.value.twilioAccountSid || '' })
    configuraciones.push({ clave: 'sms_twilio_auth_token', valor: sms.value.twilioAuthToken || '' })
    configuraciones.push({ clave: 'sms_twilio_from_number', valor: sms.value.twilioFromNumber || '' })
    configuraciones.push({ clave: 'sms_modo', valor: sms.value.modo })

    await $fetch('/api/admin/configuracion', {
      method: 'POST',
      body: { configuraciones }
    })

    // Actualizar estado de keys
    for (const p of providers.value) {
      p.hasKey = !!p.apiKey
    }

    isDirty.value = false
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
  } catch (err) {
    console.error('Error guardando:', err)
    alert('Error al guardar configuración')
  } finally {
    saving.value = false
  }
}

const logout = () => {
  adminUsuario.value = null
  const token = useCookie('admin_token')
  token.value = null
  router.push('/admin/login')
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: #2d3436;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  position: fixed;
  height: 100vh;
}

.sidebar-brand h2 {
  font-size: 1.3rem;
  margin-bottom: 0.25rem;
}

.role-badge {
  font-size: 0.75rem;
  color: #00b894;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 1.5rem;
}

.nav-link {
  color: #dfe6e9;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255,255,255,0.1);
}

.nav-link.active {
  background: #00b894;
  color: white;
}

.btn-logout {
  background: none;
  border: 1px solid rgba(255,255,255,0.2);
  color: #dfe6e9;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  margin-top: auto;
}

.btn-logout:hover {
  background: rgba(255,255,255,0.1);
}

.admin-content {
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  background: #f5f6fa;
  min-height: 100vh;
}

.content-header {
  margin-bottom: 2rem;
}

.content-header h1 {
  font-size: 1.8rem;
  color: #2d3436;
  margin-bottom: 0.25rem;
}

.content-header p {
  color: #636e72;
}

/* Provider Status Badges */
.providers-status {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.provider-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.85rem;
}

.provider-badge.active {
  border-color: #00b894;
  background: #f0fff4;
}

.provider-icon {
  font-size: 1.1rem;
}

.status-active {
  color: #00b894;
  font-weight: 600;
}

.status-configured {
  color: #fdcb6e;
  font-weight: 600;
}

.status-inactive {
  color: #b2bec3;
}

/* Config Sections */
.config-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.config-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.provider-icon-lg {
  font-size: 1.8rem;
}

.section-title h3 {
  font-size: 1.1rem;
  color: #2d3436;
  margin: 0;
}

.section-desc {
  font-size: 0.85rem;
  color: #636e72;
  margin: 0.2rem 0 0 0;
}

.section-body {
  padding: 1.5rem;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #b2bec3;
  border-radius: 26px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: #00b894;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* Forms */
.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.flex-1 {
  flex: 1;
}

.form-group label {
  font-size: 0.85rem;
  color: #636e72;
  margin-bottom: 0.35rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  padding: 0.6rem 0.8rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #00b894;
}

.input-with-action {
  display: flex;
  gap: 0.5rem;
}

.input-with-action input {
  flex: 1;
}

.btn-icon {
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
}

.btn-icon:hover {
  background: #f5f6fa;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #2d3436;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.provider-info {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.provider-info p {
  font-size: 0.85rem;
  color: #636e72;
  margin: 0;
}

.provider-info a {
  color: #0984e3;
  text-decoration: none;
}

.provider-info a:hover {
  text-decoration: underline;
}

/* CURP Status */
.mode-switcher {
  display: flex;
  gap: 1rem;
}

.mode-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.mode-option:hover {
  border-color: #b2bec3;
}

.mode-option.active {
  border-color: #00b894;
  background: #f0fff4;
}

.mode-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mode-icon--prod {
  background: #e8f5e9;
  color: #2e7d32;
}

.mode-icon--test {
  background: #fff3e0;
  color: #e65100;
}

.mode-info {
  flex: 1;
  min-width: 0;
}

.mode-info strong {
  display: block;
  font-size: 0.9rem;
  color: #2d3436;
  margin-bottom: 0.1rem;
}

.mode-info span {
  font-size: 0.75rem;
  color: #636e72;
}

.mode-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #d0d0d0;
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
}

.mode-radio.checked {
  border-color: #00b894;
}

.mode-radio.checked::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: #00b894;
  border-radius: 50%;
}

.curp-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.curp-status.status-prod {
  background: #f0fff4;
  border: 1px solid #c8e6c9;
}

.curp-status.status-test {
  background: #fff8e1;
  border: 1px solid #ffe082;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-prod {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-test {
  background: #fff3e0;
  color: #e65100;
}

.status-detail {
  font-size: 0.8rem;
  color: #636e72;
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn-primary {
  background: #00b894;
  color: white;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover:not(:disabled) {
  background: #00a884;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 0.65rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-cancel:hover:not(:disabled) {
  background: #eee;
}

/* Toast */
.toast-success {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #00b894;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateY(1rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .admin-content {
    margin-left: 0;
  }
  .form-row {
    flex-direction: column;
  }
  .providers-status {
    flex-direction: column;
  }
}
</style>
