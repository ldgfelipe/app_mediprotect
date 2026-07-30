<script setup>
const paquetes = ref([])
const cargando = ref(true)
const usuario = ref(null)
const planActualId = ref(null)
const procesando = ref(false)
const mensajeExito = ref('')
const mensajeError = ref('')
const pagosConfigurados = ref(false)

const planesDisponibles = computed(() => {
  if (pagosConfigurados.value) return paquetes.value
  return paquetes.value.filter(p => parseFloat(p.precio) === 0)
})

onMounted(async () => {
  try {
    const r1 = await $fetch('/api/paquetes')
    paquetes.value = r1.paquetes || []
  } catch (e) { console.error(e) }

  try {
    const config = await $fetch('/api/pagos/configuracion')
    pagosConfigurados.value = config.configurado
  } catch (e) { console.error(e) }

  // Check if logged in
  try {
    const tokenCookie = useCookie('token')
    const usuarioCookie = useCookie('usuario')
    if (tokenCookie.value && usuarioCookie.value) {
      usuario.value = usuarioCookie.value
      // Fetch current plan
      const planData = await $fetch('/api/paquetes/mi-plan', {
        headers: { Authorization: `Bearer ${tokenCookie.value}` }
      })
      if (planData.plan) {
        planActualId.value = planData.plan.id
      }
    }
  } catch (e) {
    // Not logged in, that's ok
  }

  cargando.value = false
})

function contratar(slug) {
  if (usuario.value) {
    // Logged in: go to plan selection in registration (or handle change)
    return
  }
  navigateTo({ path: '/registro', query: { plan: slug } })
}

async function cambiarPlan(plan) {
  if (!usuario.value) {
    navigateTo({ path: '/registro', query: { plan: plan.slug } })
    return
  }

  if (planActualId.value === plan.id) return

  procesando.value = true
  mensajeError.value = ''
  mensajeExito.value = ''

  try {
    const tokenCookie = useCookie('token')
    const data = await $fetch('/api/paquetes/cambiar-plan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCookie.value}` },
      body: { id_nuevo_plan: plan.id }
    })

    if (data.requiere_pago) {
      // Redirect to checkout
      navigateTo({ path: '/checkout', query: { pago_id: data.pago_id } })
    } else {
      mensajeExito.value = `Plan cambiado a ${data.plan_nombre} correctamente`
      planActualId.value = plan.id
      setTimeout(() => { mensajeExito.value = '' }, 3000)
    }
  } catch (e) {
    mensajeError.value = e.data?.message || e.message || 'Error al cambiar plan'
    setTimeout(() => { mensajeError.value = '' }, 4000)
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <NuxtLink to="/dashboard/paciente">&larr; Dashboard</NuxtLink>
      <h1>Planes MediProtect</h1>
      <p>Compara todos los planes y elige el que mejor se adapte a ti</p>
    </header>

    <div v-if="mensajeExito" class="msg-success">{{ mensajeExito }}</div>
    <div v-if="mensajeError" class="msg-error">{{ mensajeError }}</div>

    <p v-if="cargando" class="loading">Cargando planes...</p>

    <div v-else class="planes-grid">
      <div v-for="p in planesDisponibles" :key="p.id" class="plan-card" :class="{ actual: planActualId === p.id }">
        <div v-if="planActualId === p.id" class="badge-actual">Tu Plan Actual</div>
        <div v-else-if="p.slug === 'esencial'" class="badge-popular">Más Popular</div>
        <div v-else-if="p.slug === 'integral'" class="badge-recomendado">Recomendado</div>

        <h2>{{ p.nombre }}</h2>
        <div class="precio">
          <strong>{{ p.precio === 0 ? 'Gratis' : '$' + p.precio.toLocaleString() }}</strong>
          <small v-if="p.precio > 0">/año</small>
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

        <button v-if="planActualId === p.id" class="btn-actual" disabled>
          Plan Actual
        </button>
        <button v-else-if="usuario" @click="cambiarPlan(p)" class="btn-primary" :disabled="procesando">
          {{ procesando ? 'Procesando...' : (p.precio === 0 ? 'Cambiar a Gratis' : 'Cambiar a ' + p.nombre) }}
        </button>
        <button v-else @click="contratar(p.slug)" class="btn-primary">
          {{ p.precio === 0 ? 'Afiliarme Gratis' : 'Contratar ' + p.nombre }}
        </button>
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
.msg-success { background: #e8f5e9; color: #2e7d32; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center; }
.msg-error { background: #ffebee; color: #c62828; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center; }
.planes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
.plan-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; position: relative; display: flex; flex-direction: column; }
.plan-card.actual { border-color: #00b894; box-shadow: 0 0 0 2px rgba(0,184,148,0.15); }
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
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-actual { width: 100%; padding: 0.7rem; background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; border-radius: 8px; font-size: 0.9rem; cursor: default; }
</style>
