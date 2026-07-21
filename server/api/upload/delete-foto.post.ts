import { verifyToken } from '../../utils/auth'
import { unlink } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const pool = getPool()
  
  if (!['medico', 'admin'].includes(decoded.tipo)) {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { medico_id } = body

  // Determinar ID del médico
  let targetMedicoId: string
  if (decoded.tipo === 'admin' && medico_id) {
    targetMedicoId = medico_id
  } else if (decoded.tipo === 'medico') {
    targetMedicoId = decoded.id
  } else {
    throw createError({ statusCode: 400, message: 'ID de médico requerido' })
  }

  // Obtener foto actual
  const result = await pool.query(
    'SELECT foto_url FROM medicos WHERE id = $1',
    [targetMedicoId]
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  const fotoUrl = result.rows[0].foto_url
  if (!fotoUrl) {
    return { success: true, message: 'No había foto para eliminar' }
  }

  // Eliminar archivo si es local
  if (fotoUrl.includes('/uploads/medicos/')) {
    const filename = fotoUrl.split('/uploads/medicos/')[1]
    if (filename) {
      const filepath = join(process.cwd(), 'public', 'uploads', 'medicos', filename)
      await unlink(filepath).catch(() => {})
    }
  }

  // Actualizar DB
  await pool.query(
    'UPDATE medicos SET foto_url = NULL WHERE id = $1',
    [targetMedicoId]
  )

  return { success: true, message: 'Foto eliminada correctamente' }
})