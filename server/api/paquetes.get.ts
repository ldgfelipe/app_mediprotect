export default defineEventHandler(async () => {
  const pool = useDbPool(event)
  const paquetes = await pool.query(`
    SELECT p.*, json_agg(json_build_object(
      'beneficio', pb.beneficio,
      'valor', pb.valor,
      'tipo', pb.tipo
    ) ORDER BY pb.orden) as beneficios
    FROM paquetes p
    LEFT JOIN paquete_beneficios pb ON pb.id_paquete = p.id
    WHERE p.activo = true
    GROUP BY p.id
    ORDER BY p.precio ASC
  `)
  return { paquetes: paquetes.rows }
})
