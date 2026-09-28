export default defineNitroPlugin(async () => {
  try {
    const { initializeDatabase } = await import('#server/utils/db-init')
    await initializeDatabase()
    console.log('[DB-INIT] Base de datos inicializada correctamente')
  } catch (error) {
    console.error('[DB-INIT] Error inicializando BD:', error)
  }
})