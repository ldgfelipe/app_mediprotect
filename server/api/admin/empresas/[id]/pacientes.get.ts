
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const id = getRouterParam(event, 'id')
  const pool = useDbPool(event)

  const result = await pool.query(`
    SELECT ep.*, p.nombre, p.apellido, p.email, p.telefono
    FROM empresa_pacientes ep
    JOIN pacientes p ON p.id = ep.id_paciente
    WHERE ep.id_empresa = $1 AND ep.activo = true
    ORDER BY ep.fecha_asignacion DESC
  `, [id])

  return { pacientes: result.rows }
})
