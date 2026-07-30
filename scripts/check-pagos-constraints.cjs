const { Pool } = require('pg')
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })
pool.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'pagos'::regclass AND contype = 'c'")
  .then(r => {
    r.rows.forEach(row => console.log(row.conname, '|', row.def))
    pool.end()
  })
  .catch(e => { console.error(e); pool.end() })
