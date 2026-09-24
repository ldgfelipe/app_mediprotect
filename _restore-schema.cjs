const { readFileSync, existsSync } = require('fs')
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const URL = process.env.RESTORE_DB_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
const ADMIN_EMAIL = 'admin@mediprotect.com.mx'
const ADMIN_PASS = 'MediProtect_Admin2026!'

async function main() {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false }, family: 4 })
  await c.connect()
  for (const f of ['schema-test-database.sql', 'migrations/004_evolution_gateway.sql', 'migrations/005_disponibilidad_medica.sql']) {
    if (!existsSync(f)) { console.error('NO EXISTE', f); continue }
    console.log('Aplicando', f)
    await c.query(readFileSync(f, 'utf8'))
  }
  const hash = bcrypt.hashSync(ADMIN_PASS, 10)
  await c.query(`UPDATE usuarios_sistema SET password_hash=$1, activo=true WHERE email=$2`, [hash, ADMIN_EMAIL])
  const tabs = await c.query(`select tablename from pg_tables where schemaname='public' order by 1`)
  console.log('TABLAS (' + tabs.rowCount + '): ' + tabs.rows.map((r) => r.tablename).join(', '))
  const adm = await c.query(`select u.email, r.nombre as rol from usuarios_sistema u join roles r on r.id=u.id_rol`)
  console.log('USUARIOS SISTEMA:', JSON.stringify(adm.rows))
  await c.end()
  console.log('LISTO')
}
main().catch((e) => { console.error('FALLO:', e.message); process.exit(1) })