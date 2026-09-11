import { Pool } from 'pg'

const PROD_URL = process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'

let prodPool: Pool | null = null

function getProdPool(): Pool {
  if (!prodPool) {
    prodPool = new Pool({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false }, family: 4 })
    prodPool.on('error', (err) => console.error('Pool error:', err))
  }
  return prodPool
}

export function getPool(): Pool {
  return getProdPool()
}

export async function useDbPool(): Promise<Pool> {
  return getProdPool()
}

export function useDbPoolSync(): Pool {
  return getProdPool()
}
