const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' });
(async () => {
  const r = await pool.query(`
    SELECT m.id, m.nombre, m.apellido, m.titulo, m.cedula_profesional, m.cedula_especialidad,
           m.bio, m.foto_url, m.whatsapp, m.slug, m.universidad, m.frase_inspiradora,
           m.precio_regular, m.precio_miembro, m.consultorio_direccion, m.consultorio_ciudad,
           m.horario_atencion, m.idiomas, e.nombre as especialidad_nombre
    FROM medicos m LEFT JOIN especialidades e ON m.id_especialidad = e.id
    WHERE m.activo = true ORDER BY m.nombre, m.apellido
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
})();
