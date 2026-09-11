
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = useDbPool(event)
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  )

  const tables = []
  for (const t of result.rows) {
    const name = t.table_name
    const countRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM ${name}`)
    const colRes = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
      [name]
    )
    tables.push({
      name,
      row_count: parseInt(countRes.rows[0].cnt),
      columns: colRes.rows.map((c: any) => ({ name: c.column_name, type: c.data_type }))
    })
  }

  return { tables }
})
