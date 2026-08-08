export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    validaCurpToken: process.env.VALIDA_CURP_TOKEN || 'pruebas',
  },
})
