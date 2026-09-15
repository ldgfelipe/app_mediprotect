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

  console.log(`[Emit] ${evento} → rooms:`, targetRooms)
  console.log(`[Emit] Rooms disponibles:`, Array.from(rooms.keys()))
  console.log(`[Emit] Peers totales:`, peers.size)

  const sentTo = new Set<string>()

  for (const room of targetRooms) {
    const peerIds = rooms.get(room)
    if (!peerIds || peerIds.size === 0) {
      console.log(`[Emit] Room "${room}" vacío o no existe`)
      continue
    }

    console.log(`[Emit] Room "${room}" tiene ${peerIds.size} peers:`, Array.from(peerIds))

    for (const peerId of peerIds) {
      if (sentTo.has(peerId)) continue
      sentTo.add(peerId)
      const peer = peers.get(peerId)
      if (peer) {
        try {
          peer.send(message)
          console.log(`[Emit] ✅ Enviado a peer ${peerId}`)
        } catch (e) {
          console.log(`[Emit] ❌ Error enviando a peer ${peerId}:`, e)
        }
      } else {
        console.log(`[Emit] ⚠️ Peer ${peerId} no encontrado en peers Map`)
      }
    }
  }

  if (sentTo.size === 0) {
    console.log(`[Emit] ⚠️ No se envió a ningún peer para evento ${evento}`)
  }
}
