const pg = require('pg')
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })
;(async () => {
  try {
    const r = await pool.query(
      "INSERT INTO pagos (id_paciente, id_plan, monto, moneda, provedor, estado, sandbox, descripcion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, id_plan, estado",
      ['00000000-0000-0000-0000-000000000001', 1, 999, 'MXN', 'mercadopago', 'pendiente', true, 'test']
    )
    console.log('OK:', r.rows[0])
    await pool.query('DELETE FROM pagos WHERE id = $1', [r.rows[0].id])
  } catch (e) {
    console.error('ERROR:', e.message)
  }
  await pool.end()
})()
