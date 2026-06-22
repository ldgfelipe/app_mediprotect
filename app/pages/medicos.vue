<script setup lang="ts">
const especialidades = ref<any[]>([])
const medicos = ref<any[]>([])
const filters = ref({ especialidad: '', ciudad: '', estado: '', search: '' })
const loading = ref(false)

onMounted(async () => {
  const { data } = await useFetch('/api/especialidades')
  especialidades.value = (data.value as any)?.especialidades || []
  await buscar()
})

async function buscar() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.especialidad) params.set('especialidad', filters.value.especialidad)
    if (filters.value.ciudad) params.set('ciudad', filters.value.ciudad)
    if (filters.value.estado) params.set('estado', filters.value.estado)
    if (filters.value.search) params.set('search', filters.value.search)
    const qs = params.toString()
    const { data } = await useFetch(qs ? `/api/medicos?${qs}` : '/api/medicos')
    medicos.value = (data.value as any)?.medicos || []
  } catch {}
  finally { loading.value = false }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <NuxtLink to="/dashboard/paciente">&larr; Volver</NuxtLink>
      <h1>Buscar Médicos</h1>
      <p>Encuentra especialistas en nuestra red</p>
    </header>

    <section class="filters">
      <input v-model="filters.search" placeholder="Buscar por nombre o bio..." @input="buscar" />
      <select v-model="filters.especialidad" @change="buscar">
        <option value="">Todas las especialidades</option>
        <option v-for="e in especialidades" :key="e.id" :value="e.id">{{ e.nombre }}</option>
      </select>
      <input v-model="filters.ciudad" placeholder="Ciudad" @input="buscar" />
      <input v-model="filters.estado" placeholder="Estado" @input="buscar" />
    </section>

    <p v-if="loading" class="loading">Buscando...</p>
    <p v-else-if="!medicos.length" class="empty">No se encontraron médicos con esos filtros.</p>

    <div v-else class="grid">
      <div v-for="m in medicos" :key="m.id" class="card-medico">
        <div class="card-header">
          <div class="avatar">{{ m.nombre.charAt(0) }}{{ m.apellido.charAt(0) }}</div>
          <div>
            <h3>Dr. {{ m.nombre }} {{ m.apellido }}</h3>
            <span class="especialidad">{{ m.especialidad }}</span>
          </div>
        </div>
        <p v-if="m.consultorio_ciudad" class="ubicacion">{{ m.consultorio_ciudad }}, {{ m.consultorio_estado }}</p>
        <p v-if="m.bio" class="bio">{{ m.bio }}</p>
        <div class="card-footer">
          <span class="confianza">Confianza: {{ m.score_confianza }}/5</span>
          <NuxtLink :to="`/medicos/${m.id}`" class="btn-card">Agendar Cita</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; }
.page-header { margin-bottom: 1.5rem; }
.page-header a { color: #636e72; font-size: 0.9rem; }
.page-header h1 { margin: 0.5rem 0 0.25rem; color: #2d3436; }
.page-header p { color: #636e72; font-size: 0.9rem; }
.filters { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 2rem; }
.filters input, .filters select { padding: 0.6rem 0.8rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.9rem; flex: 1; min-width: 150px; }
.loading, .empty { text-align: center; color: #636e72; padding: 2rem; }
.grid { display: grid; gap: 1rem; }
.card-medico { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; }
.card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
.avatar { width: 48px; height: 48px; border-radius: 50%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #2e7d32; font-size: 1rem; }
.especialidad { font-size: 0.85rem; color: #00b894; font-weight: 500; }
.ubicacion { font-size: 0.85rem; color: #636e72; margin-bottom: 0.5rem; }
.bio { font-size: 0.9rem; color: #2d3436; margin-bottom: 0.75rem; line-height: 1.4; }
.card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; }
.confianza { font-size: 0.8rem; color: #636e72; }
.btn-card { display: inline-block; padding: 0.4rem 1rem; background: #2d3436; color: white; border-radius: 6px; font-size: 0.85rem; text-decoration: none; }
.btn-card:hover { background: #00b894; }
</style>
