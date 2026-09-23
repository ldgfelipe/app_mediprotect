interface WhatsAppConfig {
  gatewayUrl: string
  instanceName: string
  apiKey: string
}

export async function updateWhatsAppConfig(pool: any, gatewayUrl: string, instanceName: string, apiKey?: string) {
  if (!gatewayUrl || !instanceName) {
    throw new Error('gatewayUrl e instanceName son requeridos')
  }

  await pool.query(
    `INSERT INTO configuracion_sistema (clave, valor, categoria) VALUES
     ('whatsapp_gateway_url', $1, 'whatsapp'),
     ('whatsapp_instance_name', $2, 'whatsapp')
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    [gatewayUrl, instanceName]
  )

  if (apiKey) {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor, categoria) VALUES
       ('whatsapp_gateway_apikey', $1, 'whatsapp')
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
      [apiKey]
    )
  }

  return { ok: true, gatewayUrl, instanceName }
}

export async function getWhatsAppConfig(pool: any): Promise<WhatsAppConfig> {
  const result = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema WHERE categoria = 'whatsapp'`
  )
  const configMap: Record<string, string> = {}
  for (const row of result.rows) {
    configMap[row.clave] = row.valor || ''
  }

  return {
    gatewayUrl: configMap['whatsapp_gateway_url'] || 'http://127.0.0.1:8080',
    instanceName: configMap['whatsapp_instance_name'] || '',
    apiKey: configMap['whatsapp_gateway_apikey'] || '',
  }
}

export async function logMensaje(
  pool: any,
  telefono: string,
  direccion: 'in' | 'out',
  mensaje: string,
  tipo = 'text',
  whatsappMsgId?: string,
  metadata?: any
) {
  await pool.query(
    `INSERT INTO whatsapp_mensajes_log (telefono, direccion, mensaje, tipo, whatsapp_msg_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [telefono, direccion, mensaje, tipo, whatsappMsgId || null, metadata ? JSON.stringify(metadata) : '{}']
  )
}

export async function getOrCreateConversation(pool: any, telefono: string, nombre: string) {
  let result = await pool.query(
    `SELECT * FROM whatsapp_conversaciones WHERE telefono = $1`,
    [telefono]
  )

  if (result.rows.length === 0) {
    let idPaciente = null
    const pacienteRes = await pool.query(
      `SELECT id FROM pacientes WHERE telefono = $1 OR regexp_replace(telefono, '[^0-9]', '', 'g') LIKE '%' || $2 || '%' LIMIT 1`,
      [telefono, telefono.replace(/[^0-9]/g, '')]
    )
    if (pacienteRes.rows.length > 0) {
      idPaciente = pacienteRes.rows[0].id
    }

    result = await pool.query(
      `INSERT INTO whatsapp_conversaciones (telefono, nombre_paciente, id_paciente, estado, datos_temp)
       VALUES ($1, $2, $3, 'bienvenida', '{}')
       RETURNING *`,
      [telefono, nombre || null, idPaciente]
    )
  }

  return result.rows[0]
}

export async function updateConversationState(pool: any, id: string, estado: string, datosTemp: any) {
  await pool.query(
    `UPDATE whatsapp_conversaciones
     SET estado = $1, datos_temp = $2, updated_at = NOW()
     WHERE id = $3`,
    [estado, JSON.stringify(datosTemp), id]
  )
}

export async function getAvailableSpecialties(pool: any) {
  const result = await pool.query(
    `SELECT DISTINCT especialidad
     FROM medicos
     WHERE activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     AND especialidad IS NOT NULL
     ORDER BY especialidad`
  )
  return result.rows.map((r: any) => r.especialidad)
}

export async function getDoctorsBySpecialty(pool: any, especialidad: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, precio_regular, especialidad
     FROM medicos
     WHERE especialidad = $1
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     ORDER BY nombre`,
    [especialidad]
  )
  return result.rows
}

export async function getAvailableDates(pool: any, medicoId: string) {
  const result = await pool.query(
    `SELECT DISTINCT fecha_hora::date as dia
     FROM generate_series(
       CURRENT_DATE,
       CURRENT_DATE + INTERVAL '14 days',
       '1 day'::interval
     ) AS fecha
     WHERE NOT EXISTS (
       SELECT 1 FROM citas
       WHERE id_medico = $1
       AND fecha_hora::date = fecha::date
       AND estado NOT IN ('cancelada')
     )
     ORDER BY dia
     LIMIT 7`,
    [medicoId]
  )
  return result.rows.map((r: any) => r.dia)
}

