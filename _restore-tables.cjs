const { readFileSync, existsSync } = require('fs')
const { Client } = require('pg')

const URL = process.env.RESTORE_DB_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
const FILES = [
  'schema-whatsapp.sql',
  'schema-push-subscriptions.sql',
  'schema-migration-completa.sql',
  'schema-consultorios.sql',
  'schema-whatsapp-flows.sql',
]

async function main() {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false }, family: 4 })
  await c.connect()
  for (const f of FILES) {
    if (!existsSync(f)) { console.error('NO EXISTE', f); continue }
    console.log('Aplicando', f)
    await c.query(readFileSync(f, 'utf8'))
  }
  const tabs = await c.query(`select tablename from pg_tables where schemaname='public' and tablename not in (
    select tablename from pg_tables where schemaname='public' order by 1 limit 34
  ) order by 1`)
  console.log('TABLAS DE LA APP (' + tabs.rowCount + '):')
  console.log(tabs.rows.map((r) => r.tablename).join(', '))
  await c.end()
  console.log('LISTO')
}
main().catch((e) => { console.error('FALLO:', e.message); process.exit(1) })