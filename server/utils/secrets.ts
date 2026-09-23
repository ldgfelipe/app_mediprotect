export function jwtSecret(): string {
  return useRuntimeConfig().jwtSecret || 'mediprotect_jwt_secret_key_2026'
}

export function databaseUrl(): string {
  return useRuntimeConfig().databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
}