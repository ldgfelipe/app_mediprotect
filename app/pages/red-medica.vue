<script setup lang="ts">
interface Categoria {
  id: number
  nombre: string
  slug: string
  icono: string
  color: string
  descripcion: string | null
  total_medicos: number
}

const categorias = ref<Categoria[]>([])
const loading = ref(true)
const search = ref('')

const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
  'primary':   { bg: 'bg-[#2B7A9F]/10',    text: 'text-[#2B7A9F]',    hover: 'group-hover:bg-[#2B7A9F]' },
  'accent':    { bg: 'bg-[#00B4A8]/10',     text: 'text-[#00B4A8]',    hover: 'group-hover:bg-[#00B4A8]' },
  'accent2':   { bg: 'bg-[#4A90E2]/10',     text: 'text-[#4A90E2]',    hover: 'group-hover:bg-[#4A90E2]' },
  'blue':      { bg: 'bg-blue-100',          text: 'text-blue-500',     hover: 'group-hover:bg-blue-500' },
  'green':     { bg: 'bg-green-100',         text: 'text-green-600',    hover: 'group-hover:bg-green-500' },
  'red':       { bg: 'bg-red-100',           text: 'text-red-500',      hover: 'group-hover:bg-red-500' },
  'pink':      { bg: 'bg-pink-100',          text: 'text-pink-500',     hover: 'group-hover:bg-pink-500' },
  'purple':    { bg: 'bg-purple-100',        text: 'text-purple-500',   hover: 'group-hover:bg-purple-500' },
  'orange':    { bg: 'bg-orange-100',        text: 'text-orange-500',   hover: 'group-hover:bg-orange-500' },
  'teal':      { bg: 'bg-teal-100',          text: 'text-teal-500',     hover: 'group-hover:bg-teal-500' },
  'amber':     { bg: 'bg-amber-100',         text: 'text-amber-500',    hover: 'group-hover:bg-amber-500' },
  'sky':       { bg: 'bg-sky-100',           text: 'text-sky-500',      hover: 'group-hover:bg-sky-500' },
  'rose':      { bg: 'bg-rose-100',          text: 'text-rose-500',     hover: 'group-hover:bg-rose-500' },
  'cyan':      { bg: 'bg-cyan-100',          text: 'text-cyan-500',     hover: 'group-hover:bg-cyan-500' },
  'fuchsia':   { bg: 'bg-fuchsia-100',       text: 'text-fuchsia-500',  hover: 'group-hover:bg-fuchsia-500' },
  'emerald':   { bg: 'bg-emerald-100',       text: 'text-emerald-500',  hover: 'group-hover:bg-emerald-500' },
  'indigo':    { bg: 'bg-indigo-100',        text: 'text-indigo-500',   hover: 'group-hover:bg-indigo-500' },
  'lime':      { bg: 'bg-lime-100',          text: 'text-lime-500',     hover: 'group-hover:bg-lime-500' },
  'violet':    { bg: 'bg-violet-100',        text: 'text-violet-500',   hover: 'group-hover:bg-violet-500' },
  'yellow':    { bg: 'bg-yellow-100',        text: 'text-yellow-500',   hover: 'group-hover:bg-yellow-500' },
  'slate':     { bg: 'bg-slate-100',         text: 'text-slate-500',    hover: 'group-hover:bg-slate-500' },
  // Darker variants
  'red-600':   { bg: 'bg-red-200',           text: 'text-red-600',      hover: 'group-hover:bg-red-600' },
  'amber-600': { bg: 'bg-amber-200',         text: 'text-amber-600',    hover: 'group-hover:bg-amber-600' },
  'cyan-600':  { bg: 'bg-cyan-200',          text: 'text-cyan-600',     hover: 'group-hover:bg-cyan-600' },
  'indigo-600':{ bg: 'bg-indigo-200',        text: 'text-indigo-600',   hover: 'group-hover:bg-indigo-600' },
  'lime-600':  { bg: 'bg-lime-200',          text: 'text-lime-600',     hover: 'group-hover:bg-lime-600' },
  'green-600': { bg: 'bg-green-200',         text: 'text-green-600',    hover: 'group-hover:bg-green-600' },
  'orange-600':{ bg: 'bg-orange-200',        text: 'text-orange-600',   hover: 'group-hover:bg-orange-600' },
  'fuchsia-600':{ bg: 'bg-fuchsia-200',      text: 'text-fuchsia-600',  hover: 'group-hover:bg-fuchsia-600' },
  'purple-600':{ bg: 'bg-purple-200',        text: 'text-purple-600',   hover: 'group-hover:bg-purple-600' },
}

function getColor(color: string) {
  return colorMap[color] || colorMap['primary']
}

const categoriasFiltradas = computed(() => {
  if (!search.value) return categorias.value
  const q = search.value.toLowerCase()
  return categorias.value.filter(c =>
    c.nombre.toLowerCase().includes(q) || c.descripcion?.toLowerCase().includes(q)
  )
})

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/directorio-medico/categorias')
    categorias.value = (data.value as any)?.categorias || []
  } catch {}
  finally { loading.value = false }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-white via-sky-50/30 to-blue-50/30 border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4" style="font-family: 'Outfit', sans-serif;">
            Especialidades Médicas
          </h1>
          <p class="text-lg text-gray-500 max-w-3xl mx-auto">
            Contamos con un equipo multidisciplinario de profesionales de la salud
            especializados en diversas áreas para brindarte la mejor atención médica integral.
          </p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Search -->
      <div class="max-w-2xl mx-auto mb-10">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar especialidad por nombre..."
            class="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2B7A9F]/20 focus:border-[#2B7A9F] text-gray-900 text-lg shadow-sm"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin-pulse text-4xl text-[#2B7A9F]"></i>
        <p class="mt-4 text-gray-500">Cargando especialidades...</p>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <NuxtLink
          v-for="cat in categoriasFiltradas"
          :key="cat.id"
          :to="`/red-medica/${cat.slug}`"
          class="block bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 text-center group cursor-pointer"
        >
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors"
            :class="[getColor(cat.color).bg, getColor(cat.color).hover]"
          >
            <i
              class="text-2xl transition-colors"
              :class="[cat.icono, getColor(cat.color).text, 'group-hover:text-white']"
            ></i>
          </div>
          <h3 class="font-semibold text-gray-900">{{ cat.nombre }}</h3>
          <p v-if="cat.total_medicos > 0" class="text-sm text-gray-400 mt-1">
            {{ cat.total_medicos }} {{ cat.total_medicos === 1 ? 'médico' : 'médicos' }}
          </p>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-if="!loading && categoriasFiltradas.length === 0" class="text-center py-20">
        <i class="fa-solid fa-magnifying-glass text-4xl text-gray-300"></i>
        <p class="mt-4 text-gray-500">No se encontraron especialidades con ese nombre.</p>
      </div>
    </div>
  </div>
</template>
