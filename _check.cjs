const { Pool } = require('pg')
const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
async function main() {
  const esp = await pool.query('SELECT id, nombre FROM especialidades ORDER BY id')
  console.log('Especialidades actuales:', esp.rows.length)
  esp.rows.forEach(r => console.log(`  ${r.id}: ${r.nombre}`))
  
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'medicos' ORDER BY ordinal_position")
  console.log('\nColumnas en medicos:')
  cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`))
  
  const count = await pool.query('SELECT count(*) FROM medicos')
  console.log(`\nMédicos registrados: ${count.rows[0].count}`)
  
  pool.end()
}
main().catch(e => { console.error(e); pool.end() })
