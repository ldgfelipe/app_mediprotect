export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    validaCurpToken: process.env.VALIDA_CURP_TOKEN || 'pruebas',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'BE8PbPyCNWpbe0iBTusqGluzp0BNN03PSwHBs3HCyCQqsxLHFltHrfxGghsNdiVTzdZpsPAEJMdTjj5o7DWIffM',
  },
  app: {
    head: {
      link: [
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },
})
