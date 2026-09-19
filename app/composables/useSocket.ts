import { ref, onMounted, onUnmounted, watch } from 'vue'

const socket = ref<WebSocket | null>(null)
const connected = ref(false)
let initialized = false
let reconnectTimer: any = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
let eventHandlers: Record<string, Function[]> = {}
let reconnectionHandlers: Function[] = []

function getToken(): string {
  if (!import.meta.client) return ''
  const adminToken = useCookie('admin_token').value
  if (adminToken) return adminToken
  const token = useCookie('token').value
  if (token) return token
  const asistenteLocal = localStorage.getItem('usuario')
  if (asistenteLocal) {
    try { return JSON.parse(asistenteLocal).token || '' } catch {}
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
    try { return JSON.parse(asistenteLocal).tipo || 'paciente' } catch {}
  }
  return 'paciente'
}

function connect() {
  if (!import.meta.client) return
  if (initialized && socket.value && socket.value.readyState <= 1) {
    return
  }
  const token = getToken()
  if (!token) {
    console.log('[WS] No hay token, esperando...')
    return
  }
  console.log('[WS] Conectando...', { tipo: getTipo() })
  initialized = true
  doConnect(token)
}

function doConnect(token: string) {
  if (socket.value) {
    try { socket.value.close() } catch {}
    socket.value = null
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws`
  console.log('[WS] URL:', wsUrl)

  const ws = new WebSocket(wsUrl)
  socket.value = ws

  ws.onopen = () => {
    console.log('[WS] Conexión abierta, enviando auth...')
    ws.send(JSON.stringify({ type: 'auth', token }))
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      console.log('[WS] Mensaje:', msg.type)

      if (msg.type === 'connected') {
        connected.value = true
        reconnectAttempts = 0
        console.log('[WS] ✅ Autenticado como', msg.tipo, 'id:', msg.userId)
        for (const handler of reconnectionHandlers) {
          try { handler() } catch {}
        }
        return
      }

      if (msg.type === 'error') {
        console.error('[WS] Error del servidor:', msg.message)
        return
      }

      if (msg.type && eventHandlers[msg.type]) {
        console.log(`[WS] Ejecutando ${eventHandlers[msg.type].length} handlers para "${msg.type}"`)
        for (const handler of eventHandlers[msg.type]) {
          handler(msg.data || msg)
        }
      }
    } catch (e) {
      console.error('[WS] Error parseando mensaje:', e)
    }
  }

  ws.onclose = (e) => {
    console.log('[WS] Conexión cerrada:', e.code, e.reason)
    connected.value = false
    socket.value = null
    initialized = false

    if (e.code === 1008) {
      console.log('[WS] Token inválido, no se reconecta automáticamente')
      return
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[WS] Máximo de reconexiones alcanzado')
      return
    }

    const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts), 30000)
    reconnectAttempts++
    console.log(`[WS] Reconectando en ${Math.round(delay)}ms (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  ws.onerror = (e) => {
    console.error('[WS] Error:', e)
  }
}

function on(event: string, handler: Function) {
  if (!eventHandlers[event]) eventHandlers[event] = []
  eventHandlers[event].push(handler)
}

function onReconnect(handler: Function) {
  reconnectionHandlers.push(handler)
}

function offReconnect(handler: Function) {
  reconnectionHandlers = reconnectionHandlers.filter(h => h !== handler)
}

function off(event: string, handler: Function) {
  if (eventHandlers[event]) {
    eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
  }
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (socket.value) { socket.value.close(); socket.value = null }
  connected.value = false
  initialized = false
}

export function useSocket() {
  const myHandlers: Array<{ event: string; handler: Function }> = []
  const myReconnectHandlers: Function[] = []

  function registerOn(event: string, handler: Function) {
    on(event, handler)
    myHandlers.push({ event, handler })
  }

  function registerOnReconnect(handler: Function) {
    onReconnect(handler)
    myReconnectHandlers.push(handler)
  }

  onMounted(() => {
    console.log('[WS] useSocket montado en', window.location.pathname)
    connect()

    const token = getToken()
    if (!token) {
      const adminToken = useCookie('admin_token')
      const userToken = useCookie('token')
      const stopWatch = watch([adminToken, userToken], () => {
        if (getToken()) {
          stopWatch()
          connect()
        }
      }, { immediate: false })
    }
  })

  onUnmounted(() => {
    for (const { event, handler } of myHandlers) {
      off(event, handler)
    }
    myHandlers.length = 0
    for (const handler of myReconnectHandlers) {
      offReconnect(handler)
    }
    myReconnectHandlers.length = 0
  })

  return { socket, connected, on: registerOn, off, disconnect, onReconnect: registerOnReconnect, offReconnect }
}
