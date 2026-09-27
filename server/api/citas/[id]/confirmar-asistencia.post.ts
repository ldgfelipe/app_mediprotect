import { repartirComisiones } from '../../../utils/comisiones'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { respuesta } = body // 'SI' o 'NO'
  const tipo = body.tipo || 'asistente' // 'asistente', 'medico', 'paciente'

  if (!['SI', 'NO', 'si', 'no'].includes(respuesta)) {
    throw createError({ statusCode: 400, message: 'Respuesta debe ser SI o NO' })
  }

  const citaRes = await pool.query(
    `SELECT c.*, m.whatsapp_telefono, p.telefono as paciente_telefono
     FROM citas c
     LEFT JOIN medicos m ON m.id = c.id_medico
     LEFT JOIN pacientes p ON p.id = c.id_paciente
     WHERE c.id = $1`,
    [id]
  )

  const cita = citaRes.rows[0]
  if (!cita) throw createError({ statusCode: 404, message: 'Cita no encontrada' })

  const campoRespuesta = tipo === 'medico' ? 'respuesta_medico_asistio' : 'respuesta_paciente_asistio'
  const campoFecha = tipo === 'medico' ? 'respuesta_medico_at' : 'respuesta_paciente_at'

  await pool.query(
    `UPDATE citas SET ${campoRespuesta} = $1, ${campoFecha} = NOW(), updated_at = NOW() WHERE id = $2`,
    [respuesta.toLowerCase(), id]
  )

  // Si ambos respondieron SI -> marcar como completada y generar comisiones
  if (respuesta.toLowerCase() === 'si') {
    const checkRes = await pool.query(
      `SELECT respuesta_paciente_asistio, respuesta_medico_asistio FROM citas WHERE id = $1`,
      [id]
    )
    const row = checkRes.rows[0]
    if (row.respuesta_paciente_asistio === 'si' && row.respuesta_medico_asistio === 'si') {
      await pool.query(
        `UPDATE citas SET estado = 'completada', updated_at = NOW() WHERE id = $1`,
        [id]
      )

      // Generar comisiones
      await repartirComisiones(pool, id)
    }
  }

  return { ok: true, respuesta: respuesta.toLowerCase() }
})