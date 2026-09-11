export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)

  const pool = useDbPool(event)

  const result = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.id_rol, u.activo, u.created_at, r.nombre as rol_nombre
     FROM usuarios_sistema u
     LEFT JOIN roles r ON r.id = u.id_rol
     ORDER BY u.created_at DESC`
  )

  return { usuarios: result.rows }
})
