import jwt from 'jsonwebtoken'
import { defineWebSocketHandler } from 'h3'
import { peers, rooms } from '../utils/ws-peers'
import { jwtSecret } from '../utils/secrets'

const JWT_SECRET = jwtSecret()

function joinRoom(peer: any, room: string) {
  peer.subscribe(room)
  if (!rooms.has(room)) rooms.set(room, new Set())
  rooms.get(room)!.add(peer.id)
  console.log(`[WS] Peer ${peer.id} joined room "${room}"`)
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
    console.log(`[WS] Peer conectado: ${peer.id} (total: ${peers.size})`)
  },

  message(peer, message) {
    try {
      const raw = typeof message === 'string' ? message : message.text()
      const data = JSON.parse(raw)
      console.log(`[WS] Mensaje de ${peer.id}:`, data.type)

      if (data.type === 'auth') {
        if (!data.token) {
          console.log(`[WS] Peer ${peer.id}: token vacío, cerrando`)
          peer.close(1008, 'Token requerido')
          return
        }

        let decoded: any
        try {
          decoded = jwt.verify(data.token, JWT_SECRET)
        } catch (jwtErr: any) {
          console.log(`[WS] Peer ${peer.id}: JWT inválido:`, jwtErr.message)
          peer.close(1008, 'Token inválido')
          return
        }

        const tipo = (decoded.tipo || '').toLowerCase()
        const ctx = { userId: decoded.id, tipo }
        peer.ctx = ctx

        if (tipo === 'admin') joinRoom(peer, 'admins')
        else if (tipo === 'asistente') joinRoom(peer, 'asistentes')
        else if (tipo === 'paciente') joinRoom(peer, `paciente:${ctx.userId}`)
        else if (tipo === 'medico') joinRoom(peer, `medico:${ctx.userId}`)
        else {
          console.log(`[WS] Peer ${peer.id}: tipo desconocido "${tipo}", joined admins por defecto`)
          joinRoom(peer, 'admins')
        }

        const response = { type: 'connected', userId: ctx.userId, tipo: ctx.tipo }
        peer.send(JSON.stringify(response))
        console.log(`[WS] ✅ Peer ${peer.id} autenticado: tipo=${ctx.tipo} id=${ctx.userId}`)
      }
    } catch (err: any) {
      console.error(`[WS] Error procesando mensaje de ${peer.id}:`, err.message)
    }
  },

  close(peer, details) {
    console.log(`[WS] Peer desconectado: ${peer.id} (code: ${details?.code}, reason: ${details?.reason})`)
    leaveAllRooms(peer)
    peers.delete(peer.id)
  },

  error(peer, error) {
    console.error(`[WS] Error en peer ${peer.id}:`, error)
  },
})
