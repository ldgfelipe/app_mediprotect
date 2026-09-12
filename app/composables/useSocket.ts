import { ref, onMounted, onUnmounted } from 'vue'

const socket = ref<WebSocket | null>(null)
const connected = ref(false)
let initialized = false
let reconnectTimer: any = null
let eventHandlers: Record<string, Function[]> = {}

function getToken(): string {
  if (!import.meta.client) return ''

  const adminToken = useCookie('admin_token').value
  if (adminToken) return adminToken

  const token = useCookie('token').value
  if (token) return token

  const asistenteLocal = localStorage.getItem('usuario')
  if (asistenteLocal) {
    try {
      const parsed = JSON.parse(asistenteLocal)
      if (parsed.token) return parsed.token
    } catch {}
  }

  return ''
}

function getTipo(): string {
  if (!import.meta.client) return ''

  const adminToken = useCookie('admin_token').value
  if (adminToken) return 'admin'

  const usuarioCookie = useCookie('usuario').value
  if (usuarioCookie?.tipo) return usuarioCookie.tipo

  const token = useCookie('token').value
  if (token) return 'paciente'

  const asistenteLocal = localStorage.getItem('usuario')
  if (asistenteLocal) {
    try {
      const parsed = JSON.parse(asistenteLocal)
      if (parsed.tipo) return parsed.tipo
    } catch {}
  }

  return 'paciente'
}

function connect() {
  if (!import.meta.client || initialized) return
  const token = getToken()
  if (!token) return
  initialized = true

  doConnect(token)
}

function doConnect(token: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws`

  const ws = new WebSocket(wsUrl)
  socket.value = ws

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', token }))
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)

      if (msg.type === 'connected') {
        connected.value = true
        return
      }

      if (msg.type && eventHandlers[msg.type]) {
        for (const handler of eventHandlers[msg.type]) {
          handler(msg.data)
        }
      }
    } catch {}
  }

  ws.onclose = () => {
    connected.value = false
    socket.value = null
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      initialized = false
      connect()
    }, 3000)
  }

  ws.onerror = () => {
    ws.close()
  }
}

function on(event: string, handler: Function) {
  if (!eventHandlers[event]) eventHandlers[event] = []
  eventHandlers[event].push(handler)
}

function off(event: string, handler: Function) {
  if (eventHandlers[event]) {
    eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
  }
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (socket.value) {
    socket.value.close()
    socket.value = null
  }
  connected.value = false
  initialized = false
  eventHandlers = {}
}

export function useSocket() {
  onMounted(() => connect())
  onUnmounted(() => {})

  return {
    socket,
    connected,
    on,
    off,
    disconnect,
  }
}
