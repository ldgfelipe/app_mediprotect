const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' });
(async () => {
  const r = await pool.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'medicos' ORDER BY ordinal_position`);
  console.log('Columnas de tabla medicos:');
  r.rows.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ') ' + (c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL')));
  await pool.end();
})();
