// POST - Asistente crea cita para un paciente
export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo?.toLowerCase() !== 'asistente' && user.tipo?.toLowerCase() !== 'admin') {
    throw createError({ statusCode: 403, message: 'Solo asistentes y administradores pueden crear citas' })
  }

  const body = await readBody(event)
  const { id_paciente, id_medico, medico_nombre, fecha_hora, notas_paciente, notas_asistente } = body

  if (!id_paciente) {
    throw createError({ statusCode: 400, message: 'El paciente es requerido' })
  }

  if (fecha_hora) {
    const fechaValida = new Date(fecha_hora)
    if (isNaN(fechaValida.getTime())) {
      throw createError({ statusCode: 400, message: 'Formato de fecha/hora inválido' })
    }
  }
  if (!id_medico && !medico_nombre) {
    throw createError({ statusCode: 400, message: 'Se requiere un médico (seleccionado o nombre manual)' })
  }

  let medicoData = null
  if (id_medico) {
    const medico = await pool.query('SELECT id, nombre, apellido FROM medicos WHERE id = $1 AND activo = true', [id_medico])
    if (medico.rows.length === 0) {
      throw createError({ statusCode: 404, message: 'Médico no encontrado o inactivo' })
    }
    medicoData = medico.rows[0]
  }

  // Verify patient exists
  const paciente = await pool.query('SELECT id, nombre, apellido, telefono FROM pacientes WHERE id = $1', [id_paciente])
  if (paciente.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Paciente no encontrado' })
  }

  // Check for scheduling conflicts (only if doctor has an ID)
  if (id_medico) {
    const conflicto = await pool.query(
      `SELECT id FROM citas WHERE id_medico = $1 AND fecha_hora = $2 AND estado NOT IN ('cancelada', 'no_asistida')`,
      [id_medico, fecha_hora]
    )
    if (conflicto.rows.length > 0) {
      throw createError({ statusCode: 409, message: 'El médico ya tiene una cita agendada en esa fecha y hora' })
    }
  }

  // Build notas with manual doctor name if needed
  const notasFinales = [notas_paciente, notas_asistente].filter(Boolean).join('\n') || null
  const notasConMedico = medico_nombre
    ? `${notasFinales || ''}\n[Médico: ${medico_nombre}]`.trim()
    : notasFinales

  let asistenteId = null
  if (user.tipo?.toLowerCase() === 'asistente') {
    const asistenteCheck = await pool.query('SELECT id FROM asistentes WHERE id = $1', [user.id])
    if (asistenteCheck.rows.length === 0) {
      throw createError({ statusCode: 404, message: 'Registro de asistente no encontrado' })
    }
    asistenteId = user.id
  }

  // Create the cita
  const estado = fecha_hora ? 'pendiente' : 'PENDIENTE_DE_COORDINACION'
  const pacienteInfo = paciente.rows[0]
  const pacienteNombre = `${pacienteInfo.nombre} ${pacienteInfo.apellido || ''}`.trim()
  const medicoDesc = medicoData
    ? `${medicoData.nombre} ${medicoData.apellido}`
    : medico_nombre || 'No especificado'
  const result = await pool.query(
    `INSERT INTO citas (
       id_paciente, id_medico, fecha_hora, notas_paciente, notas_asistente, asistente_id, estado,
       whatsapp_telefono, whatsapp_nombre, whatsapp_medico_nombre
     )
     VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      id_paciente,
      id_medico || null,
      fecha_hora || null,
      notas_paciente || null,
      notasConMedico,
      asistenteId,
      estado,
      pacienteInfo.telefono || null,
      pacienteNombre,
      medicoDesc,
    ]
  )

  const cita = result.rows[0]

  emitCitaEvento('cita:created', {
    id: cita.id,
    paciente_id: id_paciente,
    medico_id: id_medico || null,
    paciente_nombre: paciente.rows[0].nombre,
    medico_nombre: medicoDesc,
    estado,
  })

  // Log in bitácora
  await pool.query(
    `INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_nuevo, descripcion, created_at)
     VALUES ($1, $2, $3, 'creacion', $4, $5, NOW())`,
    [
      cita.id,
      user.id,
      user.tipo?.toLowerCase() === 'admin' ? 'admin' : 'asistente',
      estado,
      `Cita creada. Paciente: ${pacienteNombre}. Médico: ${medicoDesc}`,
    ]
  )

  return { cita }
})
