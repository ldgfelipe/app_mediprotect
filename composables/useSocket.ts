import { ref, onMounted } from 'vue'

const socket = ref<any>(null)
const connected = ref(false)
const notificaciones = ref<any[]>([])
let initialized = false

export function useSocket() {
  function init() {
    if (initialized || !import.meta.client) return
    initialized = true

    let token = ''
    let tipo = ''

    const tokenCookie = useCookie('token').value
    const adminTokenCookie = useCookie('admin_token').value
    const usuarioCookie = useCookie('usuario').value
    const adminUsuarioCookie = useCookie('admin_usuario').value
    const asistenteLocal = localStorage.getItem('usuario')

    if (adminTokenCookie) {
      token = adminTokenCookie
      tipo = adminUsuarioCookie?.tipo || 'admin'
    } else if (tokenCookie) {
      token = tokenCookie
      tipo = usuarioCookie?.tipo || 'paciente'
    } else if (asistenteLocal) {
      try {
        const parsed = JSON.parse(asistenteLocal)
        token = parsed.token || ''
        tipo = parsed.tipo || 'asistente'
      } catch {}
    }

    if (!token) return

    import('socket.io-client').then(({ io }) => {
      const wsUrl = window.location.origin
      socket.value = io(wsUrl, {
        auth: { token },
        path: '/ws',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 50,
      })

      socket.value.on('connect', () => {
        connected.value = true
      })

      socket.value.on('disconnect', () => {
        connected.value = false
      })

      socket.value.on('cita:created', (cita: any) => {
        addNotificacion({
          tipo: 'cita_created',
          titulo: 'Nueva cita',
          mensaje: `Cita creada: ${cita.paciente_nombre || 'Paciente'} - ${cita.medico_nombre || 'Médico por confirmar'}`,
          timestamp: new Date(),
          cita,
        })
      })

      socket.value.on('cita:updated', (cita: any) => {
        addNotificacion({
          tipo: 'cita_updated',
          titulo: 'Cita actualizada',
          mensaje: `Cita actualizada - Estado: ${cita.estado}`,
          timestamp: new Date(),
          cita,
        })
      })

      socket.value.on('cita:confirmed', (cita: any) => {
        addNotificacion({
          tipo: 'cita_confirmed',
          titulo: 'Cita confirmada',
          mensaje: `Cita confirmada: ${cita.paciente_nombre || 'Paciente'}`,
          timestamp: new Date(),
          cita,
        })
      })

      socket.value.on('cita:cancelled', (cita: any) => {
        addNotificacion({
          tipo: 'cita_cancelled',
          titulo: 'Cita cancelada',
          mensaje: `Cita cancelada: ${cita.paciente_nombre || 'Paciente'}`,
          timestamp: new Date(),
          cita,
        })
      })
    })
  }

  function addNotificacion(notif: any) {
    notificaciones.value.unshift(notif)
    if (notificaciones.value.length > 50) notificaciones.value.pop()
  }

  function clearNotificaciones() {
    notificaciones.value = []
  }

  onMounted(() => init())

  return {
    socket,
    connected,
    notificaciones,
    clearNotificaciones,
    addNotificacion,
  }
}
