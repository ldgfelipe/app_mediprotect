import { useSocket } from '~/composables/useSocket'
import { useNotifications } from '~/composables/useNotifications'

const labels: Record<string, string> = {
  pendiente: 'Pendiente',
  PENDIENTE_DE_COORDINACION: 'Pendiente por coordinar',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  paciente_llego: 'Paciente lleg\u00f3',
  en_atencion: 'En atenci\u00f3n',
  asistida: 'Asistida',
  no_asistida: 'No asistida',
}

export function useSocketNotifications() {
  if (!import.meta.client) return

  const { on, onReconnect } = useSocket()
  const { agregar } = useNotifications()

  console.log('[Notif] Registrando handlers de eventos WebSocket...')

  on('cita:created', (data: any) => {
    console.log('[Notif] Nueva cita recibida:', data)
    agregar({
      tipo: 'cita:created',
      titulo: 'Nueva cita',
      mensaje: `${data.paciente_nombre || 'Paciente'} \u2192 ${data.medico_nombre || 'Sin m\u00e9dico'} \u2014 ${labels[data.estado] || data.estado}`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('cita:confirmed', (data: any) => {
    console.log('[Notif] Cita confirmada:', data)
    agregar({
      tipo: 'cita:confirmed',
      titulo: 'Cita confirmada',
      mensaje: `${data.paciente_nombre || 'Paciente'} \u2014 ${data.medico_nombre || ''} \u2014 Confirmada`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('cita:cancelled', (data: any) => {
    console.log('[Notif] Cita cancelada:', data)
    agregar({
      tipo: 'cita:cancelled',
      titulo: 'Cita cancelada',
      mensaje: `${data.paciente_nombre || 'Paciente'} \u2014 Cancelada`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('cita:updated', (data: any) => {
    console.log('[Notif] Cita actualizada:', data)
    agregar({
      tipo: 'cita:updated',
      titulo: 'Cita actualizada',
      mensaje: `${data.paciente_nombre || 'Paciente'} \u2014 ${labels[data.estado] || data.estado}`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('paciente:created', (data: any) => {
    console.log('[Notif] Paciente registrado:', data)
    agregar({
      tipo: 'paciente:created',
      titulo: 'Nuevo paciente',
      mensaje: `${data.nombre || ''} ${data.apellido || ''}`,
      timestamp: new Date(),
    })
  })

  on('medico:created', (data: any) => {
    console.log('[Notif] M\u00e9dico registrado:', data)
    agregar({
      tipo: 'medico:created',
      titulo: 'Nuevo m\u00e9dico',
      mensaje: `${data.nombre || ''} ${data.apellido || ''}`,
      timestamp: new Date(),
    })
  })

  console.log('[Notif] Handlers registrados')
}
