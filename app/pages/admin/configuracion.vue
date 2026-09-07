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
              <span class="provider-icon-lg">ID</span>
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
                <h3>SMS - Conexiones multiples</h3>
                <p class="section-desc">Gestiona múltiples conexiones SMS con failover automático</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="sms.enabled" @change="markDirty">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="section-body" v-if="sms.enabled">
            <!-- Lista de conexiones -->
            <div class="conexiones-header">
              <h4>Conexiones SMS</h4>
              <button class="btn-primary btn-sm" @click="abrirFormConexion()">
                + Nueva conexion
              </button>
            </div>

            <!-- Sin conexiones -->
            <div v-if="sms.conexiones.length === 0 && !sms.showForm" class="empty-state">
              <p>No hay conexiones SMS configuradas. Agrega una para comenzar.</p>
            </div>

            <!-- Tabla de conexiones -->
            <div v-if="sms.conexiones.length > 0" class="conexiones-table">
              <div class="conexion-row conexion-header-row">
                <span class="col-status">Estado</span>
                <span class="col-name">Nombre</span>
                <span class="col-provider">Proveedor</span>
                <span class="col-phone">Numero</span>
                <span class="col-mode">Modo</span>
                <span class="col-priority">Prioridad</span>
                <span class="col-actions">Acciones</span>
              </div>
              <div
                v-for="conn in sms.conexiones"
                :key="conn.id"
                class="conexion-row"
                :class="{ 'conexion-preferida': conn.preferida }"
              >
                <span class="col-status">
                  <span class="status-dot" :class="conn.activa ? 'active' : 'inactive'"></span>
                  {{ conn.preferida ? 'Preferida' : (conn.activa ? 'Activa' : 'Inactiva') }}
                </span>
                <span class="col-name">
                  {{ conn.nombre }}
                  <span v-if="conn.preferida" class="preferida-badge">⭐</span>
                </span>
                <span class="col-provider">{{ conn.proveedor }}</span>
                <span class="col-phone">{{ conn.from_number || '—' }}</span>
                <span class="col-mode">
                  <span class="mode-badge" :class="conn.modo === 'produccion' ? 'badge-prod' : 'badge-test'">
                    {{ conn.modo === 'produccion' ? 'Producción' : 'Sandbox' }}
                  </span>
                </span>
                <span class="col-priority">{{ conn.prioridad }}</span>
                <span class="col-actions">
                  <button class="btn-icon-sm" @click="editarConexion(conn)" title="Editar">✏️</button>
                  <button class="btn-icon-sm" @click="togglePreferida(conn)" :title="conn.preferida ? 'Quitar preferida' : 'Marcar preferida'">
                    {{ conn.preferida ? '⭐' : '☆' }}
                  </button>
                  <button class="btn-icon-sm" @click="toggleActiva(conn)" :title="conn.activa ? 'Desactivar' : 'Activar'">
                    {{ conn.activa ? '🟢' : '🔴' }}
                  </button>
                  <button class="btn-icon-sm" @click="eliminarConexion(conn)" title="Eliminar">🗑️</button>
                </span>
              </div>
            </div>

            <!-- Formulario nueva/editar conexion -->
            <div v-if="sms.showForm" class="conexion-form">
              <h4>{{ sms.editandoId ? 'Editar conexion' : 'Nueva conexion' }}</h4>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Nombre *</label>
                  <input v-model="sms.form.nombre" type="text" placeholder="Ej: Twilio Principal">
                </div>
                <div class="form-group">
                  <label>Proveedor</label>
                  <select v-model="sms.form.proveedor">
                    <option value="twilio">Twilio</option>
                    <option value="vonage">Vonage</option>
                    <option value="aws_sns">AWS SNS</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Account SID</label>
                  <div class="input-with-action">
                    <input :type="sms.form.showSid ? 'text' : 'password'" v-model="sms.form.account_sid" placeholder="ACxxxx">
                    <button class="btn-icon" @click="sms.form.showSid = !sms.form.showSid">
                      {{ sms.form.showSid ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
                <div class="form-group flex-1">
                  <label>Auth Token</label>
                  <div class="input-with-action">
                    <input :type="sms.form.showToken ? 'text' : 'password'" v-model="sms.form.auth_token" placeholder="xxxx">
                    <button class="btn-icon" @click="sms.form.showToken = !sms.form.showToken">
                      {{ sms.form.showToken ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Numero de envio</label>
                  <input v-model="sms.form.from_number" type="text" placeholder="+1234567890">
                </div>
                <div class="form-group">
                  <label>Prioridad</label>
                  <input v-model.number="sms.form.prioridad" type="number" min="0" placeholder="0">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Modo</label>
                  <select v-model="sms.form.modo">
                    <option value="sandbox">Sandbox</option>
                    <option value="produccion">Produccion</option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label>Descripcion</label>
                  <input v-model="sms.form.descripcion" type="text" placeholder="Descripcion opcional">
                </div>
              </div>

              <div class="form-row">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="sms.form.activa"> Activa
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="sms.form.preferida"> Preferida (se usa primero)
                </label>
              </div>

              <div class="form-actions">
                <button class="btn-secondary" @click="sms.showForm = false">Cancelar</button>
                <button class="btn-primary" @click="guardarConexion" :disabled="sms.saving || !sms.form.nombre">
                  {{ sms.saving ? 'Guardando...' : (sms.editandoId ? 'Actualizar' : 'Crear') }}
                </button>
              </div>
            </div>

            <!-- Zona de pruebas SMS -->
            <div class="sms-test-zone">
              <div class="test-header">
                <span class="test-icon">🧪</span>
                <div>
                  <h4>Enviar SMS de prueba</h4>
                  <p class="test-desc">Selecciona una conexion para probar</p>
                </div>
              </div>

              <div class="test-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Conexion</label>
                    <select v-model="sms.testConexionId">
                      <option :value="null">Todas (failover)</option>
                      <option v-for="conn in sms.conexiones.filter(c => c.activa)" :key="conn.id" :value="conn.id">
                        {{ conn.nombre }} ({{ conn.proveedor }})
                      </option>
                    </select>
                  </div>
                  <div class="form-group flex-1">
                    <label>Numero destino</label>
                    <input v-model="sms.testPhone" type="tel" placeholder="+521234567890" maxlength="14">
                  </div>
                  <div class="form-group flex-1">
                    <label>Mensaje</label>
                    <input v-model="sms.testMessage" type="text" placeholder="MediProtect: SMS de prueba" maxlength="160">
                  </div>
                </div>
                <div class="test-actions">
                  <button @click="enviarSmsPrueba" class="btn-test" :disabled="sms.sendingTest || !sms.testPhone">
                    {{ sms.sendingTest ? 'Enviando...' : 'Enviar SMS de prueba' }}
                  </button>
                  <span v-if="sms.testResult === 'success'" class="test-success">SMS enviado correctamente</span>
                  <span v-if="sms.testResult === 'error'" class="test-error">{{ sms.testError }}</span>
                </div>
              </div>
            </div>

            <div class="provider-info">
              <p>El sistema intenta enviar con la conexion preferida primero. Si falla, prueba con las siguientes en orden de prioridad (failover automatico).</p>
            </div>
          </div>
        </div>

        <!-- Configuración de Verificaciones -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">🔒</span>
              <div>
                <h3>Verificaciones de Usuarios</h3>
                <p class="section-desc">Controla si médicos y pacientes deben confirmar su correo y teléfono</p>
              </div>
            </div>
          </div>

          <div class="section-body">
            <div class="form-row">
              <label class="toggle-label">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="verificacion.requirePhone" @change="markDirty">
                  <span class="toggle-slider"></span>
                </label>
                <div class="toggle-info">
                  <strong>Requerir confirmación de teléfono</strong>
                  <span>Activa: muestra banner SMS en dashboard hasta que el usuario verifique su número</span>
                </div>
              </label>
            </div>
            <div class="form-row">
              <label class="toggle-label">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="verificacion.requireEmail" @change="markDirty">
                  <span class="toggle-slider"></span>
                </label>
                <div class="toggle-info">
                  <strong>Requerir confirmación de correo</strong>
                  <span>Activa: muestra banner de email en dashboard hasta que el usuario confirme su correo</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Numeros de telefono verificados (pruebas) -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">📞</span>
              <div>
                <h3>Numeros Verificados (Pruebas)</h3>
                <p class="section-desc">Numeros que pueden recibir SMS sin necesidad de verificar en Twilio</p>
              </div>
            </div>
          </div>

          <div class="section-body">
            <div class="verified-phones-list" v-if="telefonosVerificados.length > 0">
              <div v-for="tel in telefonosVerificados" :key="tel.id" class="verified-phone-item">
                <div class="phone-info">
                  <strong>{{ tel.telefono }}</strong>
                  <span v-if="tel.descripcion">{{ tel.descripcion }}</span>
                  <span class="phone-date">{{ new Date(tel.created_at).toLocaleDateString() }}</span>
                </div>
                <button class="btn-delete-sm" @click="eliminarTelefonoVerificado(tel.id)">Eliminar</button>
              </div>
            </div>
            <div v-else class="empty-phones">No hay numeros verificados agregados</div>

            <div class="add-phone-form">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Numero de telefono</label>
                  <input
                    v-model="nuevoTelefonoVerificado.telefono"
                    type="tel"
                    placeholder="2221234567"
                    maxlength="15"
                  >
                </div>
                <div class="form-group flex-1">
                  <label>Descripcion (opcional)</label>
                  <input
                    v-model="nuevoTelefonoVerificado.descripcion"
                    type="text"
                    placeholder="Ej: Telefono de pruebas"
                  >
                </div>
                <div class="form-group" style="justify-content: flex-end">
                  <button class="btn-add-phone" @click="agregarTelefonoVerificado" :disabled="!nuevoTelefonoVerificado.telefono">
                    Agregar
                  </button>
                </div>
              </div>
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

<script setup lang="ts">
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
  conexiones: [] as any[],
  showForm: false,
  editandoId: null as number | null,
  saving: false,
  form: {
    nombre: '',
    proveedor: 'twilio',
    account_sid: '',
    auth_token: '',
    from_number: '',
    modo: 'sandbox',
    activa: true,
    preferida: false,
    prioridad: 0,
    descripcion: '',
    showSid: false,
    showToken: false,
  },
  testPhone: '',
  testMessage: 'MediProtect: SMS de prueba - config OK',
  testConexionId: null as number | null,
  sendingTest: false,
  testResult: '',
  testError: '',
})

const verificacion = ref({
  requirePhone: true,
  requireEmail: true,
})

const telefonosVerificados = ref([])
const nuevoTelefonoVerificado = ref({ telefono: '', descripcion: '' })
const cargandoTelefonos = ref(false)

const loadConfig = async () => {
  try {
    const [iaRes, smsRes, verifRes] = await Promise.all([
      $fetch('/api/admin/configuracion', { params: { categoria: 'ia' } }),
      $fetch('/api/admin/configuracion-sms'),
      $fetch('/api/admin/configuracion', { params: { categoria: 'general' } }),
    ])

    const config = iaRes?.configuracion || []
    const configMap = {}
    for (const c of config) {
      configMap[c.clave] = c.valor
    }

    // SMS config desde categoria sms
    const smsConfig = smsRes?.configuracion || []
    for (const c of smsConfig) {
      configMap[c.clave] = c.valor
    }

    // Verification config desde categoria general
    const verifConfig = verifRes?.configuracion || []
    for (const c of verifConfig) {
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

    // SMS config - load from new connections table
    sms.value.enabled = configMap['sms_enabled'] !== 'false'
    try {
      const connRes: any = await $fetch('/api/admin/sms-conexiones')
      sms.value.conexiones = connRes?.conexiones || []
    } catch {
      sms.value.conexiones = []
    }

    // Verification config
    verificacion.value.requirePhone = configMap['require_phone_verification'] !== 'false'
    verificacion.value.requireEmail = configMap['require_email_verification'] !== 'false'

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

    await $fetch('/api/admin/configuracion', {
      method: 'POST',
      body: { configuraciones }
    })

    // Guardar config SMS enabled flag
    const smsConfig = [
      { clave: 'sms_enabled', valor: sms.value.enabled ? 'true' : 'false' },
    ]
    await $fetch('/api/admin/configuracion-sms', {
      method: 'POST',
      body: { configuraciones: smsConfig }
    })

    // Guardar config verificacion
    const verifConfig = [
      { clave: 'require_phone_verification', valor: verificacion.value.requirePhone ? 'true' : 'false' },
      { clave: 'require_email_verification', valor: verificacion.value.requireEmail ? 'true' : 'false' },
    ]
    await $fetch('/api/admin/configuracion', {
      method: 'POST',
      body: { configuraciones: verifConfig }
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

const abrirFormConexion = (conexion?: any) => {
  if (conexion) {
    sms.value.editandoId = conexion.id
    sms.value.form = {
      nombre: conexion.nombre,
      proveedor: conexion.proveedor,
      account_sid: conexion.account_sid,
      auth_token: '',
      from_number: conexion.from_number,
      modo: conexion.modo,
      activa: conexion.activa,
      preferida: conexion.preferida,
      prioridad: conexion.prioridad,
      descripcion: conexion.descripcion || '',
      showSid: false,
      showToken: false,
    }
  } else {
    sms.value.editandoId = null
    sms.value.form = {
      nombre: '', proveedor: 'twilio', account_sid: '', auth_token: '',
      from_number: '', modo: 'sandbox', activa: true, preferida: false,
      prioridad: 0, descripcion: '', showSid: false, showToken: false,
    }
  }
  sms.value.showForm = true
}

const editarConexion = (conn: any) => abrirFormConexion(conn)

const guardarConexion = async () => {
  sms.value.saving = true
  try {
    const payload: any = { ...sms.value.form }
    if (sms.value.editandoId) {
      payload.id = sms.value.editandoId
      if (!payload.auth_token) delete payload.auth_token
    }
    await $fetch('/api/admin/sms-conexiones', { method: 'POST', body: payload })
    await cargarConexiones()
    sms.value.showForm = false
    isDirty.value = false
  } catch (e: any) {
    alert(e?.data?.message || 'Error guardando conexion')
  } finally {
    sms.value.saving = false
  }
}

const eliminarConexion = async (conn: any) => {
  if (!confirm(`Eliminar conexion "${conn.nombre}"?`)) return
  try {
    await $fetch('/api/admin/sms-conexiones', { method: 'DELETE', body: { id: conn.id } })
    await cargarConexiones()
  } catch (e: any) {
    alert(e?.data?.message || 'Error eliminando')
  }
}

const togglePreferida = async (conn: any) => {
  try {
    await $fetch('/api/admin/sms-conexiones', {
      method: 'POST',
      body: { id: conn.id, preferida: !conn.preferida }
    })
    await cargarConexiones()
  } catch {}
}

const toggleActiva = async (conn: any) => {
  try {
    await $fetch('/api/admin/sms-conexiones', {
      method: 'POST',
      body: { id: conn.id, activa: !conn.activa }
    })
    await cargarConexiones()
  } catch {}
}

const cargarConexiones = async () => {
  try {
    const data: any = await $fetch('/api/admin/sms-conexiones')
    sms.value.conexiones = data?.conexiones || []
  } catch {}
}

const enviarSmsPrueba = async () => {
  if (!sms.value.testPhone) return

  sms.value.sendingTest = true
  sms.value.testResult = ''
  sms.value.testError = ''

  try {
    await $fetch('/api/admin/sms-test', {
      method: 'POST',
      body: {
        telefono: sms.value.testPhone,
        mensaje: sms.value.testMessage || 'MediProtect: SMS de prueba - config OK',
        conexion_id: sms.value.testConexionId
      }
    })
    sms.value.testResult = 'success'
  } catch (e) {
    sms.value.testResult = 'error'
    sms.value.testError = (e as any)?.data?.message || 'Error enviando SMS'
  } finally {
    sms.value.sendingTest = false
  }
}

const logout = () => {
  adminUsuario.value = null
  const token = useCookie('admin_token')
  token.value = null
  navigateTo('/admin/login')
}

const cargarTelefonosVerificados = async () => {
  cargandoTelefonos.value = true
  try {
    const data = await $fetch('/api/admin/telefonos-verificados')
    telefonosVerificados.value = data?.telefonos || []
  } catch (e) {
    console.error('Error cargando telefonos verificados:', e)
  } finally {
    cargandoTelefonos.value = false
  }
}

const agregarTelefonoVerificado = async () => {
  const tel = nuevoTelefonoVerificado.value
  if (!tel.telefono) return
  try {
    await $fetch('/api/admin/telefonos-verificados', {
      method: 'POST',
      body: { telefono: tel.telefono, descripcion: tel.descripcion }
    })
    nuevoTelefonoVerificado.value = { telefono: '', descripcion: '' }
    await cargarTelefonosVerificados()
  } catch (e) {
    alert(e?.data?.message || 'Error agregando telefono')
  }
}

const eliminarTelefonoVerificado = async (id) => {
  if (!confirm('Eliminar este numero de la lista verificada?')) return
  try {
    await $fetch('/api/admin/telefonos-verificados', {
      method: 'DELETE',
      query: { id }
    })
    await cargarTelefonosVerificados()
  } catch (e) {
    alert(e?.data?.message || 'Error eliminando telefono')
  }
}

onMounted(() => {
  loadConfig()
cargarTelefonosVerificados()
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

/* SMS Conexiones */
.conexiones-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.conexiones-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #2d3436;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #636e72;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px dashed #dfe6e9;
}

.conexiones-table {
  margin-bottom: 1.5rem;
}

.conexion-row {
  display: grid;
  grid-template-columns: 100px 1fr 100px 130px 100px 60px 120px;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.85rem;
}

.conexion-header-row {
  font-weight: 600;
  color: #636e72;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e0e0e0;
}

.conexion-preferida {
  background: #fffde7;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.status-dot.active { background: #00b894; }
.status-dot.inactive { background: #b2bec3; }

.preferida-badge {
  margin-left: 4px;
}

.mode-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;
}

.col-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon-sm {
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
}

.btn-icon-sm:hover {
  background: #f0f0f0;
}

/* Conexion Form */
.conexion-form {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.conexion-form h4 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #2d3436;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-secondary {
  background: #dfe6e9;
  color: #2d3436;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-secondary:hover {
  background: #b2bec3;
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

/* Verification toggles */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
}
.toggle-info {
  display: flex;
  flex-direction: column;
}
.toggle-info strong { font-size: 0.9rem; color: #2d3436; }
.toggle-info span { font-size: 0.8rem; color: #636e72; }

/* Verified phones */
.verified-phones-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.verified-phone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.phone-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.phone-info strong { font-family: monospace; font-size: 0.9rem; }
.phone-info span { font-size: 0.8rem; color: #636e72; }
.phone-date { font-size: 0.75rem; color: #b2bec3; }
.btn-delete-sm {
  background: none;
  border: none;
  color: #d63031;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.3rem 0.5rem;
}
.btn-delete-sm:hover { text-decoration: underline; }
.empty-phones {
  text-align: center;
  color: #b2bec3;
  padding: 1rem;
  font-size: 0.85rem;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.add-phone-form {
  border-top: 1px solid #eee;
  padding-top: 1rem;
}
.btn-add-phone {
  background: #0984e3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.btn-add-phone:hover { background: #0773c5; }
.btn-add-phone:disabled { opacity: 0.5; cursor: not-allowed; }

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

/* SMS Test Zone */
.sms-test-zone {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed #e0e0e0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.25rem;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.test-icon {
  font-size: 1.5rem;
}

.test-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #2d3436;
}

.test-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #636e72;
}

.test-form .form-row {
  gap: 1rem;
}

.test-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
}

.btn-test {
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-test:hover:not(:disabled) {
  background: #5a4bd1;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-success {
  color: #2e7d32;
  font-size: 0.85rem;
  font-weight: 500;
}

.test-error {
  color: #c62828;
  font-size: 0.85rem;
  font-weight: 500;
}
</style>
