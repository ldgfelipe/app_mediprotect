export default defineEventHandler((event) => {
  const path = event.path || ''

  if (path.startsWith('/api/')) {
    const origin = getHeader(event, 'origin') || ''
    const allowedOrigins = ['https://www.mediprotect.com.mx', 'http://localhost:3000', 'http://127.0.0.1:3000']
    const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://www.mediprotect.com.mx'
    setHeader(event, 'Access-Control-Allow-Origin', corsOrigin)
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
    setHeader(event, 'Access-Control-Max-Age', '86400')

    if (getMethod(event) === 'OPTIONS') {
      setResponseStatus(event, 204)
      return ''
    }
  }
})
