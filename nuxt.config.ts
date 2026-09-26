export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    validaCurpToken: process.env.VALIDA_CURP_TOKEN || 'pruebas',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'BE8PbPyCNWpbe0iBTusqGluzp0BNN03PSwHBs3HCyCQqsxLHFltHrfxGghsNdiVTzdZpsPAEJMdTjj5o7DWIffM',
    jwtSecret: process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
    databaseUrl: process.env.DATABASE_URL || '',
    whatsappGatewayUrl: process.env.WHATSAPP_GATEWAY_URL || '',
    whatsappInstanceName: process.env.WHATSAPP_INSTANCE_NAME || '',
    whatsappGatewayApiKey: process.env.WHATSAPP_GATEWAY_APIKEY || '',
    whatsappWebhookApikey: process.env.WHATSAPP_WEBHOOK_APIKEY || '',
    whatsappWebhookAllowedIps: process.env.WHATSAPP_WEBHOOK_ALLOWED_IPS || '',
    cronSecret: process.env.CRON_SECRET || '',
    flujoAsistenciaId: process.env.FLUJO_ASISTENCIA_ID || '',
  },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  app: {
    head: {
      link: [
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },
})
