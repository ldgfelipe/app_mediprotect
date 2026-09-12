import jwt from 'jsonwebtoken'
import { defineWebSocketHandler } from 'h3'
import { peers, rooms } from '../utils/ws-peers'

const JWT_SECRET = process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'

function joinRoom(peer: any, room: string) {
  peer.subscribe(room)
  if (!rooms.has(room)) rooms.set(room, new Set())
  rooms.get(room)!.add(peer.id)
}

function leaveAllRooms(peer: any) {
  for (const [room, peerIds] of rooms) {
    if (peerIds.has(peer.id)) {
      peerIds.delete(peer.id)
      peer.unsubscribe(room)
      if (peerIds.size === 0) rooms.delete(room)
    }
  }
}

export default defineWebSocketHandler({
  open(peer) {
    peers.set(peer.id, peer)
  },

  message(peer, message) {
    try {
      const data = JSON.parse(typeof message === 'string' ? message : message.text())

      if (data.type === 'auth') {
        const decoded = jwt.verify(data.token, JWT_SECRET) as any
        const ctx = { userId: decoded.id, tipo: decoded.tipo?.toLowerCase() }
        peer.ctx = ctx

        if (ctx.tipo === 'admin') joinRoom(peer, 'admins')
        if (ctx.tipo === 'asistente') joinRoom(peer, 'asistentes')
        if (ctx.tipo === 'paciente') joinRoom(peer, `paciente:${ctx.userId}`)
        if (ctx.tipo === 'medico') joinRoom(peer, `medico:${ctx.userId}`)

        peer.send(JSON.stringify({ type: 'connected', userId: ctx.userId, tipo: ctx.tipo }))
      }
    } catch {
      peer.close(1008, 'Token inválido')
    }
  },

  close(peer) {
    leaveAllRooms(peer)
    peers.delete(peer.id)
  },
})
