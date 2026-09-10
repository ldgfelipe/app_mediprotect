export default defineEventHandler(async (event) => {
  const b = await readBody(event)
  const {
    curp, nombre, apellido_paterno, apellido_materno,
    fecha_nacimiento, genero, email, telefono, password,
    codigo_postal, colonia, municipio, estado, ciudad, direccion,
    doctor_nombre
  } = b

  if (!curp || curp.length !== 18) {
    throw createError({ statusCode: 400, message: 'CURP requerida (18 caracteres)' })
  }

  try {
    const pool = useDbPool(event)

    // Si ya existe un pre-registro pendiente con esta CURP, actualizarlo
    const existing = await pool.query(
      'SELECT id FROM pre_registros WHERE curp = $1 AND estado_registro = $2',
      [curp.toUpperCase().trim(), 'pendiente']
    )

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE pre_registros SET
          nombre = $2, apellido_paterno = $3, apellido_materno = $4,
          fecha_nacimiento = $5, genero = $6, email = $7, telefono = $8,
          password = $9, codigo_postal = $10, colonia = $11,
          municipio = $12, estado = $13, ciudad = $14, direccion = $15,
          doctor_nombre = $16, actualizado_en = NOW()
         WHERE id = $1`,
        [existing.rows[0].id, nombre || null, apellido_paterno || null, apellido_materno || null,
          fecha_nacimiento || null, genero || null, email || null, telefono || null,
          password || null, codigo_postal || null, colonia || null,
          municipio || null, estado || null, ciudad || null, direccion || null,
          doctor_nombre || null]
      )
      return { ok: true, pre_registro_id: existing.rows[0].id, actualizado: true }
    }

    // Crear nuevo pre-registro
    const result = await pool.query(
      `INSERT INTO pre_registros (
        curp, nombre, apellido_paterno, apellido_materno,
        fecha_nacimiento, genero, email, telefono, password,
        codigo_postal, colonia, municipio, estado, ciudad, direccion,
        doctor_nombre, estado_registro
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pendiente')
      RETURNING id`,
      [curp.toUpperCase().trim(), nombre || null, apellido_paterno || null, apellido_materno || null,
        fecha_nacimiento || null, genero || null, email || null, telefono || null,
        password || null, codigo_postal || null, colonia || null,
        municipio || null, estado || null, ciudad || null, direccion || null,
        doctor_nombre || null]
    )

    return { ok: true, pre_registro_id: result.rows[0].id, actualizado: false }
  } catch (e: any) {
    // Si la tabla no existe, devolver respuesta graceful
    if (e?.code === '42P01') {
      return { ok: false, error: 'Tabla pre_registros no disponible', skip: true }
    }
    return { ok: false, error: 'Error interno', skip: true }
  }
})
