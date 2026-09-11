export default defineEventHandler(async (event) => {
  const user = verifyToken(event)
  const body = await readBody(event)
  const { id_paciente, id_plan, monto, moneda, provedor, metodo_pago } = body

  if (!id_paciente || !monto || !provedor) {
    throw createError({ statusCode: 400, message: 'id_paciente, monto y provedor son requeridos' })
  }

  if (user.tipo !== 'admin' && user.id !== id_paciente) {
    throw createError({ statusCode: 403, message: 'No puedes crear pagos para otro paciente' })
  }

  const pool = await useDbPool(event)

  // Obtener configuración del provedor
  const configResult = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema
     WHERE categoria = 'pagos' AND (
       clave = 'pago_${provedor}_key' OR
       clave = 'pago_${provedor}_secret' OR
       clave = 'pago_${provedor}_sandbox' OR
       clave = 'pago_moneda_default'
     )`
  )

  const config: Record<string, string> = {}
  for (const row of configResult.rows) {
    config[row.clave] = row.valor
  }

  const isSandbox = config[`pago_${provedor}_sandbox`] === 'true'
  const monedaFinal = moneda || config['pago_moneda_default'] || 'MXN'

  // Crear registro de pago
  const pagoResult = await pool.query(
    `INSERT INTO pagos (id_paciente, id_plan, monto, moneda, provedor, metodo_pago, estado, sandbox, descripcion)
     VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, $8)
     RETURNING *`,
    [id_paciente, id_plan || null, monto, monedaFinal, provedor, metodo_pago || 'tarjeta', isSandbox,
     `Pago de plan - ${provedor}${isSandbox ? ' (sandbox)' : ''}`]
  )

  const pago = pagoResult.rows[0]

  // Simular URL de checkout (en producción se integrará con la API real del provedor)
  let checkoutUrl = ''

  if (provedor === 'mercadopago') {
    checkoutUrl = isSandbox
      ? `https://sandbox.mercadopago.com.mx/checkout/v1/redirect?payment_id=${pago.id}`
      : `https://www.mercadopago.com.mx/checkout/v1/redirect?payment_id=${pago.id}`
  } else if (provedor === 'stripe') {
    checkoutUrl = isSandbox
      ? `https://checkout.stripe.com/pay/cs_test_${pago.id}`
      : `https://checkout.stripe.com/pay/cs_live_${pago.id}`
  } else if (provedor === 'paypal') {
    checkoutUrl = isSandbox
      ? `https://www.sandbox.paypal.com/checkoutnow?paymentId=${pago.id}`
      : `https://www.paypal.com/checkoutnow?paymentId=${pago.id}`
  }

  return {
    success: true,
    pago,
    checkout_url: checkoutUrl,
    sandbox: isSandbox
  }
})
