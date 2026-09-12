import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { defineNitroPlugin } from '#imports'

let io: Server | null = null

export function getIO(): Server | null {
  return io
}

export default defineNitroPlugin((nitroApp) => {
  const httpServer = nitroApp.h3App.nodeServer as any
  if (!httpServer) return

  io = new Server(httpServer, {
    cors: {
      origin: ['https://www.mediprotect.com.mx', 'https://mediprotect.com.mx', 'http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
    },
    path: '/ws',
    pingInterval: 25000,
    pingTimeout: 10000,
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      const secret = process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'
      const decoded = jwt.verify(token, secret) as any
      socket.data.userId = decoded.id
      socket.data.tipo = decoded.tipo
      socket.data.nombre = decoded.nombre || ''
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const tipo = socket.data.tipo?.toLowerCase()

    if (tipo === 'admin') socket.join('admins')
    if (tipo === 'asistente') socket.join('asistentes')
    if (tipo === 'paciente') socket.join(`paciente:${socket.data.userId}`)
    if (tipo === 'medico') socket.join(`medico:${socket.data.userId}`)

    socket.emit('connected', { id: socket.data.userId, tipo })
  })

  nitroApp.h3App.__socketio = io
})
