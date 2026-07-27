import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo !== 'paciente') {
    throw createError({ statusCode: 403, message: 'Solo los pacientes pueden cambiar de plan' })
  }

  const body = await readBody(event)
  const { id_nuevo_plan } = body

  if (!id_nuevo_plan) {
    throw createError({ statusCode: 400, message: 'id_nuevo_plan es requerido' })
  }

  const pool = getPool()

  // Get new plan info
  const planResult = await pool.query(
    'SELECT id, precio, nombre, slug FROM paquetes WHERE id = $1 AND activo = true',
    [id_nuevo_plan]
  )
  if (planResult.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Plan no encontrado o inactivo' })
  }
  const nuevoPlan = planResult.rows[0]

  // Get current active plan
  const currentPlan = await pool.query(
    `SELECT pp.id_paquete, p.nombre, p.precio
     FROM paciente_paquete pp
     JOIN paquetes p ON p.id = pp.id_paquete
     WHERE pp.id_paciente = $1 AND pp.activo = true
     LIMIT 1`,
    [user.id]
  )
  const planActual = currentPlan.rows[0] || null

  // If same plan, do nothing
  if (planActual && planActual.id_paquete === nuevoPlan.id) {
    throw createError({ statusCode: 400, message: 'Ya tienes este plan activo' })
  }

  const esPlanPago = parseFloat(nuevoPlan.precio) > 0

  if (esPlanPago) {
    // Create pending payment, do NOT activate plan yet
    const pagoResult = await pool.query(
      `INSERT INTO pagos (id_paciente, id_plan, monto, moneda, provedor, estado, sandbox, descripcion)
       VALUES ($1, $2, $3, 'MXN', 'mercadopago', 'pendiente', true, $4)
       RETURNING id`,
      [user.id, id_nuevo_plan, nuevoPlan.precio,
       `Cambio de plan a ${nuevoPlan.nombre}${planActual ? ` (desde ${planActual.nombre})` : ''}`]
    )
    return {
      success: true,
      pago_id: pagoResult.rows[0].id,
      plan_nombre: nuevoPlan.nombre,
      monto: nuevoPlan.precio,
      requiere_pago: true
    }
  } else {
    // Free plan: activate immediately
    await pool.query(
      `UPDATE paciente_paquete SET activo = false WHERE id_paciente = $1 AND activo = true`,
      [user.id]
    )
    await pool.query(
      `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
       VALUES ($1, $2, NOW(), true)`,
      [user.id, id_nuevo_plan]
    )
    return {
      success: true,
      plan_nombre: nuevoPlan.nombre,
      requiere_pago: false,
      mensaje: 'Plan cambiado correctamente'
    }
  }
})
