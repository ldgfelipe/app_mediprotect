module.exports = {
  apps: [{
    name: 'mediprotect',
    script: './.output/server/index.mjs',
    env: {
      DATABASE_URL: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
      JWT_SECRET: 'mediprotect_jwt_secret_key_2026',
      JWT_EXPIRES_IN: '7d',
    },
  }]
}
