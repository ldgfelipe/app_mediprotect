// Quick API test using direct DB query + simulate what the endpoint does
import { createServer } from 'http'

const slugs = [
  'erasmo-vega-osorio',
  'oscar-santos-garcia',
  'pedro-diaz-garcia',
  'ricardo-alvarez-quiroz',
  'raquel-najem-gonzalez',
]

const { Pool } = await import('pg')
const pool = new Pool({ connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres' })

for (const slug of slugs) {
  const { rows } = await pool.query(
    `SELECT nombre, apellidos, especialidad_principal, subespecialidad, cedula_profesional, ciudad, foto_url, bio, formacion_academica, servicios, idiomas, horario_atencion, perfil_url, informacion_consulta
     FROM medicos WHERE slug = $1 AND activo = true`,
    [slug]
  )
  if (rows.length === 0) {
    console.log(`\n=== ${slug} === NOT FOUND`)
    continue
  }
  const d = rows[0]
  console.log(`\n=== ${slug} ===`)
  console.log(`  nombre: ${d.nombre} ${d.apellidos}`)
  console.log(`  especialidad: ${d.especialidad_principal}`)
  console.log(`  subespecialidad: ${d.subespecialidad}`)
  console.log(`  cedula: ${d.cedula_profesional}`)
  console.log(`  ciudad: ${d.ciudad}`)
  console.log(`  foto_url: ${d.foto_url ? d.foto_url.substring(0,80) : 'N/A'}`)
  console.log(`  bio: ${d.bio ? d.bio.substring(0,80) + '...' : 'N/A'}`)
  console.log(`  formacion: ${JSON.stringify(d.formacion_academica)}`)
  console.log(`  servicios: ${JSON.stringify(d.servicios)}`)
  console.log(`  idiomas: ${JSON.stringify(d.idiomas)}`)
  console.log(`  horario: ${d.horario_atencion ? 'Yes' : 'No'}`)
  console.log(`  informacion_consulta: ${JSON.stringify(d.informacion_consulta)}`)
}

await pool.end()
