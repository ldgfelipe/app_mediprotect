const INTERVALO = 6 * 60 * 60 * 1000

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const adminToken = useCookie('admin_token')
  const userToken = useCookie('token')
  let timer: ReturnType<typeof setInterval> | null = null

  const refrescar = async (cookie: { value: string | null | undefined }) => {
    if (!cookie.value) return true
    try {
      const r: any = await $fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cookie.value}` },
      })
      if (r?.token) cookie.value = r.token
      return true
    } catch (e: any) {
      const status = e?.status || e?.data?.statusCode
      if (status === 401) {
        cookie.value = null
        return false
      }
      return true
    }
  }

  const vencioSesionAdmin = () => {
    const ruta = window.location.pathname
    if (ruta.startsWith('/admin') && !ruta.startsWith('/admin/login')) {
      window.location.assign('/admin/login')
    }
  }

  const tick = async () => {
    const teniaAdmin = Boolean(adminToken.value)
    const ok = await refrescar(adminToken)
    if (teniaAdmin && !ok) vencioSesionAdmin()
    if (userToken.value) await refrescar(userToken)
  }

  tick()
  timer = setInterval(tick, INTERVALO)

  if (import.meta.dev) {
    // evita timers huérfanos en hot reload
    window.addEventListener('beforeunload', () => { if (timer) clearInterval(timer) })
  }
})
