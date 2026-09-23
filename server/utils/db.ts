import { Pool } from 'pg'
import { databaseUrl } from './secrets'

const PROD_URL = databaseUrl()

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
