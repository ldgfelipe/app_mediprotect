export default defineEventHandler((event) => {
  const path = event.path || ''

  if (path.startsWith('/api/')) {
    setHeader(event, 'Access-Control-Allow-Origin', 'https://www.mediprotect.com.mx')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
    setHeader(event, 'Access-Control-Max-Age', '86400')

    if (getMethod(event) === 'OPTIONS') {
      setResponseStatus(event, 204)
      return ''
    }
  }
})
