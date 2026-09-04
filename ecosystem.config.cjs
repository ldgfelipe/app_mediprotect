module.exports = {
  apps: [{
    name: 'mediprotect',
    script: './.output/server/index.mjs',
    env: {
      DATABASE_URL: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
      JWT_SECRET: 'mediprotect_jwt_secret_key_2026',
      JWT_EXPIRES_IN: '7d',
      SMTP_USER: 'b70b6d001@smtp-brevo.com',
      SMTP_PASS: 'xsmtpsib-0b83288d751eeeae05135d1afb984163468f3811e8d5163daa7693da9af6fd9e-4C0fauoTvL78Z57T',
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: '465',
      SMTP_FROM: 'agente@mediprotect.com.mx',
    },
  }]
}