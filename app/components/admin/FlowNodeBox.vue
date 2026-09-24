<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{ data: any }>()
</script>

<template>
  <div class="nf-box" :class="`nf-${data.nodeType}`">
    <Handle type="target" :position="Position.Left" />
    <div class="nf-title">{{ data.label }}</div>
    <div v-if="data.sub" class="nf-sub">{{ data.sub }}</div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.nf-box {
  min-width: 150px;
  max-width: 220px;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #1e293b;
  border: 2px solid #cbd5e1;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.nf-title {
  font-weight: 700;
  font-size: 13px;
}
.nf-sub {
  font-size: 11px;
  color: #475569;
  margin-top: 2px;
  word-break: break-word;
}
.nf-inicio { border-color: #16a34a; background: #f0fdf4; }
.nf-mensaje { border-color: #2563eb; background: #eff6ff; }
.nf-pregunta { border-color: #7c3aed; background: #f5f3ff; }
.nf-lista { border-color: #ea580c; background: #fff7ed; }
.nf-capturar { border-color: #0891b2; background: #ecfeff; }
.nf-condicion { border-color: #d97706; background: #fffbeb; }
.nf-accion { border-color: #4f46e5; background: #eef2ff; }
.nf-fin { border-color: #64748b; background: #f8fafc; }
</style>