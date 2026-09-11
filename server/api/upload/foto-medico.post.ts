import { verifyToken } from '../../utils/auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const pool = await useDbPool(event)
  
  // Solo médicos y admin pueden subir fotos
  if (!['medico', 'admin'].includes(decoded.tipo)) {
    throw createError({ statusCode: 403, message: 'No autorizado para subir fotos' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No se envió ningún archivo' })
  }

  const file = formData.find(f => f.name === 'foto')
  const medicoId = formData.find(f => f.name === 'medico_id')

  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Campo "foto" requerido' })
  }

  // Determinar ID del médico
  let targetMedicoId: string
  if (decoded.tipo === 'admin' && medicoId?.data) {
    targetMedicoId = medicoId.data.toString()
  } else if (decoded.tipo === 'medico') {
    targetMedicoId = decoded.id
  } else {
    throw createError({ statusCode: 400, message: 'ID de médico requerido' })
  }

  // Validar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const fileType = file.type || 'application/octet-stream'
  if (!allowedTypes.includes(fileType)) {
    throw createError({ statusCode: 400, message: 'Solo se permiten archivos JPG, PNG o WebP' })
  }

  // Validar tamaño (máximo 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.data.length > maxSize) {
    throw createError({ statusCode: 400, message: `La imagen pesa ${(file.data.length / 1024 / 1024).toFixed(1)}MB. El maximo permitido es 2MB. Intenta con una imagen de menor tamano o comprimela.` })
  }

  // Validar dimensiones mínimas (200x200)
  // Nota: para validación de dimensiones necesitaríamos sharp o similar
  // Por ahora validamos tamaño mínimo razonable
  if (file.data.length < 10000) {
    throw createError({ statusCode: 400, message: `La imagen es demasiado pequena (${(file.data.length / 1024).toFixed(1)}KB). El minimo permitido es 10KB. Verifica que la imagen tenga buena resolucion y no este recortada excesivamente.` })
  }

  // Crear directorio de uploads si no existe
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'medicos')
  await mkdir(uploadDir, { recursive: true })

  // Generar nombre único
  const ext = file.filename?.split('.').pop() || 'jpg'
  const filename = `${randomUUID()}.${ext}`
  const filepath = join(uploadDir, filename)

  // Guardar archivo
  await writeFile(filepath, file.data)

  // Construir URL pública
  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const photoUrl = `${baseUrl}/uploads/medicos/${filename}`

  // Actualizar en DB
  // Primero obtener foto actual para eliminarla después
  const currentPhoto = await pool.query(
    'SELECT foto_url FROM medicos WHERE id = $1',
    [targetMedicoId]
  )

  await pool.query(
    'UPDATE medicos SET foto_url = $1 WHERE id = $2',
    [photoUrl, targetMedicoId]
  )

  // Eliminar foto anterior si existía y era local
  if (currentPhoto.rows[0]?.foto_url) {
    const oldUrl = currentPhoto.rows[0].foto_url
    if (oldUrl.includes('/uploads/medicos/')) {
      const oldFilename = oldUrl.split('/uploads/medicos/')[1]
      if (oldFilename) {
        const oldPath = join(uploadDir, oldFilename)
        await unlink(oldPath).catch(() => {}) // Ignorar si no existe
      }
    }
  }

  return { 
    success: true, 
    foto_url: photoUrl,
    message: 'Foto actualizada correctamente' 
  }
})