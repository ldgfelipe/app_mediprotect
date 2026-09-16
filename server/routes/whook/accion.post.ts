export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const body = await readBody(event)

  const { accion, cita_id, telefono } = body

  if (!accion || !cita_id) {
    throw createError({ statusCode: 400, message: 'Acción y cita_id requeridos' })
  }

  switch (accion) {
    case 'confirmar_asistencia': {
      await pool.query(
        `UPDATE citas
         SET respuesta_paciente = 'asistio', respuesta_paciente_at = NOW()
         WHERE id = $1`,
        [cita_id]
      )

      await checkAndFinalizeCita(pool, cita_id)

      return { ok: true, message: 'Asistencia confirmada' }
    }

    case 'cancelar_paciente': {
      await pool.query(
        `UPDATE citas
         SET estado = 'cancelada', respuesta_paciente = 'cancelo_paciente', respuesta_paciente_at = NOW()
         WHERE id = $1`,
        [cita_id]
      )

      return { ok: true, message: 'Cita cancelada por paciente' }
    }

    case 'no_asistio_paciente': {
      await pool.query(
        `UPDATE citas
         SET respuesta_paciente = 'no_asistio', respuesta_paciente_at = NOW()
         WHERE id = $1`,
        [cita_id]
      )

      await checkAndFinalizeCita(pool, cita_id)

      return { ok: true, message: 'Inasistencia registrada' }
    }

    case 'calificar_estrellas': {
      const { estrellas } = body
      await pool.query(
        `UPDATE citas
         SET calificacion_paciente = $1, respuesta_paciente = 'asistio', respuesta_paciente_at = NOW()
         WHERE id = $2`,
        [estrellas, cita_id]
      )

      await checkAndFinalizeCita(pool, cita_id)

      return { ok: true, message: 'Calificación registrada' }
    }

    case 'doctor_asistio': {
      await pool.query(
        `UPDATE citas
         SET respuesta_doctor = 'asistio', respuesta_doctor_at = NOW()
         WHERE id = $1`,
        [cita_id]
      )

      await checkAndFinalizeCita(pool, cita_id)

      return { ok: true, message: 'Confirmación doctor registrada' }
    }

    case 'doctor_no_asistio': {
      await pool.query(
        `UPDATE citas
         SET respuesta_doctor = 'no_asistio', respuesta_doctor_at = NOW()
         WHERE id = $1`,
        [cita_id]
      )

      await checkAndFinalizeCita(pool, cita_id)

      return { ok: true, message: 'Inasistencia doctor registrada' }
    }

    default:
      throw createError({ statusCode: 400, message: `Acción desconocida: ${accion}` })
  }
})

async function checkAndFinalizeCita(pool: any, citaId: string) {
  const cita = await pool.query(
    `SELECT respuesta_paciente, respuesta_doctor, estado, id_medico, precio_acordado
     FROM citas WHERE id = $1`,
    [citaId]
  )

  if (cita.rows.length === 0) return
  const c = cita.rows[0]

  const respondioPaciente = !!c.respuesta_paciente
  const respondioDoctor = !!c.respuesta_doctor

  if (!respondioPaciente && !respondioDoctor) return

  if (respondioPaciente && respondioDoctor) {
    if (c.respuesta_paciente === 'asistio' && c.respuesta_doctor === 'asistio') {
      await pool.query(
        `UPDATE citas SET estado = 'completada_confirmada' WHERE id = $1`,
        [citaId]
      )
      await generarComision(pool, c.id_medico, citaId, c.precio_acordado)
    } else if (c.respuesta_paciente === 'no_asistio' && c.respuesta_doctor === 'no_asistio') {
      await pool.query(
        `UPDATE citas SET estado = 'no_show_confirmado' WHERE id = $1`,
        [citaId]
      )
    } else if (c.respuesta_paciente === 'asistio' && c.respuesta_doctor === 'no_asistio') {
      await pool.query(
        `UPDATE citas SET estado = 'discrepancia_auditoria', auditoria_flag = true WHERE id = $1`,
        [citaId]
      )
      await pool.query(
        `UPDATE medicos SET estatus_medico = 'en_revision' WHERE id = $1`,
        [c.id_medico]
      )
    } else if (c.respuesta_paciente === 'no_asistio' && c.respuesta_doctor === 'asistio') {
      await pool.query(
        `UPDATE citas SET estado = 'completada_por_doctor' WHERE id = $1`,
        [citaId]
      )
      await generarComision(pool, c.id_medico, citaId, c.precio_acordado)
    }
  } else if (respondioDoctor && !respondioPaciente) {
    if (c.respuesta_doctor === 'asistio') {
      await pool.query(
        `UPDATE citas SET estado = 'completada_por_doctor' WHERE id = $1`,
        [citaId]
      )
      await generarComision(pool, c.id_medico, citaId, c.precio_acordado)
    }
  } else if (respondioPaciente && !respondioDoctor) {
    if (c.respuesta_paciente === 'no_asistio') {
      await pool.query(
        `UPDATE citas SET estado = 'pendiente_verificacion' WHERE id = $1`,
        [citaId]
      )
    }
  }
}

async function generarComision(pool: any, medicoId: string, citaId: string, precioAcordado: number) {
  const medico = await pool.query(
    `SELECT monto_comision FROM medicos WHERE id = $1`,
    [medicoId]
  )

  const comision = medico.rows[0]?.monto_comision || 100

  const periodo = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  await pool.query(
    `INSERT INTO estados_cuenta_medicos (id_medico, periodo, citas_completadas, total_comisiones)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (id_medico, periodo) DO UPDATE SET
       citas_completadas = estados_cuenta_medicos.citas_completadas + 1,
       total_comisiones = estados_cuenta_medicos.total_comisiones + $3,
       updated_at = NOW()`,
    [medicoId, periodo, comision]
  )
}
