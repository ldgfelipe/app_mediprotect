const DDL = `
  CREATE TABLE IF NOT EXISTS medico_clicks (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    origen VARCHAR(50),
    id_medico UUID,
    medico_nombre VARCHAR(200),
    especialidad VARCHAR(150),
    ubicacion VARCHAR(200),
    pagina TEXT,
    referrer TEXT,
    sesion_id VARCHAR(64),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`

export default defineEventHandler(async (event) => {
  const b = await readBody(event).catch(() => null)
  if (!b) throw createError({ statusCode: 400, message: 'Payload vacio' })

  const tipo = String(b.tipo || '').trim()
  if (!tipo) throw createError({ statusCode: 400, message: 'Falta el campo tipo' })

  const pool = await useDbPool(event)
  const sql = `INSERT INTO medico_clicks (
      tipo, origen, id_medico, medico_nombre, especialidad, ubicacion,
      pagina, referrer, sesion_id, utm_source, utm_medium, utm_campaign, user_agent
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING id, created_at`
  const valores = [
    tipo,
    b.origen || null,
    b.id_medico || null,
    b.medico_nombre || null,
    b.especialidad || null,
    b.ubicacion || null,
    b.pagina || null,
    b.referrer || null,
    b.sesion_id || null,
    b.utm_source || null,
    b.utm_medium || null,
    b.utm_campaign || null,
    String(b.user_agent || '').slice(0, 500),
  ]

  for (let intento = 0; intento < 2; intento++) {
    try {
      const result = await pool.query(sql, valores)
      return { ok: true, id: result.rows[0].id, created_at: result.rows[0].created_at }
    } catch (e: any) {
      if (e?.code !== '42P01') {
        console.error('[tracking/clic]', e?.message)
        return { ok: false, error: 'Error interno' }
      }
      console.warn('[tracking/clic] tabla aun no visible, reintentando (intento', intento + 1, ')')
      try {
        await pool.query(DDL)
      } catch (ddlErr: any) {
        console.error('[tracking/clic] DDL:', ddlErr?.message)
      }
    }
  }
  return { ok: false, skip: true, error: 'Tabla medico_clicks no disponible' }
})
