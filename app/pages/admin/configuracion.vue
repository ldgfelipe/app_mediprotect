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
        <NuxtLink to="/admin/whatsapp" class="nav-link">WhatsApp</NuxtLink>
        <NuxtLink to="/admin/whatsapp/logs" class="nav-link">WA Logs</NuxtLink>
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

      <!-- ========== GENERAL DEL SISTEMA ========== -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-title">
            <span class="provider-icon-lg">🌐</span>
            <div>
              <h3>General del Sistema</h3>
              <p class="section-desc">Modo de operación, Supabase y base de datos activa</p>
            </div>
          </div>
        </div>

        <div class="section-body">
          <!-- Modo del sistema -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Modo del Sistema</label>
              <div class="mode-switcher">
                <div class="mode-option" :class="{ active: sistema.modo === 'produccion' }" @click="sistema.modo = 'produccion'; markDirty()">
                  <div class="mode-icon mode-icon--prod">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <div class="mode-info">
                    <strong>Producción</strong>
                    <span>Sistema activo para usuarios reales</span>
                  </div>
                  <div class="mode-radio" :class="{ checked: sistema.modo === 'produccion' }"></div>
                </div>

                <div class="mode-option" :class="{ active: sistema.modo === 'pruebas' }" @click="sistema.modo = 'pruebas'; markDirty()">
                  <div class="mode-icon mode-icon--test">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  </div>
                  <div class="mode-info">
                    <strong>Pruebas</strong>
                    <span>Entorno de desarrollo y pruebas</span>
                  </div>
                  <div class="mode-radio" :class="{ checked: sistema.modo === 'pruebas' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Supabase URL -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Supabase Project URL</label>
              <div class="readonly-field">{{ sistema.modo === 'pruebas' ? 'https://dhadacgebhdiantlhllz.supabase.co' : 'https://mruezojnfgkdhtgxwgmv.supabase.co' }}</div>
              <small class="field-hint">URL del proyecto de Supabase activo (no editable)</small>
              <small class="field-hint">URL del proyecto de Supabase que usa este sistema (base de datos, auth, storage, etc.)</small>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== PRUEBA WEBSOCKET ========== -->
      <div class="config-section">
        <h2>🔌 WebSocket - Prueba en Tiempo Real</h2>
        <p style="color:#636e72;font-size:0.9rem;margin-bottom:1rem">
          Verifica que el WebSocket está funcionando. Al enviar prueba, todos los usuarios conectados recibirán una notificación.
        </p>
        <div class="form-row" style="align-items:center">
          <div class="form-group">
            <div style="display:flex;gap:0.5rem;align-items:center">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%"
                :style="{ background: wsConnected ? '#00b894' : '#d63031' }"></span>
              <span style="font-size:0.9rem;font-weight:600">{{ wsConnected ? 'Conectado' : 'Desconectado' }}</span>
            </div>
          </div>
          <div class="form-group" style="display:flex;gap:0.5rem">
            <button class="btn-primary" style="width:auto;padding:0.5rem 1.5rem" @click="testWebSocket" :disabled="wsSending">
              {{ wsSending ? 'Enviando...' : 'Enviar Prueba' }}
            </button>
            <button class="btn-outline" style="width:auto;padding:0.5rem 1rem;font-size:0.85rem" @click="reconnectWs">
              Reconectar
            </button>
          </div>
        </div>
        <div v-if="wsTestResult" style="margin-top:0.75rem;padding:0.5rem 1rem;border-radius:6px;font-size:0.85rem"
          :style="{ background: wsTestResult.ok ? '#d4edda' : '#ffd7d7', color: wsTestResult.ok ? '#00b894' : '#d63031' }">
          {{ wsTestResult.message }}
        </div>
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0;display:flex;align-items:center;gap:1rem">
          <label style="font-size:0.9rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem">
            <input type="checkbox" :checked="wsDebugMode" @change="toggleWsDebug" style="width:18px;height:18px;cursor:pointer" />
            Mostrar indicador WS flotante
          </label>
          <small style="color:#b2bec3">Muestra el badge "WS ON/OFF" en la esquina superior derecha de todas las páginas</small>
        </div>
      </div>

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
                    <option value="api_rest">API REST</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group" style="flex: 1.4">
                  <label v-if="sms.form.proveedor === 'api_rest'">URL de la API REST *</label>
                  <label v-else>Account SID</label>
                  <div v-if="sms.form.proveedor === 'api_rest'" class="input-with-action">
                    <input type="url" v-model="sms.form.api_url" placeholder="https://api.gateway.com/send-sms">
                    <button class="btn-icon" type="button" @click="sms.form.showUrl = !sms.form.showUrl">
                      {{ sms.form.showUrl ? '🙈' : '👁️' }}
                    </button>
                  </div>
                  <div v-else class="input-with-action">
                    <input :type="sms.form.showSid ? 'text' : 'password'" v-model="sms.form.account_sid" placeholder="ACxxxx">
                    <button class="btn-icon" @click="sms.form.showSid = !sms.form.showSid">
                      {{ sms.form.showSid ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
                <div class="form-group flex-1">
                  <label v-if="sms.form.proveedor === 'api_rest'">Token / API Key (opcional)</label>
                  <label v-else>Auth Token</label>
                  <div class="input-with-action">
                    <input :type="sms.form.showToken ? 'text' : 'password'" v-model="sms.form.auth_token" placeholder="xxxx">
                    <button class="btn-icon" @click="sms.form.showToken = !sms.form.showToken">
                      {{ sms.form.showToken ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-row" v-if="sms.form.proveedor === 'api_rest'">
                <div class="form-group flex-1" style="flex: 1.4">
                  <label>Numero de envio (opcional)</label>
                  <input v-model="sms.form.from_number" type="text" placeholder="+521234567890">
                </div>
                <div class="form-group" style="flex: 1">
                  <label>Método</label>
                  <select v-model="sms.form.metodo">
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
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

        <!-- Configuración SMTP / Email -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">✉️</span>
              <div>
                <h3>Correo SMTP (Brevo u otro proveedor)</h3>
                <p class="section-desc">Configura el envío de correos de confirmación y notificaciones</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="smtpEmail.enabled" @change="markDirtySmtp">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="section-body" v-if="smtpEmail.enabled">
            <!-- Estado -->
            <div class="smtp-status" :class="smtpEmail.configurado ? 'smtp-status-ok' : 'smtp-status-warn'">
              <strong>{{ smtpEmail.configurado ? '✓ Configuración SMTP disponible' : 'SMTP sin configurar' }}</strong>
              <span>{{ smtpEmail.origenTexto }}</span>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Servidor SMTP</label>
                <input v-model="smtpEmail.host" type="text" placeholder="smtp-relay.brevo.com" @input="markDirtySmtp">
              </div>
              <div class="form-group">
                <label>Puerto</label>
                <input v-model.number="smtpEmail.port" type="number" placeholder="465" @input="markDirtySmtp">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Usuario</label>
                <input v-model="smtpEmail.user" type="text" placeholder="usuario@smtp-brevo.com" @input="markDirtySmtp">
              </div>
              <div class="form-group flex-1">
                <label>Contraseña</label>
                <div class="input-with-action">
                  <input
                    :type="smtpEmail.showPass ? 'text' : 'password'"
                    v-model="smtpEmail.pass"
                    :placeholder="smtpEmail.pass_set ? '•••••••• (deja en blanco para conservar)' : 'Contraseña de tu proveedor SMTP'"
                    @input="markDirtySmtp"
                  >
                  <button class="btn-icon" @click="smtpEmail.showPass = !smtpEmail.showPass">
                    {{ smtpEmail.showPass ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Correo remitente (From)</label>
                <input v-model="smtpEmail.from" type="text" placeholder="agente@mediprotect.com.mx" @input="markDirtySmtp">
                <small class="field-hint">Se usará como remitente en los correos de confirmación y notificación.</small>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn-primary" @click="guardarConfigSmtp" :disabled="smtpEmail.saving || !smtpEmail.dirty">
                {{ smtpEmail.saving ? 'Guardando...' : 'Guardar configuración SMTP' }}
              </button>
              <span v-if="smtpEmail.savedMsg" class="test-success">{{ smtpEmail.savedMsg }}</span>
            </div>

            <!-- Zona de prueba de envío -->
            <div class="smtp-test-zone">
              <div class="test-header">
                <span class="test-icon">🧪</span>
                <div>
                  <h4>Enviar correo de prueba</h4>
                  <p class="test-desc">Verifica que el proveedor (Brevo) esté bien configurado</p>
                </div>
              </div>
              <div class="test-form">
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Correo destino</label>
                    <input v-model="smtpEmail.testTo" type="email" placeholder="tucorreo@ejemplo.com">
                  </div>
                </div>
                <div class="test-actions">
                  <button @click="enviarPruebaSmtp" class="btn-test" :disabled="smtpEmail.sendingTest || !smtpEmail.testTo">
                    {{ smtpEmail.sendingTest ? 'Enviando...' : 'Enviar correo de prueba' }}
                  </button>
                  <span v-if="smtpEmail.testResult === 'success'" class="test-success">Correo de prueba enviado correctamente</span>
                  <span v-if="smtpEmail.testResult === 'error'" class="test-error">{{ smtpEmail.testError }}</span>
                </div>
              </div>
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

        <!-- Configuración WhatsApp API -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">💬</span>
              <div>
                <h3>WhatsApp Business API</h3>
                <p class="section-desc">Webhook, credenciales y flujo de citas por WhatsApp</p>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="whatsapp.enabled" @change="markDirty">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="section-body" v-if="whatsapp.enabled">
            <!-- Estado del webhook -->
            <div class="smtp-status" :class="whatsapp.configurado ? 'smtp-status-ok' : 'smtp-status-warn'">
              <strong>{{ whatsapp.configurado ? '✓ Webhook WhatsApp configurado' : 'Webhook sin configurar' }}</strong>
              <span>{{ whatsapp.configurado ? 'Credenciales activas — webhook operativo' : 'Ingresa las credenciales de Meta para activar' }}</span>
            </div>

            <!-- Modo Sandbox / Producción -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>Modo de operación</label>
                <div class="mode-switcher">
                  <div class="mode-option" :class="{ active: whatsapp.modo === 'sandbox' }" @click="whatsapp.modo = 'sandbox'; markDirty()">
                    <div class="mode-icon mode-icon--test">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </div>
                    <div class="mode-info">
                      <strong>Sandbox (Pruebas)</strong>
                      <span>Número de prueba de Meta — ideal para desarrollo</span>
                    </div>
                    <div class="mode-radio" :class="{ checked: whatsapp.modo === 'sandbox' }"></div>
                  </div>
                  <div class="mode-option" :class="{ active: whatsapp.modo === 'produccion' }" @click="whatsapp.modo = 'produccion'; markDirty()">
                    <div class="mode-icon mode-icon--prod">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="mode-info">
                      <strong>Producción</strong>
                      <span>Número real de WhatsApp Business — usuarios reales</span>
                    </div>
                    <div class="mode-radio" :class="{ checked: whatsapp.modo === 'produccion' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- URL del webhook (read-only) -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>URL del Webhook (Meta)</label>
                <div class="readonly-field">https://app.mediprotect.com.mx/whook/wame</div>
                <small class="field-hint">Copia esta URL en el panel de Meta Developer Console → WhatsApp → Configuration → Webhook</small>
              </div>
            </div>

            <!-- Verify Token -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>Verify Token (tú lo inventas)</label>
                <div class="input-with-action">
                  <input
                    :type="whatsapp.showVerify ? 'text' : 'password'"
                    v-model="whatsapp.verifyToken"
                    placeholder="Ej: mediprotect_wa_verify_2026"
                    @input="markDirty"
                  >
                  <button class="btn-icon" @click="whatsapp.showVerify = !whatsapp.showVerify">
                    {{ whatsapp.showVerify ? '🙈' : '👁️' }}
                  </button>
                </div>
                <small class="field-hint">Es una contraseña secreta que tú defines. Debe coincidir exactamente con lo que pongas en el panel de Meta</small>
              </div>
            </div>

            <!-- Credenciales Sandbox -->
            <div v-if="whatsapp.modo === 'sandbox'" class="sandbox-section">
              <h4 style="margin: 1.5rem 0 1rem; color: #e65100; display: flex; align-items: center; gap: 0.5rem;">
                🧪 Credenciales Sandbox (Pruebas)
              </h4>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>WhatsApp Token (Sandbox)</label>
                  <div class="input-with-action">
                    <input
                      :type="whatsapp.showTokenSandbox ? 'text' : 'password'"
                      v-model="whatsapp.tokenSandbox"
                      :placeholder="whatsapp.tokenSandboxLoaded ? '•••••••• (ya configurado)' : 'EAAxxxxx...'"
                      @input="markDirty"
                    >
                    <button class="btn-icon" @click="whatsapp.showTokenSandbox = !whatsapp.showTokenSandbox">
                      {{ whatsapp.showTokenSandbox ? '🙈' : '👁️' }}
                    </button>
                  </div>
                  <small class="field-hint">Token temporal de la app de Meta para sandbox. Lo encuentras en WhatsApp → Getting Started</small>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Phone Number ID (Sandbox)</label>
                  <input
                    type="text"
                    v-model="whatsapp.phoneNumberIdSandbox"
                    placeholder="Ej: 1234567890"
                    @input="markDirty"
                  >
                  <small class="field-hint">ID del número de prueba. Lo encuentras en WhatsApp → Phone Numbers → Test</small>
                </div>
              </div>
            </div>

            <!-- Credenciales Producción -->
            <div v-if="whatsapp.modo === 'produccion'" class="produccion-section">
              <h4 style="margin: 1.5rem 0 1rem; color: #2e7d32; display: flex; align-items: center; gap: 0.5rem;">
                🚀 Credenciales Producción
              </h4>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>WhatsApp Token (Producción)</label>
                  <div class="input-with-action">
                    <input
                      :type="whatsapp.showToken ? 'text' : 'password'"
                      v-model="whatsapp.token"
                      :placeholder="whatsapp.tokenLoaded ? '•••••••• (ya configurado)' : 'EAAxxxxx...'"
                      @input="markDirty"
                    >
                    <button class="btn-icon" @click="whatsapp.showToken = !whatsapp.showToken">
                      {{ whatsapp.showToken ? '🙈' : '👁️' }}
                    </button>
                  </div>
                  <small class="field-hint">Token permanente de la app de Meta. Lo encuentras en Dashboard → System Users</small>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Phone Number ID (Producción)</label>
                  <input
                    type="text"
                    v-model="whatsapp.phoneNumberId"
                    placeholder="Ej: 1234567890"
                    @input="markDirty"
                  >
                  <small class="field-hint">ID del número de WhatsApp Business. Lo encuentras en WhatsApp → Phone Numbers</small>
                </div>
              </div>
            </div>

            <!-- App Secret (común para ambos modos) -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label>App Secret (común para ambos modos)</label>
                <div class="input-with-action">
                  <input
                    :type="whatsapp.showSecret ? 'text' : 'password'"
                    v-model="whatsapp.appSecret"
                    :placeholder="whatsapp.appSecretLoaded ? '•••••••• (ya configurado)' : 'abc123...'"
                    @input="markDirty"
                  >
                  <button class="btn-icon" @click="whatsapp.showSecret = !whatsapp.showSecret">
                    {{ whatsapp.showSecret ? '🙈' : '👁️' }}
                  </button>
                </div>
                <small class="field-hint">Secret de tu app de Meta. Lo encuentras en App Settings → Basic. Es el mismo para sandbox y producción</small>
              </div>
            </div>

            <div class="provider-info">
              <p><strong>Pasos para configurar:</strong></p>
              <p>1. Copia la URL del webhook y pégala en Meta Developer Console → WhatsApp → Configuration</p>
              <p>2. Ingresa el Verify Token que definiste arriba en el campo "Identificador de verificación"</p>
              <p>3. Suscribe los campos: <code>messages</code> y <code>message_template_status</code></p>
              <p>4. Haz clic en "Verify and Save"</p>
            </div>

            <div class="form-actions">
              <button class="btn-primary" @click="guardarWhatsAppConfig" :disabled="whatsapp.saving">
                {{ whatsapp.saving ? 'Guardando...' : 'Guardar configuración WhatsApp' }}
              </button>
              <span v-if="whatsapp.savedMsg" class="test-success">{{ whatsapp.savedMsg }}</span>
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

        <!-- Tokens API -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <span class="provider-icon-lg">🔑</span>
              <div>
                <h3>Tokens API</h3>
                <p class="section-desc">Gestiona tokens para conexiones externas al sistema</p>
              </div>
            </div>
            <button class="btn-primary btn-sm" @click="showTokenForm = true" v-if="!showTokenForm">
              + Nuevo Token
            </button>
          </div>

          <div class="section-body">
            <!-- Formulario nuevo token -->
            <div v-if="showTokenForm" class="token-form">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Nombre del token</label>
                  <input v-model="newTokenName" type="text" placeholder="Ej: App externa, Integration, etc.">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Tipo de usuario</label>
                  <select v-model="newTokenUserTipo" @change="clearSelectedUser">
                    <option value="paciente">Paciente</option>
                    <option value="medico">Médico</option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label>Usuario vinculado</label>
                  <input v-model="newTokenUserSearch" type="text" :placeholder="newTokenUserTipo === 'medico' ? 'Buscar por nombre o email...' : 'Buscar por email...'" @input="searchUsers">
                  <div v-if="userSearchResults.length > 0" class="user-search-dropdown">
                    <div v-for="u in userSearchResults" :key="u.id" class="user-search-item" @click="selectUser(u)">
                      {{ u.nombre }} {{ u.apellido }} ({{ u.email }})
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="newTokenUserId" class="form-row">
                <div class="selected-user-badge">
                  Usuario seleccionado: <strong>{{ newTokenUserNombre }}</strong>
                  <button class="btn-icon-sm" @click="clearSelectedUser">&times;</button>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Permisos</label>
                  <div class="permisos-grid">
                    <label v-for="perm in availablePermisos" :key="perm.id" class="checkbox-label">
                      <input type="checkbox" v-model="newTokenPermisos" :value="perm.id">
                      {{ perm.label }}
                    </label>
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn-secondary" @click="showTokenForm = false">Cancelar</button>
                <button class="btn-primary" @click="createToken" :disabled="!newTokenName || !newTokenUserId || creatingToken">
                  {{ creatingToken ? 'Creando...' : 'Crear Token' }}
                </button>
              </div>
            </div>

            <!-- Token recién creado -->
            <div v-if="createdToken" class="token-created-alert">
              <div class="alert-header">
                <span class="alert-icon">✅</span>
                <strong>Token creado correctamente</strong>
              </div>
              <div class="token-display">
                <code>{{ createdToken }}</code>
                <button class="btn-copy" @click="copyToken">Copiar</button>
              </div>
              <p class="alert-warning">⚠️ Guarda este token ahora. No podrás verlo de nuevo.</p>
            </div>

            <!-- Lista de tokens -->
            <div v-if="tokens.length > 0" class="tokens-list">
              <div v-for="token in tokens" :key="token.id" class="token-item">
                <div class="token-info">
                  <strong>{{ token.nombre }}</strong>
                  <span class="token-preview">{{ token.token_preview }}</span>
                  <span class="token-user">{{ token.user_nombre || '—' }}</span>
                  <span class="token-user-email">{{ token.user_email || '' }}</span>
                  <span class="token-status" :class="token.activo ? 'active' : 'inactive'">
                    {{ token.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                  <span v-if="token.ultimo_uso" class="token-last-use">
                    Último uso: {{ new Date(token.ultimo_uso).toLocaleDateString() }}
                  </span>
                </div>
                <div class="token-actions">
                  <button class="btn-delete-sm" @click="deleteToken(token.id)">Eliminar</button>
                </div>
              </div>
            </div>
            <div v-else-if="!showTokenForm" class="empty-tokens">
              No hay tokens API creados. Crea uno para comenzar a conectar aplicaciones externas.
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

const sistema = ref({
  modo: 'produccion',
  firebaseUrl: '',
})

// WebSocket test state
const wsConnected = ref(false)
const wsSending = ref(false)
const wsTestResult = ref<{ ok: boolean; message: string } | null>(null)

async function testWebSocket() {
  wsSending.value = true
  wsTestResult.value = null
  try {
    const res = await $fetch('/api/admin/websocket-test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    wsTestResult.value = { ok: true, message: '✅ Evento enviado! Si el WebSocket funciona, verás la notificación arriba.' }
  } catch (e: any) {
    wsTestResult.value = { ok: false, message: '❌ Error: ' + (e.data?.message || e.message) }
  }
  wsSending.value = false
}

async function reconnectWs() {
  wsTestResult.value = null
  wsConnected.value = false
  window.location.reload()
}

const wsDebugMode = ref(import.meta.client ? localStorage.getItem('ws_debug') === 'true' : false)

function toggleWsDebug() {
  wsDebugMode.value = !wsDebugMode.value
  if (import.meta.client) {
    localStorage.setItem('ws_debug', String(wsDebugMode.value))
  }
}

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
    api_url: '',
    metodo: 'POST',
    showUrl: false,
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

const whatsapp = ref({
  enabled: true,
  verifyToken: '',
  token: '',
  phoneNumberId: '',
  appSecret: '',
  modo: 'sandbox',
  tokenSandbox: '',
  phoneNumberIdSandbox: '',
  showVerify: false,
  showToken: false,
  showSecret: false,
  showTokenSandbox: false,
  configurado: false,
  saving: false,
  savedMsg: '',
  tokenLoaded: '',
  tokenSandboxLoaded: '',
  appSecretLoaded: '',
})

const loadWhatsAppConfig = async () => {
  try {
    const data: any = await $fetch('/api/admin/configuracion', { params: { categoria: 'whatsapp' } })
    const configs = data?.configuracion || []
    const configMap: Record<string, string> = {}
    for (const c of configs) { configMap[c.clave] = c.valor || '' }

    whatsapp.value.enabled = configMap['whatsapp_webhook_activo'] !== 'false'
    whatsapp.value.verifyToken = configMap['whatsapp_verify_token'] || ''
    whatsapp.value.token = configMap['whatsapp_token'] || ''
    whatsapp.value.phoneNumberId = configMap['whatsapp_phone_number_id'] || ''
    whatsapp.value.appSecret = configMap['whatsapp_app_secret'] || ''
    whatsapp.value.modo = configMap['whatsapp_modo'] || 'sandbox'
    whatsapp.value.tokenSandbox = configMap['whatsapp_token_sandbox'] || ''
    whatsapp.value.phoneNumberIdSandbox = configMap['whatsapp_phone_number_id_sandbox'] || ''

    const activo = whatsapp.value.modo === 'sandbox'
      ? !!(whatsapp.value.verifyToken && whatsapp.value.tokenSandbox && whatsapp.value.phoneNumberIdSandbox)
      : !!(whatsapp.value.verifyToken && whatsapp.value.token && whatsapp.value.phoneNumberId)
    whatsapp.value.configurado = activo
  } catch (e) {
    console.error('Error cargando WhatsApp config:', e)
  }
}

const guardarWhatsAppConfig = async () => {
  whatsapp.value.saving = true
  whatsapp.value.savedMsg = ''
  try {
    const configuraciones = [
      { clave: 'whatsapp_webhook_activo', valor: whatsapp.value.enabled ? 'true' : 'false', categoria: 'whatsapp' },
      { clave: 'whatsapp_verify_token', valor: whatsapp.value.verifyToken, categoria: 'whatsapp' },
      { clave: 'whatsapp_modo', valor: whatsapp.value.modo, categoria: 'whatsapp' },
      { clave: 'whatsapp_phone_number_id', valor: whatsapp.value.phoneNumberId, categoria: 'whatsapp' },
      { clave: 'whatsapp_phone_number_id_sandbox', valor: whatsapp.value.phoneNumberIdSandbox, categoria: 'whatsapp' },
    ]

    if (whatsapp.value.token) configuraciones.push({ clave: 'whatsapp_token', valor: whatsapp.value.token, categoria: 'whatsapp' })
    if (whatsapp.value.tokenSandbox) configuraciones.push({ clave: 'whatsapp_token_sandbox', valor: whatsapp.value.tokenSandbox, categoria: 'whatsapp' })
    if (whatsapp.value.appSecret) configuraciones.push({ clave: 'whatsapp_app_secret', valor: whatsapp.value.appSecret, categoria: 'whatsapp' })

    await $fetch('/api/admin/configuracion', {
      method: 'POST',
      body: { configuraciones }
    })
    const activo = whatsapp.value.modo === 'sandbox'
      ? !!(whatsapp.value.verifyToken && whatsapp.value.tokenSandbox && whatsapp.value.phoneNumberIdSandbox)
      : !!(whatsapp.value.verifyToken && whatsapp.value.token && whatsapp.value.phoneNumberId)
    whatsapp.value.configurado = activo
    whatsapp.value.savedMsg = 'Configuración WhatsApp guardada correctamente'
    setTimeout(() => { whatsapp.value.savedMsg = '' }, 3000)
  } catch (e: any) {
    alert(e?.data?.message || 'Error guardando configuración WhatsApp')
  } finally {
    whatsapp.value.saving = false
  }
}

const verificacion = ref({
  requirePhone: true,
  requireEmail: true,
})

const telefonosVerificados = ref([])
const nuevoTelefonoVerificado = ref({ telefono: '', descripcion: '' })
const cargandoTelefonos = ref(false)

const smtpEmail = ref({
  enabled: true,
  host: '',
  port: 465,
  user: '',
  pass: '',
  from: '',
  showPass: false,
  pass_set: false,
  configurado: false,
  origenTexto: '',
  dirty: false,
  saving: false,
  savedMsg: '',
  testTo: '',
  sendingTest: false,
  testResult: '',
  testError: '',
})

const markDirtySmtp = () => {
  smtpEmail.value.dirty = true
  smtpEmail.value.savedMsg = ''
  smtpEmail.value.testResult = ''
}

const loadSmtpConfig = async () => {
  try {
    const data: any = await $fetch('/api/admin/configuracion-smtp')
    const c = data?.configuracion
    const fallback = data?.env_fallback || {}
    if (!c) return

    const enUso = data?.en_uso || 'env'
    const usar = enUso === 'env' ? fallback : c
    const passDisponible = c.pass_set || fallback.pass_set

    smtpEmail.value.enabled = c.enabled !== false
    smtpEmail.value.host = c.host || ''
    smtpEmail.value.port = Number(c.port) || 465
    smtpEmail.value.user = c.user || ''
    smtpEmail.value.from = c.from || ''
    smtpEmail.value.pass = ''
    smtpEmail.value.pass_set = c.pass_set
    smtpEmail.value.configurado = !!(usar.host && usar.user && passDisponible)
    smtpEmail.value.origenTexto = enUso === 'env'
      ? 'Usando la configuración de variables de entorno (.env). Puedes sobrescribirla aquí desde el panel.'
      : `Configurado desde el panel${c.enabled === false ? ', pero está deshabilitado' : ''}`
    smtpEmail.value.dirty = false
  } catch (e) {
    console.error('Error cargando SMTP:', e)
  }
}

const guardarConfigSmtp = async () => {
  smtpEmail.value.saving = true
  smtpEmail.value.savedMsg = ''
  try {
    await $fetch('/api/admin/configuracion-smtp', {
      method: 'POST',
      body: {
        configuracion: {
          enabled: smtpEmail.value.enabled,
          host: smtpEmail.value.host,
          port: smtpEmail.value.port,
          user: smtpEmail.value.user,
          pass: smtpEmail.value.pass,
          from: smtpEmail.value.from,
        }
      }
    })
    smtpEmail.value.savedMsg = 'Configuración SMTP guardada correctamente'
    smtpEmail.value.pass = ''
    await loadSmtpConfig()
    setTimeout(() => { smtpEmail.value.savedMsg = '' }, 3000)
  } catch (e: any) {
    alert(e?.data?.message || 'Error guardando configuración SMTP')
  } finally {
    smtpEmail.value.saving = false
  }
}

const enviarPruebaSmtp = async () => {
  if (!smtpEmail.value.testTo) return

  smtpEmail.value.sendingTest = true
  smtpEmail.value.testResult = ''
  smtpEmail.value.testError = ''

  try {
    if (smtpEmail.value.dirty) {
      await $fetch('/api/admin/configuracion-smtp', {
        method: 'POST',
        body: {
          configuracion: {
            enabled: smtpEmail.value.enabled,
            host: smtpEmail.value.host,
            port: smtpEmail.value.port,
            user: smtpEmail.value.user,
            pass: smtpEmail.value.pass,
            from: smtpEmail.value.from,
          }
        }
      })
      smtpEmail.value.pass = ''
      await loadSmtpConfig()
    }
    await $fetch('/api/admin/configuracion-smtp-test', {
      method: 'POST',
      body: { to: smtpEmail.value.testTo }
    })
    smtpEmail.value.testResult = 'success'
  } catch (e: any) {
    smtpEmail.value.testResult = 'error'
    smtpEmail.value.testError = e?.data?.message || 'Error enviando correo de prueba'
  } finally {
    smtpEmail.value.sendingTest = false
  }
}

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

    // Sistema config
    sistema.value.modo = configMap['sistema_modo'] || 'produccion'
    sistema.value.firebaseUrl = configMap['sistema_firebase_url'] || ''

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

    // Sistema config
    configuraciones.push({ clave: 'sistema_modo', valor: sistema.value.modo })
    configuraciones.push({ clave: 'sistema_firebase_url', valor: sistema.value.firebaseUrl || '' })

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
      api_url: conexion.api_url || '',
      metodo: conexion.metodo || 'POST',
      showUrl: false,
      showSid: false,
      showToken: false,
    }
  } else {
    sms.value.editandoId = null
    sms.value.form = {
      nombre: '', proveedor: 'twilio', account_sid: '', auth_token: '',
      from_number: '', modo: 'sandbox', activa: true, preferida: false,
      prioridad: 0, descripcion: '', api_url: '', metodo: 'POST', showUrl: false, showSid: false, showToken: false,
    }
  }
  sms.value.showForm = true
}

const editarConexion = (conn: any) => abrirFormConexion(conn)

const guardarConexion = async () => {
  sms.value.saving = true
  try {
    const payload: any = { ...sms.value.form }
    if (sms.value.form.proveedor === 'api_rest') {
      delete payload.account_sid
    } else {
      delete payload.api_url
    }
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

// Tokens API
const tokens = ref<any[]>([])
const showTokenForm = ref(false)
const newTokenName = ref('')
const newTokenPermisos = ref<string[]>([])
const newTokenUserTipo = ref('paciente')
const newTokenUserSearch = ref('')
const newTokenUserId = ref('')
const newTokenUserNombre = ref('')
const userSearchResults = ref<any[]>([])
const creatingToken = ref(false)
const createdToken = ref('')

const availablePermisos = [
  { id: 'citas:read', label: 'Ver citas' },
  { id: 'citas:write', label: 'Crear/editar citas' },
  { id: 'pacientes:read', label: 'Ver pacientes' },
  { id: 'pacientes:write', label: 'Crear/editar pacientes' },
  { id: 'medicos:read', label: 'Ver médicos' },
  { id: 'pagos:read', label: 'Ver pagos' },
]

let searchTimeout: any = null
const searchUsers = () => {
  clearTimeout(searchTimeout)
  if (newTokenUserSearch.value.length < 2) {
    userSearchResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      const table = newTokenUserTipo.value === 'medico' ? 'medicos' : 'pacientes'
      const data = await $fetch(`/api/admin/${table}`, { query: { buscar: newTokenUserSearch.value } })
      userSearchResults.value = (data.rows || data.pacientes || data.medicos || []).slice(0, 8)
    } catch {
      userSearchResults.value = []
    }
  }, 300)
}

const selectUser = (user: any) => {
  newTokenUserId.value = user.id
  newTokenUserNombre.value = `${user.nombre} ${user.apellido}`
  newTokenUserSearch.value = `${user.nombre} ${user.apellido}`
  userSearchResults.value = []
}

const clearSelectedUser = () => {
  newTokenUserId.value = ''
  newTokenUserNombre.value = ''
  newTokenUserSearch.value = ''
}

const loadTokens = async () => {
  try {
    const data = await $fetch('/api/admin/tokens')
    tokens.value = data.tokens || []
  } catch (e) {
    console.error('Error cargando tokens', e)
  }
}

const createToken = async () => {
  creatingToken.value = true
  try {
    const data = await $fetch('/api/admin/tokens', {
      method: 'POST',
      body: {
        nombre: newTokenName.value,
        permisos: newTokenPermisos.value,
        user_id: newTokenUserId.value,
        user_tipo: newTokenUserTipo.value,
      }
    })
    createdToken.value = data.token
    showTokenForm.value = false
    newTokenName.value = ''
    newTokenPermisos.value = []
    clearSelectedUser()
    await loadTokens()
  } catch (e) {
    alert(e?.data?.message || 'Error creando token')
  } finally {
    creatingToken.value = false
  }
}

const deleteToken = async (id: number) => {
  if (!confirm('Eliminar este token? La conexión externa dejará de funcionar.')) return
  try {
    await $fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' })
    await loadTokens()
  } catch (e) {
    alert(e?.data?.message || 'Error eliminando token')
  }
}

const copyToken = () => {
  navigator.clipboard.writeText(createdToken.value)
}

onMounted(() => {
  loadConfig()
  cargarTelefonosVerificados()
  loadSmtpConfig()
  loadTokens()
  loadWhatsAppConfig()

  // WebSocket connection test
  const wsToken = useCookie('admin_token').value
  if (wsToken && import.meta.client) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    ws.onopen = () => {
      wsConnected.value = true
      ws.send(JSON.stringify({ type: 'auth', token: wsToken }))
    }
    ws.onclose = () => { wsConnected.value = false }
    ws.onerror = () => { wsConnected.value = false }
  }
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

.db-warning {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #795548;
}

.field-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: #90a4ae;
}

.readonly-field {
  padding: 0.6rem 0.8rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: monospace;
  background: #f5f5f5;
  color: #636e72;
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

/* SMTP Status */
.smtp-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.smtp-status strong {
  font-size: 0.9rem;
}

.smtp-status span {
  font-size: 0.8rem;
}

.smtp-status-ok {
  background: #f0fff4;
  border: 1px solid #c8e6c9;
}

.smtp-status-ok strong {
  color: #2e7d32;
}

.smtp-status-ok span {
  color: #4e7a54;
}

.smtp-status-warn {
  background: #fff8e1;
  border: 1px solid #ffe082;
}

.smtp-status-warn strong {
  color: #e65100;
}

.smtp-status-warn span {
  color: #9a6f00;
}

.field-hint {
  font-size: 0.75rem;
  color: #b2bec3;
  margin-top: 0.3rem;
}

/* SMTP Test Zone */
.smtp-test-zone {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed #e0e0e0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.25rem;
}

.smtp-test-zone .test-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.smtp-test-zone .test-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #2d3436;
}

.smtp-test-zone .test-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #636e72;
}

.smtp-test-zone .test-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
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

/* Token styles */
.token-form {
  background: #f8f9fa;
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.permisos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
}

.user-search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}

.user-search-item {
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  border-bottom: 1px solid #f0f0f0;
}

.user-search-item:hover {
  background: #f0f0f0;
}

.user-search-item:last-child {
  border-bottom: none;
}

.selected-user-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #e8f5e9;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.btn-icon-sm {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #636e72;
  padding: 0;
  line-height: 1;
}

.form-group {
  position: relative;
}

.token-created-alert {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.alert-icon {
  font-size: 1.2rem;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.token-display code {
  flex: 1;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.btn-copy {
  background: #00b894;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.alert-warning {
  color: #9a6f00;
  font-size: 0.8rem;
  margin: 0;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.token-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.token-preview {
  font-family: monospace;
  font-size: 0.8rem;
  color: #636e72;
}

.token-user {
  font-size: 0.8rem;
  color: #2d3436;
  font-weight: 500;
}

.token-user-email {
  font-size: 0.75rem;
  color: #636e72;
}

.token-status {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.token-status.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.token-status.inactive {
  background: #ffebee;
  color: #c62828;
}

.token-last-use {
  font-size: 0.75rem;
  color: #636e72;
}

.token-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-delete-sm {
  background: #ffebee;
  color: #c62828;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-delete-sm:hover {
  background: #ffcdd2;
}

.empty-tokens {
  color: #636e72;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem;
}
</style>
