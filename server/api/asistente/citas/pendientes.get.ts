import { verifyAdminOrAsistenteToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)
  const result = await pool.query(
    `SELECT c.id, c.id_paciente, c.id_medico, c.fecha_hora, c.estado, c.folio,
            c.created_at, c.whatsapp_opciones,
            COALESCE(c.whatsapp_nombre, NULLIF(CONCAT_WS(' ', p.nombre, p.apellido), '')) AS paciente_nombre,
            COALESCE(c.whatsapp_telefono, p.telefono) AS paciente_telefono,
            COALESCE(c.whatsapp_medico_nombre, NULLIF(CONCAT_WS(' ', m.nombre, m.apellido), '')) AS medico_nombre
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.estado = 'PENDIENTE_DE_COORDINACION'
        AND c.fecha_hora IS NULL
      ORDER BY c.created_at ASC`
  )
  return { ok: true, citas: result.rows }
})
