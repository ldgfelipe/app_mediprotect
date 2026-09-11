export default defineEventHandler(async (event) => {
  const b = await readBody(event)
  const { pre_registro_id } = b

  if (!pre_registro_id) {
    throw createError({ statusCode: 400, message: 'pre_registro_id requerido' })
  }

  try {
    const pool = await useDbPool(event)
    await pool.query(
      `UPDATE pre_registros SET estado_registro = 'completado', actualizado_en = NOW() WHERE id = $1`,
      [pre_registro_id]
    )
  } catch (e) {
    return { ok: false, error: 'Tabla pre_registros no disponible' }
  }

  return { ok: true }
})
