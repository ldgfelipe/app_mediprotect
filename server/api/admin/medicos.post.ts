import { createMedico, MedicoInputError } from '../../utils/create-medico.js'

export default defineEventHandler(async (event) => {
  const _user = verifyAdminOrAsistenteToken(event)

  const body = await readBody(event)
  const pool = await useDbPool(event)

  try {
    const result = await createMedico(pool, body, { enviarConfirmacion: true, emitirEvento: true })
    return { success: true, ...result }
  } catch (err: any) {
    if (err instanceof MedicoInputError) {
      throw createError({ statusCode: err.statusCode, message: err.message })
    }
    throw createError({ statusCode: 500, message: 'Error al guardar médico: ' + (err?.message || '') })
  }
})
