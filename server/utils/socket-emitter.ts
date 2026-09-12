import { peers, rooms } from './ws-peers'

interface CitaEvento {
  id: string
  paciente_id?: string
  medico_id?: string | null
  [key: string]: any
}

export function emitCitaEvento(evento: string, payload: CitaEvento) {
  const message = JSON.stringify({ type: evento, data: payload })

  const targetRooms = ['admins', 'asistentes']
  if (payload.paciente_id) targetRooms.push(`paciente:${payload.paciente_id}`)
  if (payload.medico_id) targetRooms.push(`medico:${payload.medico_id}`)

  const sentTo = new Set<string>()

  for (const room of targetRooms) {
    const peerIds = rooms.get(room)
    if (!peerIds) continue

    for (const peerId of peerIds) {
      if (sentTo.has(peerId)) continue
      sentTo.add(peerId)
      const peer = peers.get(peerId)
      if (peer) {
        try { peer.send(message) } catch {}
      }
    }
  }
}
