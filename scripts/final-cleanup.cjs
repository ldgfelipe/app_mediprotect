const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' });
(async () => {
  // Delete duplicates with -mrw... suffix slugs (less data)
  const idsToDelete = [
    '6980fad1-bac1-4b21-9612-f4e9dffb922f', // daniel-saucedo-conde-mrw1p1ky
    '5cd8a46b-fcb6-4376-bf1f-0d60e1ec24b1', // cesar-gamez-tellez-mrw1p1gr
    '11f8dbfd-a7ed-48f0-804c-e5d8c9035968', // yesica-robles-herrera-mrw1p21w
    '39ae5d64-e5a0-40b7-9afd-7d41cc57bca2', // alfonso-rodriguez-ojeda-mrw1p263
  ];

  for (const id of idsToDelete) {
    const r = await pool.query('DELETE FROM medicos WHERE id = $1 RETURNING nombre, apellido', [id]);
    if (r.rowCount > 0) {
      console.log('Deleted:', r.rows[0].nombre, r.rows[0].apellido);
    }
  }

  // Also clean up other -mrw... duplicates
  const mrwDups = await pool.query(`
    DELETE FROM medicos 
    WHERE slug LIKE '%-mrw%' 
    AND id IN (
      SELECT m2.id FROM medicos m2
      INNER JOIN medicos m1 ON LOWER(m1.nombre) = LOWER(m2.nombre) AND LOWER(m1.apellido) = LOWER(m2.apellido)
      WHERE m1.id != m2.id AND m2.slug LIKE '%-mrw%'
    )
    RETURNING nombre, apellido, slug
  `);
  for (const d of mrwDups.rows) {
    console.log('Cleaned:', d.nombre, d.apellido, d.slug);
  }

  const total = await pool.query('SELECT COUNT(*) as t FROM medicos WHERE activo = true');
  console.log('\nTotal medicos:', total.rows[0].t);
  await pool.end();
})();
