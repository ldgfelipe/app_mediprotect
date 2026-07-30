const pg = require('pg')
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })
;(async () => {
  // Drop the UUID id_plan column and add integer one
  await pool.query('ALTER TABLE pagos DROP COLUMN IF EXISTS id_plan')
  await pool.query('ALTER TABLE pagos ADD COLUMN IF NOT EXISTS id_plan INTEGER')
  console.log('Fixed: id_plan changed from UUID to INTEGER')

  // Also make id_paquete nullable since we might use id_plan instead
  await pool.query('ALTER TABLE pagos ALTER COLUMN id_paquete DROP NOT NULL')
  console.log('Fixed: id_paquete is now nullable')

  // Verify
  const r = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'pagos' AND column_name IN ('id_plan', 'id_paquete')")
  r.rows.forEach(row => console.log(row.column_name, row.data_type, 'nullable=' + row.is_nullable))

  await pool.end()
  console.log('Done')
})()
