const { Pool } = require('pg')
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })

async function main() {
  try {
    const exists = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'medicos' AND column_name = 'usuario'"
    )
    if (exists.rowCount > 0) {
      console.log('Column usuario already exists')
    } else {
      await pool.query('ALTER TABLE medicos ADD COLUMN usuario VARCHAR(100) UNIQUE')
      console.log('Added usuario column')
    }
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await pool.end()
  }
}

main()
