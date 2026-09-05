export function useVerificacionConfig() {
  const config = useState('verificacion_config', () => ({
    requirePhone: true,
    requireEmail: true,
    loaded: false,
  }))

  async function loadConfig() {
    if (config.value.loaded) return
    try {
      const data = await $fetch('/api/admin/configuracion', {
        query: { categoria: 'general' }
      })
      const items = data?.configuracion || []
      const map: Record<string, string> = {}
      for (const c of items) map[c.clave] = c.valor

      config.value.requirePhone = map['require_phone_verification'] !== 'false'
      config.value.requireEmail = map['require_email_verification'] !== 'false'
      config.value.loaded = true
    } catch {
      config.value.loaded = true
    }
  }

  return { config, loadConfig }
}
