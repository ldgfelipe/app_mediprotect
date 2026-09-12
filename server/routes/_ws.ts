import jwt from 'jsonwebtoken'
import { defineWebSocketHandler } from 'h3'
import { peers, rooms } from '../utils/ws-peers'

const JWT_SECRET = process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'

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

        if (ctx.tipo === 'admin') peer.join('admins')
        if (ctx.tipo === 'asistente') peer.join('asistentes')
        if (ctx.tipo === 'paciente') peer.join(`paciente:${ctx.userId}`)
        if (ctx.tipo === 'medico') peer.join(`medico:${ctx.userId}`)

        peer.send(JSON.stringify({ type: 'connected', userId: ctx.userId, tipo: ctx.tipo }))
      }
    } catch {
      peer.close(1008, 'Token inválido')
    }
  },

  close(peer) {
    for (const [room, peerIds] of rooms) {
      peerIds.delete(peer.id)
      if (peerIds.size === 0) rooms.delete(room)
    }
    peers.delete(peer.id)
  },
})
