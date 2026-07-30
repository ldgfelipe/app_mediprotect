const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Iniciando migración de facturación...')

    // 1. Agregar costo_consulta a tabla citas
    console.log('1. Agregando costo_consulta a tabla citas...')
    await client.query(`
      ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS costo_consulta DECIMAL(10,2)
    `)
    console.log('   ✓ costo_consulta agregado')

    // 2. Agregar costo_minimo_cita a configuracion_sistema
    console.log('2. Agregando costo_minimo_cita a configuracion_sistema...')
    await client.query(`
      INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo, categoria)
      VALUES ('costo_minimo_cita', '500', 'Costo mínimo por cita cuando el médico no tiene precio_regular', 'number', 'facturacion')
      ON CONFLICT (clave) DO UPDATE SET
        valor = EXCLUDED.valor,
        descripcion = EXCLUDED.descripcion,
        tipo = EXCLUDED.tipo,
        categoria = EXCLUDED.categoria,
        updated_at = NOW()
    `)
    console.log('   ✓ costo_minimo_cita configurado (default $500)')

    // 3. Backfill: actualizar citas existentes con precio_regular del médico
    console.log('3. Backfill de citas existentes...')
    const backfillResult = await client.query(`
      UPDATE citas c
      SET costo_consulta = COALESCE(
        m.precio_regular,
        (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'costo_minimo_cita'),
        500
      )
      FROM medicos m
      WHERE c.id_medico = m.id
      AND c.costo_consulta IS NULL
      AND c.id_medico IS NOT NULL
    `)
    console.log(`   ✓ ${backfillResult.rowCount} citas actualizadas con costo`)

    // 4. Para citas sin médico asignado (id_medico IS NULL), usar costo_minimo_cita
    console.log('4. Actualizando citas sin médico asignado...')
    const sinMedicoResult = await client.query(`
      UPDATE citas
      SET costo_consulta = COALESCE(
        (SELECT valor::numeric FROM configuracion_sistema WHERE clave = 'costo_minimo_cita'),
        500
      )
      WHERE costo_consulta IS NULL
      AND id_medico IS NULL
    `)
    console.log(`   ✓ ${sinMedicoResult.rowCount} citas sin médico actualizadas`)

    // 5. Verificar resultado
    const check = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(costo_consulta) as con_costo,
        AVG(costo_consulta) as promedio_costo
      FROM citas
    `)
    console.log('\nResumen final:')
    console.log(`   Total citas: ${check.rows[0].total}`)
    console.log(`   Citas con costo: ${check.rows[0].con_costo}`)
    console.log(`   Costo promedio: $${check.rows[0].promedio_costo || 0}`)

    console.log('\n✅ Migración completada exitosamente')
  } catch (error) {
    console.error('❌ Error en migración:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()