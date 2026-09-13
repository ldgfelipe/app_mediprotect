<template>
  <div v-if="isClient && wsDebugMode" class="ws-debug">
    <span class="ws-dot" :class="[wsConnected ? 'ws-on' : 'ws-off', flashing ? 'ws-flash' : '']"></span>
    <span class="ws-label">WS {{ wsConnected ? 'ON' : 'OFF' }}</span>
    <span v-if="noLeidas > 0" class="ws-notif-count">{{ noLeidas > 99 ? '99+' : noLeidas }}</span>
  </div>

  <div v-if="isAuthenticated" class="notif-bell-global" ref="bellRef">
    <button class="notif-bell-btn" @click="toggleDropdown">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="noLeidas > 0" class="notif-badge">{{ noLeidas > 99 ? '99+' : noLeidas }}</span>
    </button>
    <Transition name="dropdown">
      <div v-if="open" class="notif-dropdown">
        <div class="notif-header">
          <strong>Notificaciones</strong>
          <button v-if="notificaciones.length > 0" class="notif-clear" @click="marcarLeidas">Marcar leídas</button>
        </div>
        <div class="notif-list" v-if="notificaciones.length > 0">
          <div
            v-for="(n, i) in notificaciones.slice(0, 20)"
            :key="i"
            class="notif-item"
            :class="{ unread: !n.leida }"
            @click="handleClick(n, i)"
          >
            <div class="notif-icon" :class="iconClass(n.tipo)">
              {{ iconEmoji(n.tipo) }}
            </div>
            <div class="notif-content">
              <div class="notif-titulo">{{ n.titulo }}</div>
              <div class="notif-mensaje">{{ n.mensaje }}</div>
              <div class="notif-time">{{ timeAgo(n.timestamp) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="notif-empty">
          Sin notificaciones
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import { useSocket } from '~/composables/useSocket'

const { notificaciones, noLeidas, marcarLeidas, marcarUnaLeida } = useNotifications()
const { connected: wsConnected } = useSocket()
const open = ref(false)
const bellRef = ref(null)
const isClient = ref(false)
const flashing = ref(false)
let flashTimer = null

const isAuthenticated = computed(() => {
  if (!import.meta.client) return false
  return !!(useCookie('token').value || useCookie('admin_token').value || localStorage.getItem('usuario'))
})

const wsDebugMode = computed(() => {
  if (!import.meta.client) return false
  return localStorage.getItem('ws_debug') === 'true'
})

function triggerFlash() {
  flashing.value = true
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flashing.value = false }, 1500)
}

watch(noLeidas, () => { triggerFlash() })

function toggleDropdown() {
  open.value = !open.value
  if (open.value) marcarLeidas()
}

function handleClick(n, i) {
  marcarUnaLeida(i)
  if (n.cita) {
    open.value = false
    navigateTo('/mis-citas')
  }
}

function iconClass(tipo) {
  if (tipo.includes('confirmed')) return 'icon-success'
  if (tipo.includes('cancelled')) return 'icon-danger'
  if (tipo.includes('updated')) return 'icon-info'
  return 'icon-primary'
}

function iconEmoji(tipo) {
  if (tipo.includes('confirmed')) return '✓'
  if (tipo.includes('cancelled')) return '✕'
  if (tipo.includes('updated')) return '↻'
  return '+'
}

function timeAgo(date) {
  const now = new Date()
  const diff = Math.floor((now - new Date(date)) / 1000)
  if (diff < 60) return 'Ahora mismo'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return `Hace ${Math.floor(diff / 86400)}d`
}

function onClickOutside(e) {
  if (bellRef.value && !bellRef.value.contains(e.target)) open.value = false
}

onMounted(() => {
  isClient.value = true
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => { document.removeEventListener('click', onClickOutside) })
</script>

<style scoped>
.ws-debug {
  position: fixed; top: 12px; right: 24px; z-index: 99999;
  display: flex; align-items: center; gap: 6px;
  background: #2d3436; color: white; padding: 6px 12px; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600; font-family: monospace;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  transition: background 0.3s;
}
.ws-dot {
  width: 8px; height: 8px; border-radius: 50%;
  transition: background 0.3s, box-shadow 0.3s;
}
.ws-on { background: #00b894; box-shadow: 0 0 6px #00b894; }
.ws-off { background: #d63031; box-shadow: 0 0 6px #d63031; }
.ws-flash {
  background: #fdcb6e !important;
  box-shadow: 0 0 16px 4px #fdcb6e !important;
  animation: ws-pulse 0.3s ease 3;
}
@keyframes ws-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}
.ws-label { letter-spacing: 1px; }
.ws-notif-count {
  background: #d63031; color: white; padding: 1px 6px; border-radius: 8px;
  font-size: 0.7rem; margin-left: 4px;
}

.notif-bell-global {
  position: fixed; top: 12px; right: 120px; z-index: 9999;
}
.notif-bell-btn {
  background: white; border: 1.5px solid #e0e0e0; cursor: pointer; position: relative;
  padding: 0.5rem; border-radius: 10px; color: #636e72; transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.notif-bell-btn:hover { background: #f5f5f5; color: #2d3436; border-color: #ccc; }
.notif-badge {
  position: absolute; top: -4px; right: -4px; background: #d63031; color: white;
  font-size: 0.65rem; font-weight: 700; padding: 1px 5px; border-radius: 10px;
  min-width: 16px; text-align: center;
}
.notif-dropdown {
  position: absolute; top: 110%; right: 0; width: 360px; max-height: 420px;
  background: white; border-radius: 12px; border: 1px solid #eaeaea;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15); z-index: 10000; overflow: hidden;
}
.notif-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem; border-bottom: 1px solid #f0f0f0;
}
.notif-clear {
  background: none; border: none; color: #0984e3; font-size: 0.8rem;
  cursor: pointer; font-weight: 500;
}
.notif-list { max-height: 360px; overflow-y: auto; }
.notif-item {
  display: flex; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer;
  transition: background 0.15s; border-bottom: 1px solid #f8f8f8;
}
.notif-item:hover { background: #f8f9fa; }
.notif-item.unread { background: #f0f7ff; }
.notif-icon {
  width: 36px; height: 36px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;
  flex-shrink: 0;
}
.icon-primary { background: #dfe6e9; color: #2d3436; }
.icon-success { background: #d4edda; color: #00b894; }
.icon-danger { background: #ffd7d7; color: #d63031; }
.icon-info { background: #d6eaf8; color: #0984e3; }
.notif-content { flex: 1; min-width: 0; }
.notif-titulo { font-size: 0.85rem; font-weight: 600; color: #2d3436; }
.notif-mensaje { font-size: 0.8rem; color: #636e72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-time { font-size: 0.7rem; color: #b2bec3; margin-top: 2px; }
.notif-empty { padding: 2rem; text-align: center; color: #b2bec3; font-size: 0.9rem; }
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 480px) {
  .notif-bell-global { top: 8px; right: 100px; }
  .notif-dropdown { width: calc(100vw - 2rem); right: -1rem; }
}
</style>
