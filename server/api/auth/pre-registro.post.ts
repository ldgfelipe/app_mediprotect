import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nombre, telefono, email, id_medico } = body

  if (!nombre || !telefono || !id_medico) {
    throw createError({ statusCode: 400, message: 'nombre, telefono e id_medico son requeridos' })
  }

  const pool = getPool()

  const medico = await pool.query(
    'SELECT id, nombre, apellido, telefono FROM medicos WHERE id = $1 AND activo = true', [id_medico]
  )
  if (medico.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  let id_paciente = null
  let esNuevo = false

  if (email) {
    const existente = await pool.query('SELECT id, nombre, apellido FROM pacientes WHERE email = $1', [email])
    if (existente.rows.length > 0) {
      id_paciente = existente.rows[0].id
    }
  }

  if (!id_paciente && telefono) {
    const existente = await pool.query('SELECT id, nombre, apellido FROM pacientes WHERE telefono = $1', [telefono])
    if (existente.rows.length > 0) {
      id_paciente = existente.rows[0].id
    }
  }

  if (!id_paciente) {
    const password_temp = Math.random().toString(36).slice(-8)
    const password_hash = await bcrypt.hash(password_temp, 10)
    const emailDef = email || `${telefono.replace(/[^0-9]/g, '')}@pre.mediprotect.com.mx`
    const nuevo = await pool.query(
      `INSERT INTO pacientes (nombre, apellido, email, password_hash, telefono)
       VALUES ($1, '', $2, $3, $4)
       RETURNING id`,
      [nombre, emailDef, password_hash, telefono]
    )
    id_paciente = nuevo.rows[0].id
    esNuevo = true

    await pool.query(
      `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
       VALUES ($1, 1, NOW(), true)`,
      [id_paciente]
    )
  }

  const folioRes = await pool.query(
    `SELECT 'MP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6)) as folio`
  )
  const folio = folioRes.rows[0].folio

  await pool.query(
    `INSERT INTO solicitudes (folio, id_paciente, id_medico, nombre, telefono, email)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [folio, id_paciente, id_medico, nombre, telefono, email || null]
  )

  const m = medico.rows[0]
  const whatsappNum = m.telefono || process.env.WHATSAPP_NUMBER || '521234567890'
  const telefonoLimpio = whatsappNum.replace(/[^0-9]/g, '')
  const mensaje = encodeURIComponent(
    `Hola Dr. ${m.nombre} ${m.apellido}, soy ${nombre}, folio ${folio}, quiero agendar mi cita.`
  )
  const waLink = `https://wa.me/${telefonoLimpio}?text=${mensaje}`

  setResponseStatus(event, 201)
  return {
    folio,
    wa_link: waLink,
    es_nuevo: esNuevo,
    paciente_id: id_paciente,
  }
})
