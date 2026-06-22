<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const usuario = useCookie('usuario')
const token = useCookie('token')
const paquetes = ref<any[]>([])
const miPlanActual = ref<any>(null)
const cargando = ref(true)

onMounted(async () => {
  const [r1, r2] = await Promise.all([
    useFetch('/api/paquetes'),
    useFetch('/api/paquetes/mi-plan')
  ])
  paquetes.value = ((r1.data.value as any)?.paquetes || [])
  miPlanActual.value = (r2.data.value as any)?.plan
  cargando.value = false
})

function esActual(p: any) {
  return miPlanActual.value?.id === p.id
}

function puedeMejorar(p: any) {
  return p.precio > (miPlanActual.value?.precio || 0)
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <NuxtLink to="/dashboard/paciente">&larr; Dashboard</NuxtLink>
      <h1>Planes MediProtect</h1>
      <p>Compara todos los planes y elige el que mejor se adapte a ti</p>
    </header>

    <p v-if="cargando" class="loading">Cargando planes...</p>

    <div v-else class="planes-grid">
      <div v-for="p in paquetes" :key="p.id" :class="['plan-card', esActual(p) ? 'actual' : '', puedeMejorar(p) ? 'mejorable' : '']">
        <div v-if="esActual(p)" class="badge-actual">Plan Actual</div>
        <div v-else-if="p.slug === 'esencial'" class="badge-popular">Más Popular</div>
        <div v-else-if="p.slug === 'integral'" class="badge-recomendado">Recomendado</div>

        <h2>{{ p.nombre }}</h2>
        <div class="precio">
          <strong>${{ p.precio.toLocaleString() }}</strong>
          <small>/año</small>
        </div>
        <p class="descripcion">{{ p.descripcion }}</p>

        <ul class="beneficios">
          <li v-for="b in p.beneficios" :key="b.beneficio" :class="b.tipo">
            <span v-if="b.tipo === 'check'" class="icon-check">✓</span>
            <span v-else-if="b.tipo === 'cross'" class="icon-cross">—</span>
            <span class="texto">{{ b.beneficio }}:</span>
            <span class="valor">{{ b.valor }}</span>
          </li>
        </ul>

        <button v-if="!esActual(p) && puedeMejorar(p)" class="btn-primary">
          Mejorar a {{ p.nombre }}
        </button>
        <div v-else-if="esActual(p)" class="btn-actual">Plan Actual</div>
        <div v-else class="btn-inferior">Plan inferior</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
.page-header { margin-bottom: 2rem; }
.page-header a { color: #636e72; font-size: 0.9rem; }
.page-header h1 { margin: 0.5rem 0 0.25rem; color: #2d3436; }
.page-header p { color: #636e72; font-size: 0.9rem; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.planes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
.plan-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; position: relative; display: flex; flex-direction: column; }
.plan-card.actual { border-color: #00b894; box-shadow: 0 0 0 2px rgba(0,184,148,0.15); }
.plan-card.mejorable { border-color: #b2bec3; }
.badge-actual { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #00b894; color: white; padding: 0.2rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge-popular, .badge-recomendado { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); padding: 0.2rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge-popular { background: #2d3436; color: white; }
.badge-recomendado { background: #e8f5e9; color: #2e7d32; }
h2 { font-size: 1.2rem; color: #2d3436; margin: 0 0 0.5rem; text-align: center; }
.precio { text-align: center; margin-bottom: 0.5rem; }
.precio strong { font-size: 2rem; color: #2d3436; }
.precio small { color: #636e72; font-size: 0.85rem; }
.descripcion { text-align: center; color: #636e72; font-size: 0.85rem; margin-bottom: 1rem; }
.beneficios { list-style: none; padding: 0; margin: 0 0 1.5rem; flex: 1; }
.beneficios li { padding: 0.5rem 0; border-bottom: 1px solid #f5f5f5; font-size: 0.85rem; display: flex; flex-wrap: wrap; gap: 0.25rem; }
.beneficios li.check .icon-check { color: #00b894; font-weight: bold; margin-right: 0.3rem; }
.beneficios li.cross { color: #b2bec3; }
.beneficios li.cross .icon-cross { color: #d63031; margin-right: 0.3rem; }
.texto { color: #2d3436; }
.valor { color: #636e72; margin-left: auto; font-weight: 500; }
.btn-primary { width: 100%; padding: 0.7rem; background: #00b894; color: white; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
.btn-primary:hover { background: #00a381; }
.btn-actual, .btn-inferior { width: 100%; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; text-align: center; }
.btn-actual { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.btn-inferior { background: #f5f5f5; color: #b2bec3; border: 1px solid #e0e0e0; }
</style>
