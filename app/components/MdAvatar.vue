<script setup lang="ts">
const props = defineProps<{
  src?: string | null
  nombre?: string
  apellido?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const initials = computed(() => {
  const n = props.nombre?.[0] || ''
  const a = props.apellido?.[0] || ''
  return `${n}${a}`.toUpperCase() || '?'
})

const sizeClass = computed(() => `avatar-${props.size || 'md'}`)
</script>

<template>
  <div :class="['avatar', sizeClass]">
    <img v-if="src" :src="src" :alt="`${nombre} ${apellido}`" />
    <span v-else class="initials">{{ initials }}</span>
  </div>
</template>

<style scoped>
.avatar { border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0984e3, #74b9ff); color: white; font-weight: 600; flex-shrink: 0; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.initials { text-transform: uppercase; }
.avatar-sm { width: 32px; height: 32px; font-size: 0.75rem; }
.avatar-md { width: 48px; height: 48px; font-size: 1rem; }
.avatar-lg { width: 64px; height: 64px; font-size: 1.25rem; }
.avatar-xl { width: 96px; height: 96px; font-size: 1.75rem; }
</style>