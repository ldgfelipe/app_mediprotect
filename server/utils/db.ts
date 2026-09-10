import { Pool } from 'pg'
import { getRequestHost, useEvent } from 'h3'

const PROD_URL = process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
const TEST_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:mediprotect2026%40@db.dhadacgebhdiantlhllz.supabase.co:5432/postgres'

let prodPool: Pool | null = null
let testPool: Pool | null = null

function createPool(url: string): Pool {
  const p = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
  p.on('error', (err) => console.error('Pool error:', err))
  return p
}

function getProdPool(): Pool {
  if (!prodPool) prodPool = createPool(PROD_URL)
  return prodPool
}

function getTestPool(): Pool {
  if (!testPool) testPool = createPool(TEST_URL)
  return testPool
}

// Backward compatible: siempre retorna pool de producción
export function getPool(): Pool {
  return getProdPool()
}

// Auto-detect: localhost → test, producción → prod
export function useDbPool(): Pool {
  try {
    const event = useEvent()
    const host = getRequestHost(event) || ''
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return getTestPool()
    }
  } catch {}
  return getProdPool()
}
