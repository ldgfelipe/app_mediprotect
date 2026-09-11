
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const result = await pool.query(`
    SELECT paq.*, COALESCE(json_agg(json_build_object('id', pb.id, 'beneficio', pb.beneficio)) FILTER (WHERE pb.id IS NOT NULL), '[]') as beneficios
    FROM paquetes paq
    LEFT JOIN paquete_beneficios pb ON paq.id = pb.id_paquete
    GROUP BY paq.id
    ORDER BY paq.precio ASC
  `)
  return { planes: result.rows }
})
