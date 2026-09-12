import { ref, onMounted, onUnmounted } from 'vue'

const socket = ref<any>(null)
const connected = ref(false)
const notificaciones = ref<any[]>([])
let initialized = false

export function useSocket() {
  const config = useRuntimeConfig()

  function init() {
    if (initialized || !import.meta.client) return
    initialized = true

    const authData = localStorage.getItem('mediprotect_auth')
    if (!authData) return

    try {
      const parsed = JSON.parse(authData)
      const token = parsed.token
      const tipo = parsed.tipo || parsed.usuario?.tipo || ''

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
    } catch {}
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
