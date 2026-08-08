export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const curp = (query.curp as string || '').toUpperCase().trim()

  if (!curp || curp.length !== 18) {
    throw createError({ statusCode: 400, message: 'La CURP debe tener 18 caracteres' })
  }

  const token = config.validaCurpToken || 'pruebas'
  const url = `https://api.valida-curp.com.mx/curp/obtener_datos/?token=${token}&curp=${curp}`

  try {
    const response = await $fetch<any>(url)
    return response
  } catch (e: any) {
    throw createError({ statusCode: e?.status || 500, message: e?.message || 'Error al consultar CURP' })
  }
})
