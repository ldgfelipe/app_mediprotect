import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (pool) return pool

  const url = process.env.DATABASE_URL
  if (url) {
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
  } else {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
      ssl: { rejectUnauthorized: false },
    })
  }

  pool.on('error', (err) => console.error('Pool error:', err))
  return pool
}
