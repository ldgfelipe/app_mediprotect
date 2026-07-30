const { Pool } = require('pg')
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })
pool.query("SELECT clave, valor, tipo FROM configuracion_sistema WHERE categoria = 'pagos'")
  .then(r => {
    r.rows.forEach(row => {
      const v = row.valor || 'NULL'
      console.log(row.clave, '|', v.substring(0, 40), '|', row.tipo)
    })
    pool.end()
  })
  .catch(e => { console.error(e); pool.end() })
