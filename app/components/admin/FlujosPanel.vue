<script setup lang="ts">
import { ref, onMounted } from 'vue'
console.log('[FlujosPanel] script setup ejecutado')

const flows = ref<any[]>([])
const cargando = ref(true)
const error = ref('')
const msg = ref('')

const nuevoNombre = ref('')
const nuevasKeywords = ref('')
const editarFlow = ref<any>(null)
const editDef = ref<any>(null)

const authHeaders = () => ({ Authorization: `Bearer ${useCookie('admin_token').value}` })

async function cargarFlujos() {
  cargando.value = true
  try {
    const data: any = await $fetch('/api/admin/whatsapp-flows', { headers: authHeaders() })
    flows.value = data.flows || []
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error cargando flujos'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
    console.log('[FlujosPanel] montado, cargando flujos…')
    cargarFlujos()
  })

function keywordsDe(texto: string): string[] {
  return texto.split(',').map((k) => k.trim()).filter(Boolean)
}

async function crearFlujo() {
  error.value = ''
  if (!nuevoNombre.value.trim()) { error.value = 'Escribe el nombre del flujo'; return }
  try {
    await $fetch('/api/admin/whatsapp-flows', {
      method: 'POST',
      headers: authHeaders(),
      body: { nombre: nuevoNombre.value.trim(), keywords: keywordsDe(nuevasKeywords.value) },
    })
    nuevoNombre.value = ''
    nuevasKeywords.value = ''
    msg.value = 'Flujo creado'
    await cargarFlujos()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al crear'
  }
}

async function importarPlantilla(nombre: string) {
  error.value = ''
  try {
    await $fetch('/api/admin/whatsapp-flows', {
      method: 'POST',
      headers: authHeaders(),
      body: { plantilla: nombre },
    })
    msg.value = `Plantilla "${nombre}" importada`
    await cargarFlujos()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al importar'
  }
}

async function alternarActivo(flow: any) {
  try {
    await $fetch(`/api/admin/whatsapp-flows/${flow.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { activo: !flow.activo },
    })
    flow.activo = !flow.activo
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al alternar'
  }
}

async function eliminar(flow: any) {
  if (!confirm(`¿Eliminar el flujo "${flow.nombre}"?`)) return
  try {
    await $fetch(`/api/admin/whatsapp-flows/${flow.id}`, { method: 'DELETE', headers: authHeaders() })
    await cargarFlujos()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al eliminar'
  }
}

function editar(flow: any) {
  console.log('[FlujosPanel] editar llamado con:', flow?.id)
  editarFlow.value = flow
  editDef.value = flow.definicion || { nodes: [], edges: [] }
}

async function guardarDef(def: any) {
  error.value = ''
  try {
    await $fetch(`/api/admin/whatsapp-flows/${editarFlow.value.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { definicion: def, keywords: editarFlow.value.keywords },
    })
    msg.value = 'Flujo guardado'
    editarFlow.value = null
    editDef.value = null
    await cargarFlujos()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al guardar'
  }
}

function cancelarEdit() {
  editarFlow.value = null
  editDef.value = null
}

