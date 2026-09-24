const { readFileSync, existsSync } = require('fs')
const { Client } = require('pg')

const URL = process.env.RESTORE_DB_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
const FORCE = process.env.SEED_FORCE === '1'

async function correr(c, f) {
  if (!existsSync(f)) { console.error('NO EXISTE', f); return }
  console.log('Aplicando', f)
  await c.query(readFileSync(f, 'utf8'))
}

async function correrUsuarios(c) {
  const f = 'seed-usuarios-test.sql'
  if (!existsSync(f)) { console.error('NO EXISTE', f); return }
  console.log('Provisionando columnas necesarias...')
  await c.query(`
    ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
    ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS plan_contratado TEXT;
    ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
    ALTER TABLE usuarios_sistema ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
  `)
  console.log('Aplicando', f)
  const limpio = readFileSync(f, 'utf8').replace(/DO \$\$ BEGIN\s*[\s\S]*?END \$\$;/gi, '')
  await c.query(limpio)
}

async function main() {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false }, family: 4 })
  await c.connect()

  await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

  await correrUsuarios(c)

  console.log('Deduplicando centros_medicos...')
  await c.query(`
    DELETE FROM centros_medicos a USING centros_medicos b WHERE a.nombre = b.nombre AND a.id > b.id;
    DO $$ BEGIN
      ALTER TABLE centros_medicos ADD CONSTRAINT centros_medicos_nombre_unique UNIQUE (nombre);
    EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
  `)

  await correr(c, 'schema-directorio-medico.sql')

  const { rows: [{ n: medicos }] } = await c.query(`select count(*)::int as n from medicos`)
  if (FORCE || medicos === 0) {
    if (FORCE && medicos > 0) {
      console.log('SEED_FORCE: limpiando medicos y dependencias...')
      await c.query(`TRUNCATE TABLE medicos CASCADE`)
    }
    await correr(c, 'seed-directorio-medico.sql')
    await correr(c, 'seed-directorio-complementario.sql')
    await correr(c, 'seed-directorio-restante.sql')
  } else {
    console.log(`MEDICOS ya tiene ${medicos} filas: seeds de directorio omitidos. Usa SEED_FORCE=1 para reestablecer desde cero.`)
  }

  const cuenta = async (t) => (await c.query(`select count(*)::int as n from ${t}`)).rows[0].n
  console.log('\nRESUMEN:')
  console.log('  medicos:', await cuenta('medicos'))
  console.log('  especialidades:', await cuenta('especialidades'))
  console.log('  centros_medicos:', await cuenta('centros_medicos'))
  console.log('  usuarios_sistema:', await cuenta('usuarios_sistema'))
  console.log('  asistentes:', await cuenta('asistentes'))
  console.log('  pacientes:', await cuenta('pacientes'))

  await c.end()
  console.log('\nLISTO')
}
main().catch((e) => { console.error('FALLO:', e.message); process.exit(1) })