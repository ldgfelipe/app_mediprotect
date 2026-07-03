import { Pool } from 'pg'
const p = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})
const r = await p.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'medicos' AND column_name IN ('servicios','idiomas','formacion_academica','horario_atencion','informacion_consulta','foto_url','bio')"
)
console.log(JSON.stringify(r.rows, null, 2))
if (r.rows.length < 7) {
  const existing = r.rows.map(x => x.column_name)
  const needed = ['servicios','idiomas','formacion_academica','horario_atencion','informacion_consulta','foto_url','bio']
  const missing = needed.filter(c => !existing.includes(c))
  console.log('Missing columns:', missing)
  for (const col of missing) {
    const type = col === 'horario_atencion' ? 'TEXT' : 'JSONB'
    await p.query(`ALTER TABLE medicos ADD COLUMN IF NOT EXISTS ${col} ${type}`)
    console.log(`  Created column: ${col}`)
  }
}
await p.end()
