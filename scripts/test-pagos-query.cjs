const { Pool } = require('pg')
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })

async function test() {
  try {
    const r1 = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['pagos'])
    console.log('=== PAGOS COLUMNS ===')
    r1.rows.forEach(r => console.log(r.column_name, '|', r.data_type))

    const r2 = await pool.query('SELECT * FROM pagos LIMIT 5')
    console.log('\n=== PAGOS ROWS ===')
    console.log('count:', r2.rows.length)
    r2.rows.forEach(r => console.log('id:', r.id, 'paciente:', r.id_paciente, 'plan:', r.id_plan, 'estado:', r.estado, 'monto:', r.monto))

    const r3 = await pool.query(`SELECT p.*, pa.nombre as paciente_nombre, paq.nombre as plan_nombre FROM pagos p LEFT JOIN pacientes pa ON pa.id = p.id_paciente LEFT JOIN paquetes paq ON paq.id = p.id_plan ORDER BY p.created_at DESC LIMIT 5`)
    console.log('\n=== JOIN QUERY ===')
    console.log('count:', r3.rows.length)
    r3.rows.forEach(r => console.log('paciente:', r.paciente_nombre, 'plan:', r.plan_nombre, 'estado:', r.estado))
  } catch (e) {
    console.error('ERROR:', e.message)
  }
  pool.end()
}
test()
