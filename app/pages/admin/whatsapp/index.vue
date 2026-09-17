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
        <p>Monitoreo de conversaciones y flujo de citas por WhatsApp</p>
      </header>

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
          <option value="seleccionando_especialidad">Seleccionando especialidad</option>
          <option value="seleccionando_doctor">Seleccionando doctor</option>
          <option value="seleccionando_fecha">Seleccionando fecha</option>
          <option value="seleccionando_hora">Seleccionando hora</option>
          <option value="confirmacion_paciente">Confirmación paciente</option>
          <option value="cita_creada">Cita creada</option>
          <option value="esperando_asesor">Esperando asesor</option>
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
    </main>
  </div>
</template>

<script setup lang="ts">
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
  return 'state-default'
}

const getEstadoLabel = (estado: string) => {
  const labels: Record<string, string> = {
    bienvenida: 'Nuevo',
    menu_principal: 'Menú',
    seleccionando_especialidad: 'Especialidad',
    seleccionando_doctor: 'Doctor',
    seleccionando_fecha: 'Fecha',
    seleccionando_hora: 'Hora',
    confirmacion_paciente: 'Confirmando',
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

const logout = () => {
  adminUsuario.value = null
  const token = useCookie('admin_token')
  token.value = null
  navigateTo('/admin/login')
}

onMounted(() => {
  buscarConversaciones()
})
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

@media (max-width: 768px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .conversaciones-panel { grid-template-columns: 1fr; }
  .conv-detail { display: none; }
}
</style>
