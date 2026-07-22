import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find all duplicates by name+apellido (case insensitive)
    const dups = await client.query(`
      SELECT m1.id as keep_id, m1.nombre, m1.apellido, m1.slug as keep_slug,
             m2.id as delete_id, m2.slug as delete_slug, m2.bio as delete_bio
      FROM medicos m1
      INNER JOIN medicos m2 ON LOWER(m1.nombre) = LOWER(m2.nombre) AND LOWER(m1.apellido) = LOWER(m2.apellido)
      WHERE m1.id != m2.id AND m1.activo = true AND m2.activo = true
        AND m1.created_at <= m2.created_at
    `)

    console.log(`Encontrados ${dups.rowCount} pares de duplicados`)

    // Keep the one with more data (slug, bio, cedula), delete the other
    let deleted = 0
    const seen = new Set()

    for (const dup of dups.rows) {
      const pairKey = [dup.keep_id, dup.delete_id].sort().join('-')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      // Decide which to keep: prefer the one with bio, slug, or cedula
      let keepId = dup.keep_id
      let deleteId = dup.delete_id

      // Check which has more data
      const res1 = await client.query('SELECT bio, slug, cedula_profesional FROM medicos WHERE id = $1', [dup.keep_id])
      const res2 = await client.query('SELECT bio, slug, cedula_profesional FROM medicos WHERE id = $1', [dup.delete_id])
      
      const score1 = (res1.rows[0].bio ? 1 : 0) + (res1.rows[0].slug ? 1 : 0) + (res1.rows[0].cedula_profesional ? 1 : 0)
      const score2 = (res2.rows[0].bio ? 1 : 0) + (res2.rows[0].slug ? 1 : 0) + (res2.rows[0].cedula_profesional ? 1 : 0)

      if (score2 > score1) {
        keepId = dup.delete_id
        deleteId = dup.keep_id
      } else if (score2 === score1) {
        // Keep the older one (first created)
        const older = await client.query('SELECT created_at FROM medicos WHERE id IN ($1, $2) ORDER BY created_at ASC LIMIT 1', [dup.keep_id, dup.delete_id])
        keepId = older.rows[0].id
        deleteId = keepId === dup.keep_id ? dup.delete_id : dup.keep_id
      }

      // Before deleting, merge important data from the one being deleted into the one being kept
      const delDoc = await client.query('SELECT * FROM medicos WHERE id = $1', [deleteId])
      const keepDoc = await client.query('SELECT * FROM medicos WHERE id = $1', [keepId])

      if (delDoc.rows[0] && keepDoc.rows[0]) {
        const d = delDoc.rows[0]
        const k = keepDoc.rows[0]
        const updates = []
        const values = []
        let idx = 1

        // Merge: keep the one with better data, but fill in blanks from the other
        if (!k.bio && d.bio) { updates.push(`bio = $${idx++}`); values.push(d.bio) }
        if (!k.slug && d.slug) { updates.push(`slug = $${idx++}`); values.push(d.slug) }
        if (!k.universidad && d.universidad) { updates.push(`universidad = $${idx++}`); values.push(d.universidad) }
        if (!k.frase_inspiradora && d.frase_inspiradora) { updates.push(`frase_inspiradora = $${idx++}`); values.push(d.frase_inspiradora) }
        if (!k.horario_atencion && d.horario_atencion) { updates.push(`horario_atencion = $${idx++}`); values.push(d.horario_atencion) }
        if (!k.cedula_profesional && d.cedula_profesional) { updates.push(`cedula_profesional = $${idx++}`); values.push(d.cedula_profesional) }
        if (!k.cedula_especialidad && d.cedula_especialidad) { updates.push(`cedula_especialidad = $${idx++}`); values.push(d.cedula_especialidad) }
        if ((!k.idiomas || k.idiomas.length === 0) && d.idiomas && d.idiomas.length > 0) { updates.push(`idiomas = $${idx++}::jsonb`); values.push(JSON.stringify(d.idiomas)) }
        if (!k.servicios && d.servicios) { updates.push(`servicios = $${idx++}::jsonb`); values.push(JSON.stringify(d.servicios)) }
        if (!k.formacion_academica && d.formacion_academica) { updates.push(`formacion_academica = $${idx++}::jsonb`); values.push(JSON.stringify(d.formacion_academica)) }
        if (!k.certificaciones && d.certificaciones) { updates.push(`certificaciones = $${idx++}`); values.push(d.certificaciones) }
        if (!k.precio_regular && d.precio_regular) { updates.push(`precio_regular = $${idx++}`); values.push(d.precio_regular) }
        if (!k.precio_miembro && d.precio_miembro) { updates.push(`precio_miembro = $${idx++}`); values.push(d.precio_miembro) }
        if (!k.foto_url && d.foto_url) { updates.push(`foto_url = $${idx++}`); values.push(d.foto_url) }

        if (updates.length > 0) {
          values.push(keepId)
          await client.query(`UPDATE medicos SET ${updates.join(', ')} WHERE id = $${idx}`, values)
        }
      }

      // Delete the duplicate
      await client.query('DELETE FROM medicos WHERE id = $1', [deleteId])
      console.log(`  🗑️  Eliminado: ${dup.nombre} ${dup.apellido} (ID: ${deleteId}) → Mantenido: ${keepId}`)
      deleted++
    }

    await client.query('COMMIT')
    console.log(`\nTotal duplicados eliminados: ${deleted}`)

    // Final count
    const total = await pool.query('SELECT COUNT(*) as t FROM medicos WHERE activo = true')
    console.log(`Total médicos en DB: ${total.rows[0].t}`)

  } catch (e) {
    await client.query('ROLLBACK')
    console.error('ERROR:', e.message)
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
