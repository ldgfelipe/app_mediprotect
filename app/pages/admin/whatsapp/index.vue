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
        <NuxtLink to="/admin/whatsapp" class="nav-link active">WhatsApp</NuxtLink>
        <NuxtLink to="/admin/whatsapp/logs" class="nav-link">WA Logs</NuxtLink>
        <NuxtLink to="/admin/configuracion" class="nav-link">Configuración</NuxtLink>
      </nav>
      <button class="btn-logout" @click="logout">Cerrar Sesión</button>
    </aside>

    <main class="admin-content">
      <header class="content-header">
        <h1>💬 WhatsApp Business</h1>
        <p>Monitoreo de conversaciones, flujo de citas y simulador</p>
      </header>

      <!-- Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: tabActiva === 'conversaciones' }" @click="tabActiva = 'conversaciones'">📋 Conversaciones</button>
        <button class="tab-btn" :class="{ active: tabActiva === 'simulador' }" @click="tabActiva = 'simulador'">🧪 Simulador</button>
        <button class="tab-btn" :class="{ active: tabActiva === 'vincular' }" @click="abrirVincular">📱 Vincular número</button>
        <button class="tab-btn" :class="{ active: tabActiva === 'configuracion' }" @click="tabActiva = 'configuracion'">⚙️ Configuración</button>
        <button class="tab-btn" :class="{ active: tabActiva === 'flujos' }" @click="() => { console.log('[Tab] click Flujos'); tabActiva = 'flujos' }">🧩 Flujos</button>
      </div>

      <!-- TAB: Conversaciones -->
      <template v-if="tabActiva === 'conversaciones'">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">💬</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.total_conversaciones || 0 }}</span>
              <span class="stat-label">Conversaciones totales</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📨</div>
            <div class="stat-info">
              <span class="stat-value">{{ mensajesHoy.total || 0 }}</span>
              <span class="stat-label">Mensajes hoy</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <span class="stat-value">{{ citasDesdeWhatsApp }}</span>
              <span class="stat-label">Citas esta semana (WA)</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔄</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.en_flujo || 0 }}</span>
              <span class="stat-label">En flujo activo</span>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="filters-bar">
          <input v-model="filtroTelefono" type="tel" placeholder="Buscar por teléfono..." class="filter-input" @input="buscarConversaciones">
          <select v-model="filtroEstado" class="filter-select" @change="buscarConversaciones">
            <option value="">Todos los estados</option>
            <option value="bienvenida">Bienvenida</option>
            <option value="menu_principal">Menú principal</option>
            <option value="solicitud_directa">Solicitud directa</option>
            <option value="seleccionando_especialidad">Seleccionando especialidad</option>
            <option value="seleccionando_doctor">Seleccionando doctor</option>
            <option value="seleccionando_fecha">Seleccionando fecha</option>
            <option value="seleccionando_hora">Seleccionando hora</option>
            <option value="seleccionando_dia_preferencia">Día preferencia</option>
            <option value="seleccionando_hora_preferencia">Hora preferencia</option>
            <option value="confirmacion_paciente">Confirmación paciente</option>
            <option value="confirmacion_solicitud_directa">Conf. solicitud</option>
            <option value="cita_creada">Cita creada</option>
            <option value="esperando_asesor">Asesor</option>
          </select>
          <button class="btn-refresh" @click="buscarConversaciones">🔄 Actualizar</button>
        </div>

        <!-- Lista de conversaciones -->
        <div class="conversaciones-panel">
          <div class="conversaciones-list">
            <div v-if="cargando" class="loading">Cargando conversaciones...</div>

            <div v-else-if="conversaciones.length === 0" class="empty">
              No hay conversaciones por WhatsApp aún.
            </div>

            <div v-else>
              <div
                v-for="conv in conversaciones"
                :key="conv.id"
                class="conv-item"
                :class="{ active: convSeleccionada?.telefono === conv.telefono }"
                @click="seleccionarConversacion(conv)"
              >
                <div class="conv-avatar">
                  {{ (conv.nombre_paciente || conv.telefono || '?')[0].toUpperCase() }}
                </div>
                <div class="conv-info">
                  <div class="conv-name">{{ conv.nombre_paciente || conv.telefono }}</div>
                  <div class="conv-phone">{{ conv.telefono }}</div>
                  <div class="conv-state">
                    <span class="state-badge" :class="getEstadoClass(conv.estado)">
                      {{ getEstadoLabel(conv.estado) }}
                    </span>
                    <span class="conv-msgs">{{ conv.total_mensajes || 0 }} msgs</span>
                  </div>
                </div>
                <div class="conv-time">
                  {{ conv.ultimo_mensaje_at ? formatearTiempo(conv.ultimo_mensaje_at) : '' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Detalle de conversación -->
          <div class="conv-detail" v-if="convSeleccionada">
            <div class="detail-header">
              <h3>{{ convSeleccionada.nombre_paciente || convSeleccionada.telefono }}</h3>
              <span class="conv-phone-detail">{{ convSeleccionada.telefono }}</span>
              <span class="state-badge" :class="getEstadoClass(convSeleccionada.estado)">
                {{ getEstadoLabel(convSeleccionada.estado) }}
              </span>
            </div>

            <div class="mensajes-container" ref="mensajesContainer">
              <div v-if="cargandoMensajes" class="loading">Cargando mensajes...</div>
              <div v-else-if="mensajes.length === 0" class="empty">No hay mensajes</div>
              <div v-else>
                <div
                  v-for="msg in mensajes"
                  :key="msg.id"
                  class="msg-item"
                  :class="msg.direccion === 'in' ? 'msg-in' : 'msg-out'"
                >
                  <div class="msg-direction">{{ msg.direccion === 'in' ? '📥' : '📤' }}</div>
                  <div class="msg-content">
                    <div class="msg-text">{{ msg.mensaje }}</div>
                    <div class="msg-meta">
                      <span class="msg-type">{{ msg.tipo }}</span>
                      <span class="msg-time">{{ formatearTiempo(msg.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="conv-detail empty-detail" v-else>
            <p>Selecciona una conversación para ver los mensajes</p>
          </div>
        </div>
      </template>

      <!-- TAB: Simulador -->
      <template v-if="tabActiva === 'simulador'">
          <!-- Panel de entrada -->
          <div class="sim-input-panel">
            <h3>🧪 Simulador de WhatsApp</h3>
            <p class="sim-desc">Simula mensajes entrantes de pacientes. El sistema procesa automáticamente y responde según el flujo.</p>

            <div class="sim-phone-row">
              <label>Teléfono del paciente:</label>
              <input v-model="simTelefono" type="tel" class="sim-phone-input" placeholder="521234567890" />
            </div>

            <div class="sim-msg-row">
              <label>Mensaje del paciente:</label>
              <textarea v-model="simMensaje" class="sim-msg-input" rows="6" placeholder="Pega aquí el mensaje de WhatsApp del paciente..."></textarea>
            </div>

            <div class="sim-actions">
              <button class="btn-simular" @click="enviarSimulacion" :disabled="simProcesando || !simMensaje.trim()">
                {{ simProcesando ? '⏳ Procesando...' : '📤 Enviar mensaje' }}
              </button>
              <button class="btn-limpiar-sim" @click="limpiarSimulador">🗑️ Limpiar historial</button>
            </div>

            <div class="sim-templates">
              <h4>📝 Mensajes de ejemplo:</h4>
              <button class="btn-template" @click="cargarTemplate('solicitud')">
                Solicitud de cita (con ID)
              </button>
              <button class="btn-template" @click="cargarTemplate('info')">
                Consulta información
              </button>
              <button class="btn-template" @click="cargarTemplate('asesor')">
                Hablar con asesor
              </button>
            </div>

            <!-- Estado actual de la conversación -->
            <div class="sim-estado" v-if="simConversacion">
              <h4>📊 Estado de la conversación:</h4>
              <div class="estado-row">
                <span class="estado-label">Estado:</span>
                <span class="state-badge" :class="getEstadoClass(simConversacion.estado)">
                  {{ getEstadoLabel(simConversacion.estado) }}
                </span>
              </div>
              <div class="estado-row" v-if="simConversacion.datos_temp?.doctorNombre">
                <span class="estado-label">Médico:</span>
                <span>Dr. {{ simConversacion.datos_temp.doctorNombre }}</span>
              </div>
              <div class="estado-row" v-if="simConversacion.datos_temp?.fechaSeleccionada">
                <span class="estado-label">Fecha:</span>
                <span>{{ simConversacion.datos_temp.fechaSeleccionada }}</span>
              </div>
              <div class="estado-row" v-if="simConversacion.datos_temp?.horaSeleccionada">
                <span class="estado-label">Hora:</span>
                <span>{{ simConversacion.datos_temp.horaSeleccionada }}</span>
              </div>
            </div>
          </div>

          <!-- Panel de chat -->
          <div class="sim-chat-panel">
            <div class="sim-chat-header">
              <h3>💬 Conversación simulada</h3>
              <button class="btn-clear-chat" @click="limpiarChatSim">Limpiar chat</button>
            </div>

            <div class="sim-chat-messages" ref="simChatContainer">
              <div v-if="simChat.length === 0" class="sim-chat-empty">
                <p>📱 Inicia una conversación enviando un mensaje de ejemplo</p>
                <p class="sim-chat-hint">El sistema detectará automáticamente si es una solicitud de cita y responderá con opciones</p>
              </div>

              <div
                v-for="(msg, idx) in simChat"
                :key="idx"
                class="sim-msg"
                :class="msg.direccion === 'in' ? 'sim-msg-in' : 'sim-msg-out'"
              >
                <div class="sim-msg-avatar">
                  {{ msg.direccion === 'in' ? '👤' : '🤖' }}
                </div>
                <div class="sim-msg-bubble">
                  <div class="sim-msg-text" v-html="formatoSimMensaje(msg.texto)"></div>
                  <div v-if="msg.opciones && msg.opciones.length" class="sim-msg-opciones">
                    <button
                      v-for="op in msg.opciones"
                      :key="op.id"
                      class="btn-opcion-sim"
                      @click="seleccionarOpcionSim(op)"
                    >
                      {{ op.titulo }}
                      <span v-if="op.descripcion" class="opcion-desc">{{ op.descripcion }}</span>
                    </button>
                  </div>
                  <div v-if="msg.botones && msg.botones.length" class="sim-msg-botones">
                    <button
                      v-for="btn in msg.botones"
                      :key="btn.id"
                      class="btn-boton-sim"
                      @click="seleccionarBotonSim(btn)"
                    >
                      {{ btn.titulo }}
                    </button>
                  </div>
                  <div class="sim-msg-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
              </div>

              <div v-if="simProcesando" class="sim-msg sim-msg-out">
                <div class="sim-msg-avatar">🤖</div>
                <div class="sim-msg-bubble sim-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
      </template>

      <!-- TAB: Configuración -->
      <template v-if="tabActiva === 'vincular'">
        <div class="vinculacion-card">
          <h3>📱 Vincular número de WhatsApp</h3>
          <p class="config-desc">Conecta la instancia <strong>{{ instanceNameWhatsApp || '(pendiente)' }}</strong> escaneando el código QR con WhatsApp: <em>Ajustes → Dispositivos vinculados → Vincular un dispositivo</em>.</p>

          <div class="vinculacion-actions">
            <button
              class="btn-save-config"
              @click="conectarInstancia"
              :disabled="vinculando"
            >
              {{ estadoInstancia === 'open' ? 'Volver a generar QR' : 'Conectar / ver QR' }}
            </button>
            <button
              v-if="estadoInstancia === 'open'"
              class="btn-reset-config"
              @click="desconectarInstancia"
              :disabled="desconectando"
            >
              Desconectar
            </button>
          </div>
          <div v-if="vinculando || desconectando" class="cargando">⏳ Procesando…</div>

          <div v-if="estadoMensaje" class="config-error">
            <p>❌ {{ estadoMensaje }}</p>
          </div>
          <div v-else-if="estadoExito" class="config-exito">
            <p>✅ {{ estadoExito }}</p>
          </div>

          <div v-if="estadoInstancia === 'open'" class="estado-conectado">🟢 Conectado</div>

          <div v-else-if="qrBase64" class="qr-container">
            <img :src="`data:image/png;base64,${qrBase64}`" alt="Código QR de WhatsApp" class="qr-img" />
            <p class="config-desc">Escanea con WhatsApp desde el celular antes de que caduque el código.</p>
          </div>

          <div v-else-if="estadoInstancia === 'close'" class="qr-container">
            <p class="config-desc">📴 Desconectado. Pulsa <strong>Conectar / ver QR</strong> para vincular el número.</p>
          </div>

          <div v-else class="qr-container">
            <p class="config-desc">⏳ Esperando el código QR… se actualizará solo, no hace falta volver a conectar.</p>
          </div>

          <div class="vinculacion-webhook">
            <button
              class="btn-save-config"
              @click="configurarWebhook"
              :disabled="configurandoWebhook"
            >
              Configurar webhook automáticamente
            </button>
            <p class="config-desc">Apuntará a <code>{{ urlWebhook }}</code> con el header <code>x-mediprotect-apikey</code>. Luego activa el toggle <em>webhook WhatsApp</em> en la página Configuración.</p>
          </div>
        </div>
      </template>

      <template v-if="tabActiva === 'configuracion'">
        <div class="config-layout">
          <div class="config-card">
            <h3>🔧 Configuración WhatsApp</h3>
            <p class="config-desc">Configura la pasarela Evolution API (WhatsApp autohospedado)</p>

            <div class="config-row">
              <label>URL de la pasarela (Gateway):</label>
              <input
                v-model="gatewayUrlWhatsApp"
                type="text"
                class="config-input"
                placeholder="http://127.0.0.1:8080"
                />
            </div>

            <div class="config-row">
              <label>Nombre de la instancia:</label>
              <input
                v-model="instanceNameWhatsApp"
                type="text"
                class="config-input"
                placeholder="mediprotect"
                />
            </div>

            <div class="config-row">
              <label>API Key (apikey) de la instancia:</label>
              <input
                v-model="apikeyWhatsApp"
                type="password"
                class="config-input"
                placeholder="Clave API de la instancia Evolution"
                />
            </div>

            <div class="config-actions">
              <button
                class="btn-save-config"
                @click="guardarConfiguracionWhatsApp"
                :disabled="guardandoConfig"
              >
                Guardar Configuración
              </button>
              <button
                class="btn-reset-config"
                @click="resetearConfiguracion"
                >
                Restablecer
              </button>
            </div>

            <div v-if="errorConfig" class="config-error">
              <p>❌ {{ errorConfig }}</p>
            </div>

            <div v-if="exitoConfig" class="config-exito">
              <p>✅ {{ exitoConfig }}</p>
            </div>
          </div>

          <div class="config-info">
            <h4>Información:</h4>
            <p>El webhook entrante recibe eventos <code>messages.upsert</code> de la pasarela Evolution API en <code>/whook/wame</code>.</p>
            <p>Los mensajes salientes se envían vía <code>message/sendText</code>, <code>message/sendList</code> y <code>message/sendButtons</code> con el header <code>apikey</code>.</p>
            <p>Apuntar la URL de la instancia a tu VPS donde corre la pasarela (ej. <code>http://127.0.0.1:8080</code>).</p>
          </div>
        </div>
      </template>

      <!-- TAB: Flujos (editor visual estilo n8n) -->
      <template v-if="tabActiva === 'flujos'">
        <FlujosPanel />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import FlujosPanel from '@/components/admin/FlujosPanel.vue'
definePageMeta({ middleware: 'admin-auth' })

const adminUsuario = useCookie('admin_usuario')
const router = useRouter()

const conversaciones = ref<any[]>([])
const convSeleccionada = ref<any>(null)
const mensajes = ref<any[]>([])
const stats = ref<any>({})
const mensajesHoy = ref<any>({})
const citasDesdeWhatsApp = ref(0)
const cargando = ref(true)
const cargandoMensajes = ref(false)
const filtroTelefono = ref('')
const filtroEstado = ref('')
const mensajesContainer = ref<HTMLElement>()
const tabActiva = ref('conversaciones')

const simTelefono = ref('5215512345678')
const simMensaje = ref('')
const simProcesando = ref(false)
const simConversacion = ref<any>(null)
const simChat = ref<any[]>([])
const simChatContainer = ref<HTMLElement>()

const buscarConversaciones = async () => {
  cargando.value = true
  try {
    const params: any = { limite: 50 }
    if (filtroTelefono.value) params.telefono = filtroTelefono.value
    if (filtroEstado.value) params.estado = filtroEstado.value

    const data: any = await $fetch('/api/admin/whatsapp-conversaciones', {
      params,
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    conversaciones.value = data.conversaciones || []
    stats.value = data.stats || {}
    mensajesHoy.value = data.mensajesHoy || {}
    citasDesdeWhatsApp.value = data.citasDesdeWhatsApp || 0
  } catch (e) {
    console.error('Error:', e)
  } finally {
    cargando.value = false
  }
}

const seleccionarConversacion = async (conv: any) => {
  convSeleccionada.value = conv
  cargandoMensajes.value = true
  try {
    const data: any = await $fetch('/api/admin/whatsapp-mensajes', {
      params: { telefono: conv.telefono },
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    mensajes.value = data.mensajes || []
    nextTick(() => {
      if (mensajesContainer.value) {
        mensajesContainer.value.scrollTop = mensajesContainer.value.scrollHeight
      }
    })
  } catch (e) {
    console.error('Error:', e)
  } finally {
    cargandoMensajes.value = false
  }
}

const getEstadoClass = (estado: string) => {
  if (estado === 'cita_creada') return 'state-success'
  if (estado === 'bienvenida') return 'state-new'
  if (estado.includes('seleccionando')) return 'state-progress'
  if (estado === 'esperando_asesor') return 'state-waiting'
  if (estado === 'solicitud_directa') return 'state-progress'
  if (estado === 'confirmacion_solicitud_directa') return 'state-progress'
  return 'state-default'
}

const getEstadoLabel = (estado: string) => {
  const labels: Record<string, string> = {
    bienvenida: 'Nuevo',
    menu_principal: 'Menú',
    solicitud_directa: 'Solicitud directa',
    solicitando_id_paciente: 'Buscando paciente',
    solicitando_doctor: 'Buscando doctor',
    seleccionando_especialidad: 'Especialidad',
    seleccionando_doctor: 'Doctor',
    seleccionando_fecha: 'Fecha',
    seleccionando_hora: 'Hora',
    seleccionando_dia_preferencia: 'Día preferencia',
    seleccionando_hora_preferencia: 'Hora preferencia',
    confirmacion_paciente: 'Confirmando',
    confirmacion_solicitud_directa: 'Conf. solicitud',
    cita_creada: 'Cita creada',
    esperando_asesor: 'Asesor',
  }
  return labels[estado] || estado
}

const formatearTiempo = (fecha: string) => {
  const d = new Date(fecha)
  const ahora = new Date()
  const diffMs = ahora.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMin / 60)
  const diffDias = Math.floor(diffHoras / 24)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHoras < 24) return `${diffHoras}h`
  if (diffDias < 7) return `${diffDias}d`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const formatoSimMensaje = (texto: string) => {
  return texto
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

const logout = () => {
  adminUsuario.value = null
  const token = useCookie('admin_token')
  token.value = null
  navigateTo('/admin/login')
}

const enviarSimulacion = async () => {
  if (!simMensaje.value.trim() || simProcesando.value) return

  simProcesando.value = true

  simChat.value.push({
    direccion: 'in',
    texto: simMensaje.value,
    timestamp: Date.now(),
  })

  const mensajeActual = simMensaje.value
  simMensaje.value = ''

  try {
    const data: any = await $fetch('/api/admin/whatsapp-simular', {
      method: 'POST',
      body: {
        telefono: simTelefono.value,
        mensaje: mensajeActual,
      },
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })

    simConversacion.value = data.conversacion

    if (data.respuesta) {
      simChat.value.push({
        direccion: 'out',
        texto: data.respuesta.texto,
        opciones: data.respuesta.listaOpciones || null,
        botones: data.respuesta.botones || null,
        timestamp: Date.now(),
      })
    }
  } catch (e: any) {
    simChat.value.push({
      direccion: 'out',
      texto: `❌ Error: ${e.data?.message || e.message || 'Error desconocido'}`,
      timestamp: Date.now(),
    })
  } finally {
    simProcesando.value = false
    nextTick(() => {
      if (simChatContainer.value) {
        simChatContainer.value.scrollTop = simChatContainer.value.scrollHeight
      }
    })
  }
}

const seleccionarOpcionSim = async (opcion: any) => {
  simMensaje.value = opcion.id
  await enviarSimulacion()
}

const seleccionarBotonSim = async (boton: any) => {
  simMensaje.value = boton.id
  await enviarSimulacion()
}

const limpiarSimulador = async () => {
  if (!confirm('¿Eliminar todos los mensajes y conversaciones de este teléfono del simulador?')) return

  try {
    await $fetch('/api/admin/whatsapp-limpiar', {
      method: 'POST',
      body: { telefono: simTelefono.value },
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    simChat.value = []
    simConversacion.value = null
  } catch (e) {
    console.error('Error limpiando:', e)
  }
}

const limpiarChatSim = () => {
  simChat.value = []
  simConversacion.value = null
}

const cargarTemplate = (tipo: string) => {
  if (tipo === 'solicitud') {
    simMensaje.value = `Hola MediProtect, soy Ana Martinez Diaz y solicito una cita con el médico raul-payan-naude. 📧 Email: ana.test@mediprotect.com.mx 📱 Teléfono: 2224445566 🆔 ID: 428d1726-b0de-46cc-8895-5397fb0e0c9c Por favor, confirmen disponibilidad.`
  } else if (tipo === 'info') {
    simMensaje.value = 'Hola, me gustaría saber información sobre los servicios de MediProtect'
  } else if (tipo === 'asesor') {
    simMensaje.value = 'Necesito hablar con un asesor por favor'
  }
}

onMounted(() => {
  buscarConversaciones()
  cargarConfiguracionWhatsApp()
})

const gatewayUrlWhatsApp = ref('')
const instanceNameWhatsApp = ref('')
const apikeyWhatsApp = ref('')
const cargarConfiguracionWhatsApp = async () => {
  try {
    const data: any = await $fetch('/api/admin/whatsapp-config', {
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    gatewayUrlWhatsApp.value = data.config.gatewayUrl || ''
    instanceNameWhatsApp.value = data.config.instanceName || ''
    apikeyWhatsApp.value = data.config.apiKey || ''
    console.log('Config WhatsApp cargada:', { gatewayUrl: gatewayUrlWhatsApp.value, instance: instanceNameWhatsApp.value })
  } catch (e: any) {
    console.error('Error cargando config WhatsApp:', e)
    gatewayUrlWhatsApp.value = 'http://127.0.0.1:8080'
  }
}

const actualizarConfiguracionWhatsApp = async (gatewayUrl: string, instanceName: string, apiKey: string) => {
  try {
    await $fetch('/api/admin/whatsapp-config', {
      method: 'POST',
      body: { gatewayUrl, instanceName, apiKey },
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    gatewayUrlWhatsApp.value = gatewayUrl
    instanceNameWhatsApp.value = instanceName
    apikeyWhatsApp.value = apiKey
    console.log('Config WhatsApp actualizada exitosamente')
  } catch (e: any) {
    console.error('Error actualizando config WhatsApp:', e)
    throw e
  }
}

const guardandoConfig = ref(false)
const errorConfig = ref('')
const exitoConfig = ref('')

const guardarConfiguracionWhatsApp = async () => {
  errorConfig.value = ''
  exitoConfig.value = ''

  const gatewayUrl = gatewayUrlWhatsApp.value.trim()
  const instanceName = instanceNameWhatsApp.value.trim()
  const apiKey = apikeyWhatsApp.value.trim()

  if (!gatewayUrl) {
    errorConfig.value = 'Ingresa la URL de la pasarela Evolution API (ej. http://127.0.0.1:8080).'
    return
  }
  if (!gatewayUrl.startsWith('http://') && !gatewayUrl.startsWith('https://')) {
    errorConfig.value = 'La URL de la pasarela debe comenzar con http:// o https://.'
    return
  }
  if (!instanceName) {
    errorConfig.value = 'Ingresa el nombre de la instancia en Evolution API.'
    return
  }

  guardandoConfig.value = true
  try {
    await actualizarConfiguracionWhatsApp(gatewayUrl, instanceName, apiKey)
    exitoConfig.value = 'Configuración guardada correctamente.'
  } catch (e: any) {
    errorConfig.value = e.data?.message || e.message || 'Error al guardar la configuración.'
  } finally {
    guardandoConfig.value = false
  }
}

const abrirVincular = async () => {
  tabActiva.value = 'vincular'
  try {
    const data: any = await $fetch('/api/admin/whatsapp-vincular', {
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    estadoInstancia.value = data.state || 'close'
    qrBase64.value = data.base64 || ''
  } catch (e: any) {
    estadoMensaje.value = e.data?.message || e.message || 'Error al verificar el estado de la instancia.'
  }
}

const vinculando = ref(false)
const desconectando = ref(false)
const configurandoWebhook = ref(false)
const qrBase64 = ref('')
const estadoInstancia = ref('')
const estadoMensaje = ref('')
const estadoExito = ref('')
let pollTimer: any = null

const urlWebhook = computed(() => {
  if (import.meta.client) return `${window.location.origin}/whook/wame`
  return '/whook/wame'
})

const conectarInstancia = async () => {
  estadoMensaje.value = ''
  estadoExito.value = ''
  vinculando.value = true
  qrBase64.value = ''
  try {
    const data: any = await $fetch('/api/admin/whatsapp-vincular', {
      method: 'POST',
      body: { action: 'connect' },
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    estadoInstancia.value = data.state || 'close'
    qrBase64.value = data.base64 || ''
    if (estadoInstancia.value === 'open') {
      estadoExito.value = 'Número conectado correctamente.'
    } else {
      iniciarPollEstado()
    }
  } catch (e: any) {
    estadoMensaje.value = e.data?.message || e.message || 'Error al conectar la instancia.'
  } finally {
    vinculando.value = false
  }
}

const desconectarInstancia = async () => {
  estadoMensaje.value = ''
  estadoExito.value = ''
  desconectando.value = true
  try {
    await $fetch('/api/admin/whatsapp-vincular', {
      method: 'POST',
      body: { action: 'logout' },
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    estadoInstancia.value = 'close'
    qrBase64.value = ''
    estadoExito.value = 'Instancia desconectada.'
    detenerPollEstado()
  } catch (e: any) {
    estadoMensaje.value = e.data?.message || e.message || 'Error al desconectar la instancia.'
  } finally {
    desconectando.value = false
  }
}

const iniciarPollEstado = () => {
  detenerPollEstado()
  pollTimer = setInterval(async () => {
    try {
      const data: any = await $fetch('/api/admin/whatsapp-vincular', {
        headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
      })
      estadoInstancia.value = data.state || 'close'
      if (estadoInstancia.value === 'open') {
        qrBase64.value = ''
        estadoExito.value = 'Número conectado correctamente.'
        detenerPollEstado()
      } else {
        qrBase64.value = data.base64 || ''
        if (estadoExito.value !== 'Número conectado correctamente.') estadoExito.value = ''
      }
    } catch (e: any) {}
  }, 5000)
}

const detenerPollEstado = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const configurarWebhook = async () => {
  estadoMensaje.value = ''
  estadoExito.value = ''
  configurandoWebhook.value = true
  try {
    const data: any = await $fetch('/api/admin/whatsapp-webhook', {
      method: 'POST',
      body: {},
      headers: { Authorization: `Bearer ${useCookie('admin_token').value}` }
    })
    estadoExito.value = data.secreto
      ? 'Webhook configurado correctamente.'
      : 'Webhook configurado. Aviso: WHATSAPP_WEBHOOK_APIKEY no está definido en el entorno; revisa la guía de despliegue.'
  } catch (e: any) {
    estadoMensaje.value = e.data?.message || e.message || 'Error al configurar el webhook.'
  } finally {
    configurandoWebhook.value = false
  }
}

onUnmounted(detenerPollEstado)

const resetearConfiguracion = async () => {
  errorConfig.value = ''
  exitoConfig.value = ''
  gatewayUrlWhatsApp.value = 'http://127.0.0.1:8080'
  instanceNameWhatsApp.value = ''
  apikeyWhatsApp.value = ''

  guardandoConfig.value = true
  try {
    await actualizarConfiguracionWhatsApp('http://127.0.0.1:8080', '', '')
    exitoConfig.value = 'Configuración restablecida a los valores por defecto.'
  } catch (e: any) {
    errorConfig.value = e.data?.message || e.message || 'Error al restablecer la configuración.'
  } finally {
    guardandoConfig.value = false
  }
}
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; display: flex; flex-direction: column; padding: 1.5rem 1rem; position: fixed; height: 100vh; }
.sidebar-brand h2 { font-size: 1.3rem; margin-bottom: 0.25rem; }
.role-badge { font-size: 0.75rem; color: #00b894; text-transform: uppercase; letter-spacing: 0.5px; }
nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; margin-top: 1.5rem; }
.nav-link { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: all 0.2s; }
.nav-link:hover { background: rgba(255,255,255,0.1); }
.nav-link.active { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid rgba(255,255,255,0.2); color: #dfe6e9; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-top: auto; }
.btn-logout:hover { background: rgba(255,255,255,0.1); }
.admin-content { flex: 1; margin-left: 240px; padding: 2rem; background: #f5f6fa; min-height: 100vh; }
.content-header { margin-bottom: 2rem; }
.content-header h1 { font-size: 1.8rem; color: #2d3436; margin-bottom: 0.25rem; }
.content-header p { color: #636e72; }

.tabs-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0; }
.tab-btn { padding: 0.75rem 1.5rem; border: none; background: none; font-size: 0.95rem; color: #636e72; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab-btn:hover { color: #2d3436; }
.tab-btn.active { color: #00b894; border-bottom-color: #00b894; font-weight: 600; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
.stat-icon { font-size: 2rem; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #2d3436; }
.stat-label { font-size: 0.8rem; color: #636e72; }

.filters-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; }
.filter-input { padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; flex: 1; max-width: 300px; }
.filter-select { padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
.btn-refresh { background: #00b894; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.btn-refresh:hover { background: #00a884; }

.conversaciones-panel { display: grid; grid-template-columns: 380px 1fr; gap: 0; background: white; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; min-height: 500px; }

.conversaciones-list { border-right: 1px solid #e0e0e0; overflow-y: auto; max-height: 600px; }
.conv-item { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
.conv-item:hover { background: #f8f9fa; }
.conv-item.active { background: #e8f5e9; border-left: 3px solid #00b894; }
.conv-avatar { width: 42px; height: 42px; border-radius: 50%; background: #00b894; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem; flex-shrink: 0; }
.conv-info { flex: 1; min-width: 0; }
.conv-name { font-weight: 600; font-size: 0.9rem; color: #2d3436; }
.conv-phone { font-size: 0.8rem; color: #636e72; font-family: monospace; }
.conv-state { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
.state-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; }
.state-success { background: #e8f5e9; color: #2e7d32; }
.state-new { background: #e3f2fd; color: #1565c0; }
.state-progress { background: #fff3e0; color: #e65100; }
.state-waiting { background: #fce4ec; color: #c62828; }
.state-default { background: #f5f5f5; color: #636e72; }
.conv-msgs { font-size: 0.75rem; color: #b2bec3; }
.conv-time { font-size: 0.75rem; color: #b2bec3; white-space: nowrap; }

.conv-detail { display: flex; flex-direction: column; }
.detail-header { padding: 1rem 1.25rem; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 1rem; }
.detail-header h3 { margin: 0; font-size: 1rem; }
.conv-phone-detail { font-size: 0.8rem; color: #636e72; font-family: monospace; }

.mensajes-container { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; max-height: 480px; }
.msg-item { display: flex; gap: 0.5rem; max-width: 80%; }
.msg-in { align-self: flex-start; }
.msg-out { align-self: flex-end; flex-direction: row-reverse; }
.msg-direction { font-size: 0.8rem; }
.msg-content { background: #f0f0f0; padding: 0.5rem 0.75rem; border-radius: 12px; }
.msg-out .msg-content { background: #dcf8c6; }
.msg-text { font-size: 0.85rem; color: #2d3436; white-space: pre-wrap; word-break: break-word; }
.msg-meta { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.25rem; }
.msg-type { font-size: 0.65rem; color: #b2bec3; text-transform: uppercase; }
.msg-time { font-size: 0.65rem; color: #b2bec3; }

.loading { text-align: center; padding: 3rem; color: #636e72; }
.empty { text-align: center; padding: 3rem; color: #b2bec3; }
.empty-detail { display: flex; align-items: center; justify-content: center; }

.simulador-layout { display: grid; grid-template-columns: 400px 1fr; gap: 1.5rem; min-height: 600px; }
.sim-input-panel { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; }
.sim-input-panel h3 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #2d3436; }
.sim-desc { font-size: 0.85rem; color: #636e72; margin-bottom: 1.25rem; }
.sim-phone-row, .sim-msg-row { margin-bottom: 1rem; }
.sim-phone-row label, .sim-msg-row label { display: block; font-size: 0.85rem; font-weight: 600; color: #2d3436; margin-bottom: 0.35rem; }
.sim-phone-input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; font-family: monospace; }
.sim-msg-input { width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; resize: vertical; font-family: inherit; }
.sim-actions { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
.btn-simular { flex: 1; background: #00b894; color: white; border: none; padding: 0.75rem; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-simular:hover { background: #00a884; }
.btn-simular:disabled { background: #b2bec3; cursor: not-allowed; }
.btn-limpiar-sim { background: #ff7675; color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
.btn-limpiar-sim:hover { background: #d63031; }

.sim-templates { margin-bottom: 1.25rem; }
.sim-templates h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #636e72; }
.btn-template { display: block; width: 100%; text-align: left; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #2d3436; cursor: pointer; margin-bottom: 0.35rem; transition: background 0.15s; }
.btn-template:hover { background: #e8f5e9; border-color: #00b894; }

.sim-estado { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
.sim-estado h4 { margin: 0 0 0.5rem; font-size: 0.85rem; color: #636e72; }
.estado-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; font-size: 0.85rem; }
.estado-label { font-weight: 600; color: #636e72; min-width: 70px; }

.sim-chat-panel { background: white; border: 1px solid #e0e0e0; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.sim-chat-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #f0f0f0; }
.sim-chat-header h3 { margin: 0; font-size: 1rem; }
.btn-clear-chat { background: none; border: 1px solid #e0e0e0; color: #636e72; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
.btn-clear-chat:hover { background: #f5f5f5; }

.sim-chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; max-height: 550px; background: #f0f2f5; }
.sim-chat-empty { text-align: center; padding: 3rem 1rem; color: #636e72; }
.sim-chat-empty p { margin: 0 0 0.5rem; font-size: 1rem; }
.sim-chat-hint { font-size: 0.85rem; color: #b2bec3; }

.sim-msg { display: flex; gap: 0.5rem; max-width: 85%; }
.sim-msg-in { align-self: flex-start; }
.sim-msg-out { align-self: flex-end; flex-direction: row-reverse; }
.sim-msg-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
.sim-msg-out .sim-msg-avatar { background: #dcf8c6; }
.sim-msg-bubble { background: white; padding: 0.75rem 1rem; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.sim-msg-in .sim-msg-bubble { border-top-left-radius: 4px; }
.sim-msg-out .sim-msg-bubble { border-top-right-radius: 4px; background: #dcf8c6; }
.sim-msg-text { font-size: 0.9rem; color: #2d3436; line-height: 1.4; }
.sim-msg-time { font-size: 0.65rem; color: #b2bec3; margin-top: 0.25rem; text-align: right; }

.sim-msg-opciones { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.75rem; }
.btn-opcion-sim { display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: #2d3436; cursor: pointer; transition: all 0.15s; }
.btn-opcion-sim:hover { background: #e8f5e9; border-color: #00b894; }
.opcion-desc { font-size: 0.75rem; color: #636e72; }

.sim-msg-botones { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.btn-boton-sim { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: background 0.15s; }
.btn-boton-sim:hover { background: #00a884; }

.sim-typing { display: flex; gap: 4px; padding: 0.75rem 1rem; align-items: center; }
.sim-typing span { width: 8px; height: 8px; border-radius: 50%; background: #b2bec3; animation: typing 1.4s infinite; }
.sim-typing span:nth-child(2) { animation-delay: 0.2s; }
.sim-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }

.sim-typing { display: flex; gap: 4px; padding: 0.75rem 1rem; align-items: center; }
.sim-typing span { width: 8px; height: 8px; border-radius: 50%; background: #b2bec3; animation: typing 1.4s infinite; }
.sim-typing span:nth-child(2) { animation-delay: 0.2s; }
.sim-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }

/* Vinculación WhatsApp */
.vinculacion-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 2rem; max-width: 640px; margin: 0 auto; }
.vinculacion-card h3 { margin: 0 0 0.5rem; color: #2d3436; }
.vinculacion-actions { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
.vinculacion-webhook { margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid #f0f0f0; }
.vinculacion-webhook .config-desc { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.estado-conectado { margin-top: 1rem; font-weight: 700; color: #2e7d32; font-size: 1rem; }
.qr-container { margin-top: 1.5rem; text-align: center; }
.qr-img { width: 260px; height: 260px; border: 2px solid #e0e0e0; border-radius: 12px; padding: 0.5rem; background: white; }
.cargando { margin-top: 1rem; color: #636e72; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .conversaciones-panel { grid-template-columns: 1fr; }
  .conv-detail { display: none; }
  .simulador-layout { grid-template-columns: 1fr; }
}

/* Configuración WhatsApp */
.config-layout { max-width: 800px; margin: 0 auto; padding: 2rem; }
.config-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 2rem; max-width: 600px; margin: 0 auto; }
.config-desc { color: #636e72; font-size: 0.9rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #f0f0f0; }
.config-row { margin-bottom: 1.5rem; }
.config-row label { display: block; font-weight: 600; color: #2d3436; margin-bottom: 0.5rem; font-size: 0.9rem; }
.config-row select, .config-row input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; font-family: inherit; box-sizing: border-box; }
.config-row input[type="password"] { background: #f8f9fa; }
.config-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
.btn-save-config { background: #00b894; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-save-config:hover { background: #00a884; }
.btn-save-config:disabled { background: #b2bec3; cursor: not-allowed; }
.btn-reset-config { background: #ff7675; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
.btn-reset-config:hover { background: #d63031; }
.config-info { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; }
.config-info h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #636e72; }
.config-info p { margin: 0.25rem 0; font-size: 0.85rem; color: #636e72; }
.config-error { background: #ffe0e0; color: #d63031; padding: 0.75rem; border-radius: 8px; margin-top: 1rem; text-align: center; }
.config-exito { background: #e0ffe0; color: #2e7d32; padding: 0.75rem; border-radius: 8px; margin-top: 1rem; text-align: center; }

@media (max-width: 768px) {
  .config-layout { padding: 1rem; }
  .config-card { padding: 1rem; }
  .config-actions { flex-direction: column; gap: 0.5rem; align-items: stretch; }
  .btn-save-config, .btn-reset-config { width: 100%; }
}
</style>
