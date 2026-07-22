const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' });
(async () => {
  const r = await pool.query(`SELECT id, nombre, apellido, slug, cedula_profesional, bio IS NOT NULL as has_bio FROM medicos WHERE activo = true ORDER BY apellido, nombre`);
  const byName = {};
  for (const d of r.rows) {
    const key = (d.nombre + ' ' + d.apellido).toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (!byName[key]) byName[key] = [];
    byName[key].push(d);
  }
  const dups = Object.entries(byName).filter(([k,v]) => v.length > 1);
  console.log('Duplicates found:', dups.length);
  for (const [name, docs] of dups) {
    console.log('\n' + name + ':');
    for (const d of docs) {
      console.log('  id=' + d.id + ' slug=' + (d.slug||'NULL') + ' ced=' + (d.cedula_profesional||'NULL') + ' bio=' + d.has_bio);
    }
  }
  await pool.end();
})();
