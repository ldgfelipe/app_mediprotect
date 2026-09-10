export default defineEventHandler(async (event) => {
  const { id_medico } = getRouterParams(event)
  const pool = useDbPool()

  const result = await pool.query(
    `SELECT id, dia_semana, hora_inicio, hora_fin
     FROM disponibilidad_medico
     WHERE id_medico = $1 AND activo = true
     ORDER BY dia_semana, hora_inicio`, [id_medico]
  )

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const agrupado: Record<number, { dia: string; slots: { id: number; inicio: string; fin: string }[] }> = {}

  for (const row of result.rows) {
    if (!agrupado[row.dia_semana]) {
      agrupado[row.dia_semana] = { dia: dias[row.dia_semana], slots: [] }
    }
    agrupado[row.dia_semana].slots.push({
      id: row.id,
      inicio: row.hora_inicio.slice(0, 5),
      fin: row.hora_fin.slice(0, 5),
    })
  }

  return { disponibilidad: Object.values(agrupado) }
})
