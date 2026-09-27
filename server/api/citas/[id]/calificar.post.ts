export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { calificacion, comentario, tipo } = body

  if (!calificacion || calificacion < 1 || calificacion > 5) {
    throw createError({ statusCode: 400, message: 'Calificación inválida (1-5)' })
  }
  if (!['paciente', 'medico'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo inválido (paciente|medico)' })
  }

  const citaRes = await pool.query(
    `SELECT c.*, p.id as paciente_id, m.id as medico_id
     FROM citas c
     LEFT JOIN pacientes p ON p.id = c.id_paciente
     LEFT JOIN medicos m ON m.id = c.id_medico
     WHERE c.id = $1`,
    [id]
  )

  const cita = citaRes.rows[0]
  if (!cita) throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  if (cita.estado !== 'completada' && cita.estado !== 'finalizada') {
    throw createError({ statusCode: 400, message: 'Solo se puede calificar citas completadas' })
  }

  const pacienteCalifico = await pool.query(
    `SELECT 1 FROM calificaciones WHERE cita_id = $1 AND tipo = 'paciente'`,
    [id]
  )
  const medicoCalifico = await pool.query(
    `SELECT 1 FROM calificaciones WHERE cita_id = $1 AND tipo = 'medico'`,
    [id]
  )

  if (tipo === 'paciente' && pacienteCalifico.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'Ya calificaste esta cita' })
  }
  if (tipo === 'medico' && medicoCalifico.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'Ya calificaste esta cita' })
  }

  const resultado = await pool.query(
    `INSERT INTO calificaciones (cita_id, tipo, calificacion, comentario)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, tipo, calificacion, comentario || null]
  )

  // Actualizar promedio en perfil del médico/paciente
  if (tipo === 'paciente') {
    // Calificación del paciente hacia el médico
    const promedio = await pool.query(
      `SELECT AVG(calificacion)::numeric(3,2) as promedio, COUNT(*) as total
       FROM calificaciones cal
       JOIN citas c ON c.id = cal.cita_id
       WHERE cal.tipo = 'paciente' AND c.id_medico = $1`,
      [cita.medico_id]
    )
    await pool.query(
      `UPDATE medicos SET calificacion_promedio = $1, total_calificaciones = $2 WHERE id = $3`,
      [promedio.rows[0].promedio || 0, promedio.rows[0].total || 0, cita.medico_id]
    )
  } else {
    // Calificación del médico hacia el paciente
    const promedio = await pool.query(
      `SELECT AVG(calificacion)::numeric(3,2) as promedio, COUNT(*) as total
       FROM calificaciones cal
       JOIN citas c ON c.id = cal.cita_id
       WHERE cal.tipo = 'medico' AND c.id_paciente = $1`,
      [cita.paciente_id]
    )
    await pool.query(
      `UPDATE pacientes SET calificacion_promedio = $1, total_calificaciones = $2 WHERE id = $3`,
      [promedio.rows[0].promedio || 0, promedio.rows[0].total || 0, cita.paciente_id]
    )
  }

  // Verificar si ambos calificaron -> repartir comisiones
  const ambosCalificaron = await pool.query(
    `SELECT COUNT(*) as total FROM calificaciones WHERE cita_id = $1`,
    [id]
  )

  if (ambosCalificaron.rows[0].total >= 2) {
    await repartirComisiones(pool, id)
  }

  return { ok: true, calificacion: resultado.rows[0] }
})

async function repartirComisiones(pool: any, citaId: string) {
  const citaRes = await pool.query(
    `SELECT c.*, m.monto_comision, m.porcentaje_comision
     FROM citas c
     JOIN medicos m ON m.id = c.id_medico
     WHERE c.id = $1`,
    [citaId]
  )

  const cita = citaRes.rows[0]
  if (!cita || !cita.monto_comision) return

  const montoComision = Number(cita.monto_comision)

  // Registrar comisión para el médico
  await pool.query(
    `INSERT INTO comisiones_medicos (cita_id, medico_id, monto, estado)
     VALUES ($1, $2, $3, 'pendiente')
     ON CONFLICT (cita_id) DO UPDATE SET monto = EXCLUDED.monto`,
    [citaId, cita.medico_id, montoComision]
  )

  // Actualizar saldo disponible del médico
  await pool.query(
    `UPDATE medicos SET saldo_comisiones = COALESCE(saldo_comisiones, 0) + $1 WHERE id = $2`,
    [montoComision, cita.medico_id]
  )

  // Emitir evento
  const { emitCitaEvento } = await import('../../../utils/socket-emitter')
  emitCitaEvento('comision:generada', {
    cita_id: citaId,
    medico_id: cita.medico_id,
    monto: montoComision,
  })
}