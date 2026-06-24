<script setup lang="ts">
</script>

<template>
  <div class="page">
    <header class="page-header">
      <NuxtLink to="/">&larr; Inicio</NuxtLink>
      <h1>¿Eres una empresa?</h1>
      <p>Únete a MediProtect como empresa aliada y ofrece beneficios de salud a tus colaboradores</p>
    </header>

    <div class="info-card">
      <p>En MediProtect trabajamos con empresas para brindar acceso a servicios de salud con descuento.<br>
      Si deseas afiliar a tu empresa, comunícate con un asesor:</p>
      <div class="contacto">
        <a href="mailto:hola@mediprotect.com.mx">hola@mediprotect.com.mx</a>
        <a href="tel:+522228021933">+52 (222) 802 19 33</a>
      </div>
    </div>

    <NuxtLink to="/" class="btn-primary">Volver al Inicio</NuxtLink>
  </div>
</template>

<style scoped>
.page { max-width: 700px; margin: 0 auto; padding: 2rem 1rem; text-align: center; }
.page-header { margin-bottom: 2rem; }
.page-header a { color: #636e72; font-size: 0.9rem; text-decoration: none; }
.page-header h1 { margin: 0.5rem 0 0.25rem; color: #2d3436; }
.page-header p { color: #636e72; font-size: 0.9rem; }
.info-card { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 12px; padding: 2.5rem; margin-bottom: 2rem; }
.info-card p { font-size: 1.05rem; color: #2d3436; line-height: 1.6; margin-bottom: 2rem; }
.contacto { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; }
.contacto a { color: #00b894; font-weight: 600; text-decoration: none; font-size: 1.1rem; padding: 0.5rem 1rem; border: 1px solid #00b894; border-radius: 8px; transition: 0.2s; }
.contacto a:hover { background: #00b894; color: white; }
.btn-primary { display: inline-block; padding: 0.7rem 2rem; background: #00b894; color: white; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; text-decoration: none; }
.btn-primary:hover { background: #00a381; }
</style>
