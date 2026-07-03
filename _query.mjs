import { Pool } from 'pg'
const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
const r = await pool.query(
  `SELECT id, slug, nombre, apellido, titulo, perfil_url,
          horario_atencion IS NOT NULL as has_horario,
          jsonb_array_length(servicios) > 0 as has_servicios,
          jsonb_array_length(formacion_academica) > 0 as has_formacion,
          bio IS NOT NULL as has_bio
   FROM medicos WHERE activo = true
   ORDER BY titulo, nombre`
)
console.log(JSON.stringify(r.rows))
await pool.end()
