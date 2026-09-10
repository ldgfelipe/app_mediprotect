export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const query = getQuery(event)
  const provedor = query.provedor as string || 'mercadopago'

  const pool = useDbPool(event)

  try {
    let pagoId: string | null = null
    let nuevoEstado: string = 'pendiente'
    let provedorPagoId: string | null = null
    let detalles: any = {}

    if (provedor === 'mercadopago') {
      // MercadoPago webhook format
      pagoId = body.data?.id || body.payment?.id || null
      if (body.type === 'payment') {
        // Simular verificación de pago
        const statusMap: Record<string, string> = {
          'approved': 'pagado',
          'pending': 'pendiente',
          'rejected': 'fallido',
          'cancelled': 'cancelado',
          'refunded': 'reembolsado'
        }
        nuevoEstado = statusMap[body.payment?.status] || 'pendiente'
        provedorPagoId = body.payment?.id?.toString() || null
        detalles = body.payment || body
      }
    } else if (provedor === 'stripe') {
      // Stripe webhook format
      if (body.type === 'payment_intent.succeeded') {
        nuevoEstado = 'pagado'
        provedorPagoId = body.data?.object?.id || null
        detalles = body.data?.object || {}
      } else if (body.type === 'payment_intent.payment_failed') {
        nuevoEstado = 'fallido'
        provedorPagoId = body.data?.object?.id || null
        detalles = body.data?.object || {}
      }
      pagoId = body.data?.object?.metadata?.pago_id || null
    } else if (provedor === 'paypal') {
      // PayPal webhook format
      if (body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        nuevoEstado = 'pagado'
        provedorPagoId = body.resource?.id || null
        detalles = body.resource || {}
      } else if (body.event_type === 'PAYMENT.CAPTURE.DENIED') {
        nuevoEstado = 'fallido'
        provedorPagoId = body.resource?.id || null
        detalles = body.resource || {}
      }
      pagoId = body.resource?.custom_id || null
    }

    // Actualizar pago si se encontró
    if (pagoId) {
      const updateResult = await pool.query(
        `UPDATE pagos
         SET estado = $1,
             provedor_pago_id = COALESCE($2, provedor_pago_id),
             detalles = $3,
             paid_at = CASE WHEN $1 = 'pagado' THEN NOW() ELSE paid_at END
         WHERE id = $4 OR provedor_pago_id = $5
         RETURNING *`,
        [nuevoEstado, provedorPagoId, JSON.stringify(detalles), pagoId, provedorPagoId]
      )

      if (updateResult.rowCount > 0) {
        // Log en bitácora si existe
        await pool.query(
          `INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_nuevo, descripcion, datos_adicionales)
           VALUES ($1, $1, 'sistema', 'pago_webhook', $2, $3, $4)`,
          [updateResult.rows[0].id, nuevoEstado, `Webhook ${provedor}: ${nuevoEstado}`, JSON.stringify({ provedor, body })]
        ).catch(() => {}) // Ignorar si la tabla no existe o el id no es una cita
      }

      return { success: true, pago: updateResult.rows[0] }
    }

    // Si no se encontró el pago, log el webhook para investigación
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor, categoria, tipo, descripcion)
       VALUES ('webhook_log_${Date.now()}', $1, 'logs', 'json', 'Webhook no procesado')`,
      [JSON.stringify({ provedor, body, timestamp: new Date().toISOString() })]
    ).catch(() => {})

    return { success: true, message: 'Webhook recibido pero no se encontró pago relacionado' }

  } catch (err: any) {
    console.error('Error procesando webhook:', err)
    throw createError({ statusCode: 500, message: 'Error procesando webhook' })
  }
})
