import { useDbPool } from '../utils/db'
import { syncMedicosFromMediProtect } from '../utils/sync-medicos'

let schedulerStarted = false

export default defineNitroPlugin(async () => {
  if (schedulerStarted) return
  schedulerStarted = true

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') return

  const cron = await import('node-cron').catch(() => null)
  if (!cron) {
    console.log('[Scheduler] node-cron not available, skipping scheduled sync')
    return
  }

  console.log('[Scheduler] Starting doctor sync scheduler (daily at 3:00 AM)')

  cron.default('0 3 * * *', async () => {
    console.log('[Scheduler] Running scheduled doctor sync...')
    try {
      const pool = await useDbPool({} as any)
      const result = await syncMedicosFromMediProtect(pool)
      console.log(`[Scheduler] Sync completed: ${result.success} updated, ${result.errors} errors`)
    } catch (err) {
      console.error('[Scheduler] Sync failed:', err)
    }
  })

  console.log('[Scheduler] Doctor sync scheduler started')
})