export async function getAvailableHours(pool: any, medicoId: string, fecha: string) {
  const horas = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ]

  const ocupadas = await pool.query(
    `SELECT EXTRACT(HOUR FROM fecha_hora)::text || ':' ||
            LPAD(EXTRACT(MINUTE FROM fecha_hora)::text, 2, '0') as hora
     FROM citas
     WHERE id_medico = $1
     AND fecha_hora::date = $2::date
     AND estado NOT IN ('cancelada')`,
    [medicoId, fecha]
  )

  const ocupadasSet = new Set(ocupadas.rows.map((r: any) => r.hora))
  return horas.filter(h => !ocupadasSet.has(h))
}

export async function createCitaFromWhatsApp(
  pool: any,
  medicoId: string,
  pacienteId: string | null,
  fecha: string,
  hora: string,
  telefonoPaciente: string,
  nombrePaciente: string
) {
  const fechaHora = `${fecha}T${hora}:00`

  const medicoRes = await pool.query(
    `SELECT precio_regular, porcentaje_descuento, monto_comision
     FROM medicos WHERE id = $1`,
    [medicoId]
  )
  const medico = medicoRes.rows[0]
  const precioRegular = medico?.precio_regular || 1000
  const descuento = medico?.porcentaje_descuento || 10
  const precioAcordado = precioRegular * (1 - descuento / 100)

  const result = await pool.query(
    `INSERT INTO citas (id_paciente, id_medico, fecha_hora, precio_acordado, notas_paciente, estado)
     VALUES ($1, $2, $3::timestamptz, $4, $5, 'pendiente')
     RETURNING *`,
    [pacienteId, medicoId, fechaHora, precioAcordado, `Cita agendada vía WhatsApp por ${nombrePaciente}`]
  )

  return result.rows[0]
}

export async function searchPatientByPhone(pool: any, telefono: string) {
  const digits = telefono.replace(/[^0-9]/g, '')
  const result = await pool.query(
     `SELECT id, nombre, apellido, email, telefono
     FROM pacientes
     WHERE telefono = $1
     OR regexp_replace(telefono, '[^0-9]', '', 'g') LIKE '%' || $2 || '%'
     LIMIT 1`,
    [telefono, digits]
  )
  return result.rows[0] || null
}

export async function searchPatientById(pool: any, id: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, email, telefono
     FROM pacientes
     WHERE id::text = $1 OR id = $1::uuid
     LIMIT 1`,
    [id]
  )
  return result.rows[0] || null
}

export async function searchDoctorBySlug(pool: any, slug: string) {
  const result = await pool.query(
    `SELECT id, nombre, apellido, slug, precio_regular, porcentaje_descuento, especialidad
     FROM medicos
     WHERE slug = $1
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     LIMIT 1`,
    [slug]
  )
  return result.rows[0] || null
}

export async function searchDoctorByName(pool: any, nombre: string) {
  const search = `%${nombre.toLowerCase()}%`
  const result = await pool.query(
    `SELECT id, nombre, apellido, slug, precio_regular, porcentaje_descuento, especialidad
     FROM medicos
     WHERE (
       LOWER(nombre) LIKE $1
       OR LOWER(apellido) LIKE $1
       OR LOWER(slug) LIKE $1
       OR LOWER(CONCAT(nombre, ' ', apellido)) LIKE $1
     )
     AND activo = true
     AND (estatus_medico IS NULL OR estatus_medico = 'activo')
     LIMIT 1`,
    [search]
  )
  return result.rows[0] || null
}

export function getDiasDisponibles(): { id: string; titulo: string; descripcion: string }[] {
  const hoy = new Date()
  const dias: { id: string; titulo: string; descripcion: string }[] = []
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  let d = new Date(hoy)
  d.setDate(d.getDate() + 1)
  while (dias.length < 5) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dias.push({
        id: `dia_${fechaStr}`,
        titulo: `${DIAS[dayOfWeek]} ${d.getDate()} ${MESES[d.getMonth()]}`,
        descripcion: fechaStr,
      })
    }
    d.setDate(d.getDate() + 1)
  }
  return dias
}

export function getHorasDisponibles(): { id: string; titulo: string; descripcion: string }[] {
  const horas: { id: string; titulo: string; descripcion: string }[] = []
  for (let h = 9; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 20 && m > 0) break
      const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const hour12 = h > 12 ? h - 12 : h
      const suffix = h >= 12 ? 'PM' : 'AM'
      horas.push({
        id: `hora_${hora}`,
        titulo: `${hour12}:${String(m).padStart(2, '0')} ${suffix}`,
        descripcion: hora,
      })
    }
  }
  return horas
}
