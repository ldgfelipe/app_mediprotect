<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const categoria = ref<any>(null)
const medicos = ref<any[]>([])
const loading = ref(true)

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

onMounted(async () => {
  try {
    const [catRes, medRes] = await Promise.all([
      useFetch('/api/directorio-medico/categorias'),
      useFetch(`/api/directorio-medico?especialidad=${slug}`),
    ])
    const cats = (catRes.data.value as any)?.categorias || []
    categoria.value = cats.find((c: any) => c.slug === slug)
    medicos.value = (medRes.data.value as any)?.medicos || []
  } catch {}
  finally { loading.value = false }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-white via-sky-50/30 to-blue-50/30 border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <NuxtLink to="/red-medica" class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#2B7A9F] mb-6 transition-colors">
          <i class="fa-solid fa-arrow-left"></i>
          Volver a Especialidades
        </NuxtLink>

        <div v-if="categoria" class="flex items-center gap-6">
          <div
            class="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
            :class="[getColor(categoria.color).bg]"
          >
            <i class="text-3xl" :class="[categoria.icono, getColor(categoria.color).text]"></i>
          </div>
          <div>
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900" style="font-family: 'Outfit', sans-serif;">
              {{ categoria.nombre }}
            </h1>
            <p v-if="categoria.descripcion" class="text-gray-500 mt-1">{{ categoria.descripcion }}</p>
            <p class="text-sm text-gray-400 mt-1">
              {{ medicos.length }} {{ medicos.length === 1 ? 'profesional disponible' : 'profesionales disponibles' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <i class="fa-solid fa-spinner fa-spin-pulse text-4xl text-[#2B7A9F]"></i>
        <p class="mt-4 text-gray-500">Cargando profesionales...</p>
      </div>

      <!-- Doctors grid -->
      <div v-else-if="medicos.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="m in medicos"
          :key="m.id"
          :to="`/medicos/${m.id}`"
          class="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 group"
        >
          <div class="flex items-start gap-4 mb-4">
            <div class="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
                 :class="[getColor(categoria?.color || 'primary').bg, getColor(categoria?.color || 'primary').text]">
              {{ m.nombre?.charAt(0) }}{{ m.apellido?.charAt(0) }}
            </div>
            <div class="min-w-0">
              <h3 class="font-semibold text-gray-900 group-hover:text-[#2B7A9F] transition-colors truncate">
                {{ m.nombre_completo }}
              </h3>
              <p class="text-sm text-gray-500 truncate">{{ m.especialidad?.nombre }}</p>
              <p v-if="m.subespecialidad" class="text-xs text-gray-400 truncate">{{ m.subespecialidad }}</p>
            </div>
          </div>

          <div v-if="m.ciudad || m.estado" class="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <i class="fa-solid fa-location-dot text-gray-400"></i>
            <span>{{ [m.ciudad, m.estado].filter(Boolean).join(', ') }}</span>
          </div>

          <div v-if="m.cedula_profesional" class="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <i class="fa-solid fa-graduation-cap text-gray-400"></i>
            <span>Cédula: {{ m.cedula_profesional }}</span>
          </div>

          <div v-if="m.descripcion" class="text-sm text-gray-600 line-clamp-2 mb-4">
            {{ m.descripcion }}
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-gray-100">
            <div v-if="m.score_confianza" class="flex items-center gap-1">
              <i class="fa-solid fa-star text-amber-400 text-sm"></i>
              <span class="text-sm font-medium text-gray-700">{{ m.score_confianza }}</span>
            </div>
            <span class="text-sm font-medium text-[#2B7A9F] group-hover:underline ml-auto">
              Ver perfil →
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-20">
        <i class="fa-solid fa-user-doctor text-5xl text-gray-300"></i>
        <p class="mt-4 text-gray-500 text-lg">No hay profesionales disponibles en esta especialidad aún.</p>
        <NuxtLink to="/red-medica" class="inline-flex items-center gap-2 mt-6 text-[#2B7A9F] hover:underline">
          <i class="fa-solid fa-arrow-left"></i>
          Ver otras especialidades
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
