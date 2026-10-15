<script setup lang="ts">
definePageMeta({ middleware: 'hoja-auth' })

const adminToken = useCookie('admin_token')
const asistenteToken = useCookie('token')

const esAdmin = computed(() => !!adminToken.value)
const volverA = computed(() => (esAdmin.value ? '/admin' : '/asistente'))

const hojas = [
  { key: 'medicos', label: 'Médicos', icono: '🧑‍⚕️' },
  { key: 'pacientes', label: 'Pacientes', icono: '🧑' },
  { key: 'empresas', label: 'Empresas', icono: '🏢' },
  { key: 'citas', label: 'Citas', icono: '📅' },
  { key: 'pagos', label: 'Pagos', icono: '💳' },
]

const activo = ref('medicos')

const hojaActiva = computed(() => hojas.find(h => h.key === activo.value))
</script>

<template>
  <div class="hoja-pagina">
    <header class="hoja-header">
      <div class="hoja-marca">
        <span class="hoja-logo">📊</span>
        <div>
          <h1>Hoja de datos</h1>
          <p>Edita tus registros como en Excel</p>
        </div>
      </div>
      <NuxtLink :to="volverA" class="btn-volver">← Volver al panel</NuxtLink>
    </header>

    <nav class="hoja-tabs">
      <button
        v-for="h in hojas"
        :key="h.key"
        :class="['hoja-tab', { activo: activo === h.key }]"
        @click="activo = h.key"
      >
        <span class="hoja-tab-ico">{{ h.icono }}</span>
        {{ h.label }}
      </button>
    </nav>

    <main class="hoja-main">
      <HojaDatos :key="activo" :recurso="activo" />
    </main>
  </div>
</template>

<style scoped>
.hoja-pagina { min-height: 100vh; background: #f4f6f8; padding: 1.25rem; box-sizing: border-box; }
.hoja-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.hoja-marca { display: flex; align-items: center; gap: 0.75rem; }
.hoja-logo { font-size: 2rem; }
.hoja-marca h1 { margin: 0; font-size: 1.35rem; color: #2d3436; }
.hoja-marca p { margin: 0; font-size: 0.82rem; color: #636e72; }
.btn-volver { background: #0984e3; color: #fff; text-decoration: none; padding: 0.55rem 1rem; border-radius: 8px; font-size: 0.88rem; font-weight: 600; white-space: nowrap; }
.btn-volver:hover { background: #0877cc; }
.hoja-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
.hoja-tab { display: inline-flex; align-items: center; gap: 0.4rem; background: #fff; border: 1px solid #e0e0e0; color: #2d3436; padding: 0.5rem 0.9rem; border-radius: 999px; font-size: 0.85rem; cursor: pointer; }
.hoja-tab:hover { background: #eef4fb; }
.hoja-tab.activo { background: #0984e3; border-color: #0984e3; color: #fff; font-weight: 600; }
.hoja-tab-ico { font-size: 1rem; }
.hoja-main { background: #fff; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06); }
</style>
