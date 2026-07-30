const { Pool } = require('pg')
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })

async function fix() {
  await pool.query("ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_estatus_check")
  await pool.query("ALTER TABLE pagos ADD CONSTRAINT pagos_estado_check CHECK ((estado)::text = ANY (ARRAY['pendiente', 'pagado', 'completado', 'cancelado', 'reembolsado', 'fallido']::text[]))")
  console.log('Constraint updated')
  
  const r = await pool.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'pagos'::regclass AND contype = 'c'")
  r.rows.forEach(row => console.log(row.conname, '|', row.def))
  
  pool.end()
}
fix().catch(e => { console.error(e); pool.end() })
