<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const usuario = useCookie('usuario')

onMounted(() => {
  const tipo = usuario.value?.tipo
  if (tipo === 'medico') {
    navigateTo('/dashboard/medico')
  } else {
    navigateTo('/dashboard/paciente')
  }
})
</script>

<template>
  <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
    <p>Redirigiendo...</p>
  </div>
</template>