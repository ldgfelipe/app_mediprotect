export default defineNuxtRouteMiddleware(() => {
  const adminToken = useCookie('admin_token')
  const asistenteToken = useCookie('token')
  if (!adminToken.value && !asistenteToken.value) {
    return navigateTo('/admin/login')
  }
})
