export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const codigoPostal = (query.zip_code || query.codigo_postal || '').toString().trim()

  if (!codigoPostal || !/^\d{5}$/.test(codigoPostal)) {
    throw createError({ statusCode: 400, message: 'Codigo postal invalido. Debe ser 5 digitos.' })
  }

  try {
    const data = await $fetch<any>(`https://sepomex.kurenn.dev/api/v1/zip_codes?zip_code=${codigoPostal}`)

    const colonias = data?.zip_codes?.map((item: any) => ({
      colonia: item.d_asenta,
      tipo_colonia: item.d_tipo_asenta,
      municipio: item.d_mnpio,
      ciudad: item.d_ciudad,
      estado: item.d_estado,
      codigo_postal: item.d_codigo
    })) || []

    const municipio = colonias.length > 0 ? colonias[0].municipio : null
    const ciudad = colonias.length > 0 ? colonias[0].ciudad : null
    const estado = colonias.length > 0 ? colonias[0].estado : null

    return { colonias, municipio, ciudad, estado }
  } catch (e: any) {
    throw createError({
      statusCode: 502,
      message: 'No se pudo consultar el codigo postal'
    })
  }
})
