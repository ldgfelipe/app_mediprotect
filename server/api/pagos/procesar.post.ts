export default defineEventHandler(async (event) => {
  const user = verifyToken(event)
  const body = await readBody(event)
  const { pago_id, metodo, tarjeta } = body

  if (!pago_id || !metodo) {
    throw createError({ statusCode: 400, message: 'pago_id y metodo son requeridos' })
  }

  const pool = await useDbPool(event)

  // Verificar que el pago existe y está pendiente
  const pagoResult = await pool.query(
    `SELECT * FROM pagos WHERE id = $1 AND estado = 'pendiente'`,
    [pago_id]
  )

  if (pagoResult.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado o ya procesado' })
  }

  const pago = pagoResult.rows[0]

  if (user.tipo !== 'admin' && user.id !== pago.id_paciente) {
    throw createError({ statusCode: 403, message: 'No puedes procesar pagos de otro paciente' })
  }

  try {
    let nuevoEstado = 'pagado'
    let provedorPagoId = `sim_${Date.now()}`
    let detalles: any = { metodo, sandbox: pago.sandbox }

    if (pago.sandbox) {
      // Simular procesamiento en sandbox
      if (tarjeta) {
        // Validaciones básicas en sandbox
        const numLimpio = tarjeta.numero.replace(/\s/g, '')
        if (numLimpio.length < 13 || numLimpio.length > 19) {
          throw new Error('Número de tarjeta inválido')
        }
        if (!tarjeta.vencimiento || tarjeta.vencimiento.length !== 5) {
          throw new Error('Fecha de vencimiento inválida')
        }
        if (!tarjeta.cvv || tarjeta.cvv.length < 3) {
          throw new Error('CVV inválido')
        }
        detalles = {
          ...detalles,
          ultimos_4: numLimpio.slice(-4),
          marca: numLimpio.startsWith('4') ? 'visa' : numLimpio.startsWith('5') ? 'mastercard' : 'otro',
          titular: tarjeta.nombre
        }
      }
      // En sandbox, siempre se aprueba
      nuevoEstado = 'pagado'
      provedorPagoId = `sb_${metodo}_${Date.now()}`
    } else {
      // Integración real (pendiente)
      // TODO: Integrar con API real de MercadoPago/Stripe/PayPal
      throw new Error('Integración con provedor en producción no disponible aún')
    }

    // Actualizar el pago
    const updateResult = await pool.query(
      `UPDATE pagos
       SET estado = $1,
           provedor_pago_id = $2,
           metodo_pago = $3,
           detalles = $4,
           paid_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [nuevoEstado, provedorPagoId, metodo, JSON.stringify(detalles), pago_id]
    )

    const pagoActualizado = updateResult.rows[0]

    // Si el pago es por un plan, activar el plan del paciente
    if (pagoActualizado.id_plan && pagoActualizado.id_paciente) {
      // Desactivar planes anteriores
      await pool.query(
        `UPDATE paciente_paquete SET activo = false WHERE id_paciente = $1 AND activo = true`,
        [pagoActualizado.id_paciente]
      )

      // Activar nuevo plan
      await pool.query(
        `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
         VALUES ($1, $2, NOW(), true)`,
        [pagoActualizado.id_paciente, pagoActualizado.id_plan]
      ).catch(() => {})
    }

    return {
      success: true,
      pago: pagoActualizado,
      mensaje: pago.sandbox
        ? 'Pago procesado correctamente (sandbox)'
        : 'Pago procesado correctamente'
    }

  } catch (err: any) {
    // Marcar como fallido
    await pool.query(
      `UPDATE pagos SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
      [err.message, pago_id]
    ).catch(() => {})

    throw createError({ statusCode: 400, message: err.message || 'Error al procesar el pago' })
  }
})
