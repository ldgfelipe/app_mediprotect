import type { Server } from 'socket.io'
import { getIO } from '../plugins/websocket'

interface CitaEvento {
  id: string
  paciente_id?: string
  medico_id?: string | null
  [key: string]: any
}

export function emitCitaEvento(evento: string, payload: CitaEvento) {
  const io = getIO()
  if (!io) return

  io.to('admins').to('asistentes').emit(evento, payload)
  if (payload.paciente_id) io.to(`paciente:${payload.paciente_id}`).emit(evento, payload)
  if (payload.medico_id) io.to(`medico:${payload.medico_id}`).emit(evento, payload)
}