async function guardarMetadata() {
  error.value = ''
  try {
    await $fetch(`/api/admin/whatsapp-flows/${editarFlow.value.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { keywords: editarFlow.value.keywords, activo: editarFlow.value.activo },
    })
    msg.value = 'Datos del flujo guardados'
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al guardar'
  }
}
</script>

<template>
  <div class="flujos">
    <div v-if="error" class="alert-error" @click="error = ''">⚠️ {{ error }}</div>
    <div v-if="msg" class="alert-ok" @click="msg = ''">✅ {{ msg }}</div>

    <template v-if="!editarFlow">
      <div class="flujo-crear">
        <input v-model="nuevoNombre" class="fi" placeholder="Nombre del flujo (ej. agendar_cita)" />
        <input v-model="nuevasKeywords" class="fi" placeholder="Keywords separadas por coma (ej. cita, agendar; * = todos)" />
        <button class="btn primary" @click="crearFlujo">+ Crear flujo</button>
      </div>

      <div class="flujo-plantillas">
        <button class="btn" @click="importarPlantilla('citas')">🌱 Importar plantilla: Agendar cita</button>
        <button class="btn" @click="importarPlantilla('asesor')">🌱 Importar plantilla: Asesor</button>
      </div>

      <div v-if="cargando" class="loading">Cargando flujos...</div>
      <div v-else-if="flows.length === 0" class="empty">
        Sin flujos todavía. Crea uno o importa una plantilla.
      </div>
      <div v-else class="flujo-list">
        <div v-for="flow in flows" :key="flow.id" class="flujo-item">
          <div class="flujo-info">
            <div class="flujo-nombre">
              {{ flow.nombre }}
              <span class="state-badge" :class="flow.activo ? 'ok' : 'off'">{{ flow.activo ? 'ACTIVO' : 'INACTIVO' }}</span>
            </div>
            <div v-if="flow.descripcion" class="flujo-desc">{{ flow.descripcion }}</div>
            <div class="flujo-kws">Keywords: <span v-for="k in (flow.keywords || [])" :key="k" class="kw-chip">{{ k }}</span></div>
          </div>
          <div class="flujo-acciones">
            <button class="btn" @click="editar(flow)">✏️ Editar</button>
            <button class="btn" @click="alternarActivo(flow)">{{ flow.activo ? '⏸ Desactivar' : '▶️ Activar' }}</button>
            <button class="btn danger" @click="eliminar(flow)">🗑</button>
          </div>
        </div>
      </div>
    </template>

<template v-else>
        <div class="flujo-edit-bar">
          <input v-model="editarFlow.nombre" class="fi" disabled />
          <input v-model="editarFlow.keywords" class="fi editable-keywords" placeholder="Keywords separadas por coma; * = todos" />
          <label class="chk"><input v-model="editarFlow.activo" type="checkbox" /> Activo</label>
          <button class="btn" @click="guardarMetadata">💾 Guardar datos</button>
          <button class="btn" @click="cancelarEdit">← Volver a la lista</button>
        </div>

        <FlowCanvas :initial-def="editDef" @save="guardarDef" @cancel="cancelarEdit" />
      </template>
  </div>
</template>

<style scoped>
.flujos { display: flex; flex-direction: column; gap: 14px; }
.alert-error { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 10px; cursor: pointer; }
.alert-ok { background: #dcfce7; color: #166534; padding: 10px 14px; border-radius: 10px; cursor: pointer; }
.flujo-crear { display: flex; gap: 8px; flex-wrap: wrap; background: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; }
.fi { flex: 1; min-width: 200px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
.btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 13px; }
.btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn.danger { color: #991b1b; }
.flujo-plantillas { display: flex; gap: 8px; }
.flujo-list { display: flex; flex-direction: column; gap: 10px; }
.flujo-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fff; padding: 12px 14px; border-radius: 12px; border: 1px solid #e2e8f0; flex-wrap: wrap; }
.flujo-info { flex: 1; min-width: 220px; }
.flujo-nombre { font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
.state-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.state-badge.ok { background: #dcfce7; color: #166534; }
.state-badge.off { background: #f1f5f9; color: #64748b; }
.flujo-desc { font-size: 12px; color: #64748b; }
.flujo-kws { font-size: 12px; color: #475569; margin-top: 4px; }
.kw-chip { background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 2px 8px; margin-right: 4px; display: inline-block; }
.flujo-acciones { display: flex; gap: 6px; }
.flujo-edit-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: #fff; padding: 12px 14px; border-radius: 12px; border: 1px solid #e2e8f0; }
.editable-keywords { max-width: 420px; }
.chk { font-size: 13px; color: #334155; display: flex; align-items: center; gap: 6px; }
.loading, .empty { color: #64748b; padding: 20px; text-align: center; }
</style>