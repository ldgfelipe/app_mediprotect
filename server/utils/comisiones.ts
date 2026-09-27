export async function repartirComisiones(pool: any, citaId: string) {
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
  const { emitCitaEvento } = await import('./socket-emitter')
  emitCitaEvento('comision:generada', {
    cita_id: citaId,
    medico_id: cita.medico_id,
    monto: montoComision,
  })
}