import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = useDbPool(event)
  const medicoId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const periodo = query.periodo || new Date().toISOString().slice(0, 7)
  const [year, month] = periodo.split('-').map(Number)
  const fechaInicio = new Date(year, month - 1, 1)
  const fechaFin = new Date(year, month, 0, 23, 59, 59)

  const medico = await pool.query(`
    SELECT id, nombre, apellido, precio_regular, precio_miembro, especialidad, telefono, email, COALESCE(comision_tipo, 1) as comision_tipo
    FROM medicos WHERE id = $1
  `, [medicoId])
  if (medico.rows.length === 0) throw createError({ statusCode: 404, message: 'Médico no encontrado' })

  const comisionTipo = medico.rows[0].comision_tipo
  const comisionPorCita: Record<number, number> = { 1: 100, 2: 75, 3: 50 }
  const comisionUnitaria = comisionPorCita[comisionTipo] || 100

  const citas = await pool.query(`
    SELECT
      c.id,
      c.fecha_hora,
      c.estado,
      c.costo_consulta,
      c.notas_paciente,
      p.nombre as paciente_nombre,
      p.apellido as paciente_apellido,
      p.telefono as paciente_telefono
    FROM citas c
    JOIN pacientes p ON p.id = c.id_paciente
    WHERE c.id_medico = $1
      AND c.fecha_hora >= $2 AND c.fecha_hora <= $3
    ORDER BY c.fecha_hora DESC
  `, [medicoId, fechaInicio, fechaFin])

  const resumen = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado IN ('confirmada', 'asistida')) as confirmadas,
      COALESCE(SUM(costo_consulta) FILTER (WHERE estado IN ('confirmada', 'asistida')), 0) as ingresos
    FROM citas
    WHERE id_medico = $1 AND fecha_hora >= $2 AND fecha_hora <= $3
  `, [medicoId, fechaInicio, fechaFin])

  const confirmadas = parseInt(resumen.rows[0]?.confirmadas) || 0
  const resumenData = resumen.rows[0]
  resumenData.comision = confirmadas * comisionUnitaria
  resumenData.comision_tipo = comisionTipo
  resumenData.comision_por_cita = comisionUnitaria

  return {
    medico: medico.rows[0],
    citas: citas.rows.map((c: any) => ({
      ...c,
      comision: ['confirmada', 'asistida'].includes(c.estado) ? comisionUnitaria : 0
    })),
    resumen: resumenData,
    periodo
  }
})
