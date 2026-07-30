export default defineEventHandler(async (event) => {
  const pool = getPool()
  const result = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema
     WHERE categoria = 'pagos'
       AND clave IN ('pago_mercadopago_key', 'pago_stripe_key', 'pago_paypal_client_id')`
  )

  const proveedores: Record<string, boolean> = {
    mercadopago: false,
    stripe: false,
    paypal: false
  }

  for (const row of result.rows) {
    if (row.clave === 'pago_mercadopago_key' && row.valor) proveedores.mercadopago = true
    if (row.clave === 'pago_stripe_key' && row.valor) proveedores.stripe = true
    if (row.clave === 'pago_paypal_client_id' && row.valor) proveedores.paypal = true
  }

  const configurado = Object.values(proveedores).some(v => v)

  return { configurado, proveedores }
})
