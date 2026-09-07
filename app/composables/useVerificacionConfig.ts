export function useVerificacionConfig() {
  const config = useState('verificacion_config', () => ({
    requirePhone: true,
    requireEmail: true,
    loaded: false,
  }))

  async function loadConfig() {
    if (config.value.loaded) return
    try {
      const data = await $fetch('/api/config/verificacion')
      config.value.requirePhone = data?.requirePhoneVerification !== false
      config.value.requireEmail = data?.requireEmailVerification !== false
      config.value.loaded = true
    } catch {
      config.value.loaded = true
    }
  }

  return { config, loadConfig }
}
