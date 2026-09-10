export default defineEventHandler(async () => {
  const pool = useDbPool()

  const result = await pool.query(`
    SELECT
      e.id,
      e.nombre,
      e.slug,
      e.icono,
      e.color,
      e.descripcion,
      COUNT(m.id) as total_medicos
    FROM especialidades e
    LEFT JOIN medicos m ON m.id_especialidad = e.id AND m.activo = true
    GROUP BY e.id, e.nombre, e.slug, e.icono, e.color, e.descripcion
    ORDER BY e.nombre ASC
  `)

  const categorias = result.rows.map((r: any) => ({
    id: r.id,
    nombre: r.nombre,
    slug: r.slug,
    icono: r.icono,
    color: r.color || 'primary',
    descripcion: r.descripcion,
    total_medicos: Number(r.total_medicos),
  }))

  return { categorias, total: categorias.length }
})
