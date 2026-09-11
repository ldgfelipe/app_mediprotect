
export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)
  const pool = await useDbPool(event)

  const [pacientes, medicos, citas, ingresos, empresas, pagos, planes, roles] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM pacientes'),
    pool.query('SELECT COUNT(*) FROM medicos'),
    pool.query("SELECT COUNT(*), COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes, COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas FROM citas"),
    pool.query("SELECT COALESCE(SUM(monto),0) FROM pagos WHERE estado = 'pagado'"),
    pool.query('SELECT COUNT(*) FROM empresas'),
    pool.query("SELECT COUNT(*) FILTER (WHERE estado = 'pendiente') as pagos_pendientes, COUNT(*) FILTER (WHERE estado = 'pagado') as pagos_completados FROM pagos"),
    pool.query('SELECT COUNT(*) FROM paquetes'),
    pool.query('SELECT COUNT(*) FROM usuarios_sistema'),
  ])

  return {
    stats: {
      total_pacientes: parseInt(pacientes.rows[0].count),
      total_medicos: parseInt(medicos.rows[0].count),
      total_citas: parseInt(citas.rows[0].count),
      citas_pendientes: parseInt(citas.rows[0].pendientes),
      citas_canceladas: parseInt(citas.rows[0].canceladas),
      ingresos_totales: parseFloat(ingresos.rows[0].coalesce),
      total_empresas: parseInt(empresas.rows[0].count),
      pagos_pendientes: parseInt(pagos.rows[0].pagos_pendientes),
      pagos_completados: parseInt(pagos.rows[0].pagos_completados),
      total_planes: parseInt(planes.rows[0].count),
      total_usuarios_sistema: parseInt(roles.rows[0].count),
    }
  }
})
