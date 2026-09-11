import { Pool } from 'pg'
import { getRequestHost } from 'h3'

const PROD_URL = process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
const TEST_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:mediprotect2026%40@db.dhadacgebhdiantlhllz.supabase.co:5432/postgres'

let prodPool: Pool | null = null
let testPool: Pool | null = null

// Cache del toggle de DB (se refresca cada 60s)
let dbMode: string | null = null
let dbModeLastCheck = 0
const DB_MODE_CACHE_TTL = 60000 // 60 segundos

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

// Consultar toggle de DB desde produccion (siempre lee de prod)
async function getDbModeFromProd(): Promise<string> {
  const now = Date.now()
  if (dbMode && (now - dbModeLastCheck) < DB_MODE_CACHE_TTL) {
    return dbMode
  }
  try {
    const pool = getProdPool()
    const result = await pool.query(
      "SELECT valor FROM configuracion_sistema WHERE clave = 'sistema_db_activa' LIMIT 1"
    )
    if (result.rows.length > 0) {
      dbMode = result.rows[0].valor
    } else {
      dbMode = 'produccion'
    }
    dbModeLastCheck = now
  } catch {
    dbMode = 'produccion'
    dbModeLastCheck = now
  }
  return dbMode
}

// Backward compatible: siempre retorna pool de producción
export function getPool(): Pool {
  return getProdPool()
}

// Auto-detect via event context: localhost → test, producción → prod
// Lee el toggle sistema_db_activa de la DB de produccion para redirigir
export async function useDbPool(event?: any): Promise<Pool> {
  // localhost siempre usa test
  if (event) {
    try {
      const host = getRequestHost(event) || ''
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return getTestPool()
      }
    } catch {}
  }

  // En produccion: verificar toggle sistema_db_activa
  const mode = await getDbModeFromProd()
  if (mode === 'pruebas') {
    return getTestPool()
  }
  return getProdPool()
}

// Version sincrona para casos donde no se puede usar await
export function useDbPoolSync(event?: any): Pool {
  if (event) {
    try {
      const host = getRequestHost(event) || ''
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return getTestPool()
      }
    } catch {}
  }
  if (dbMode === 'pruebas') {
    return getTestPool()
  }
  return getProdPool()
}
