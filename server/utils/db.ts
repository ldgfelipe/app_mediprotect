import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (pool) return pool

  const url = process.env.DATABASE_URL
  if (url) {
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
  } else {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'mediprotect',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    })
  }

  pool.on('error', (err) => console.error('Pool error:', err))
  return pool
}
