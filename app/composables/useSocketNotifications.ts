import { useSocket } from '~/composables/useSocket'
import { useNotifications } from '~/composables/useNotifications'

const labels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  paciente_llego: 'Paciente llegó',
  en_atencion: 'En atención',
  asistida: 'Asistida',
  no_asistida: 'No asistida',
}

let registered = false

export function useSocketNotifications() {
  if (registered) return
  if (!import.meta.client) return

  const { on } = useSocket()
  const { agregar } = useNotifications()

  on('cita:created', (data: any) => {
    agregar({
      tipo: 'cita:created',
      titulo: 'Nueva cita',
      mensaje: `${data.paciente_nombre || 'Paciente'} → ${data.medico_nombre || 'Sin médico'} — ${labels[data.estado] || data.estado}`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('cita:confirmed', (data: any) => {
    agregar({
      tipo: 'cita:confirmed',
      titulo: 'Cita confirmada',
      mensaje: `${data.paciente_nombre || 'Paciente'} — ${data.medico_nombre || ''} — Estado: Confirmada`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('cita:cancelled', (data: any) => {
    agregar({
      tipo: 'cita:cancelled',
      titulo: 'Cita cancelada',
      mensaje: `${data.paciente_nombre || 'Paciente'} — Estado: Cancelada`,
      timestamp: new Date(),
      cita: data,
    })
  })

  on('cita:updated', (data: any) => {
    agregar({
      tipo: 'cita:updated',
      titulo: 'Cita actualizada',
      mensaje: `${data.paciente_nombre || 'Paciente'} — Estado: ${labels[data.estado] || data.estado}`,
      timestamp: new Date(),
      cita: data,
    })
  })

  registered = true
}
