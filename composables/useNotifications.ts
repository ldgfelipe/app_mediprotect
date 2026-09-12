import { ref } from 'vue'

export interface Notificacion {
  tipo: string
  titulo: string
  mensaje: string
  timestamp: Date
  leida?: boolean
  cita?: any
}

const notificaciones = ref<Notificacion[]>([])
const noLeidas = ref(0)

export function useNotifications() {
  function agregar(notif: Omit<Notificacion, 'leida'>) {
    const nueva: Notificacion = { ...notif, leida: false }
    notificaciones.value.unshift(nueva)
    noLeidas.value++
    if (notificaciones.value.length > 100) notificaciones.value.pop()
  }

  function marcarLeidas() {
    notificaciones.value.forEach((n) => (n.leida = true))
    noLeidas.value = 0
  }

  function marcarUnaLeida(index: number) {
    if (notificaciones.value[index] && !notificaciones.value[index].leida) {
      notificaciones.value[index].leida = true
      noLeidas.value = Math.max(0, noLeidas.value - 1)
    }
  }

  function limpiar() {
    notificaciones.value = []
    noLeidas.value = 0
  }

  return {
    notificaciones,
    noLeidas,
    agregar,
    marcarLeidas,
    marcarUnaLeida,
    limpiar,
  }
}
