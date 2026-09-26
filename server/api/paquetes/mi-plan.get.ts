import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })

  let payload: any
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const pool = await useDbPool(event)
  const result = await pool.query(`
    SELECT p.id, p.nombre, p.slug, p.precio, p.descripcion,
           pp.fecha_inicio, pp.fecha_fin, pp.activo as suscripcion_activa,
           (SELECT json_agg(json_build_object('beneficio', pb.beneficio, 'valor', pb.valor, 'tipo', pb.tipo) ORDER BY pb.orden)
            FROM paquete_beneficios pb WHERE pb.id_paquete = p.id) as beneficios
    FROM paciente_paquete pp
    JOIN paquetes p ON p.id = pp.id_paquete
    WHERE pp.id_paciente = $1 AND pp.activo = true
    LIMIT 1
  `, [payload.id])

  if (!result.rows.length) {
    // Asignar plan básico por defecto
    await pool.query(
      `INSERT INTO paciente_paquete (id_paciente, id_paquete) VALUES ($1, 1)
       ON CONFLICT (id_paciente, id_paquete) DO NOTHING`,
      [payload.id]
    )
    const basico = await pool.query(`
      SELECT p.*, json_agg(json_build_object('beneficio', pb.beneficio, 'valor', pb.valor, 'tipo', pb.tipo) ORDER BY pb.orden) as beneficios
      FROM paquetes p LEFT JOIN paquete_beneficios pb ON pb.id_paquete = p.id
      WHERE p.id = 1 GROUP BY p.id
    `)
    return { plan: basico.rows[0] }
  }

  return { plan: result.rows[0] }
})
