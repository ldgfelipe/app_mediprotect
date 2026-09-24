<script setup lang="ts">
import { ref, computed, watch, markRaw } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import FlowNodeBox from './FlowNodeBox.vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/background/dist/style.css'
import '@vue-flow/controls/dist/style.css'

const props = defineProps<{ initialDef?: any }>()
const emit = defineEmits<{ (e: 'save', def: any): void; (e: 'cancel'): void }>()

const nodeTypes = { custom: markRaw(FlowNodeBox) }

const TIPOS: Record<string, { label: string; nodeType: string; config: any }> = {
  inicio: { label: '🚀 Inicio', nodeType: 'inicio', config: {} },
  mensaje: { label: '💬 Enviar mensaje', nodeType: 'mensaje', config: { texto: '' } },
  pregunta: { label: '🎛 Pregunta con opciones', nodeType: 'pregunta', config: { modo: 'botones', titulo: '', opciones: [{ label: '', valor: '' }] } },
  lista: { label: '📋 Lista dinámica (BD)', nodeType: 'lista', config: { fuente: 'especialidades', titulo: '', campo: '', parametro: '', parametro2: '' } },
  capturar: { label: '✍️ Capturar respuesta', nodeType: 'capturar', config: { campo: '', regex: '' } },
  condicion: { label: '🔀 Condición', nodeType: 'condicion', config: { campo: 'texto', operador: 'esVerdadero', valor: '' } },
  accion: { label: '⚙️ Acción de datos', nodeType: 'accion', config: { accion: 'info_general', texto: '' } },
  fin: { label: '🏁 Fin / Limpiar', nodeType: 'fin', config: { texto: '' } },
}

const FUENTES = {
  especialidades: 'Especialidades disponibles',
  doctores: 'Médicos por especialidad',
  fechas: 'Días disponibles del médico',
  horas: 'Horarios del médico',
}
const ACCIONES: Record<string, string> = {
  crear_cita: 'Crear cita (vars: doctor_id, fecha, hora)',
  capturar_doctor: 'Cargar datos del médico (doctor_id)',
  info_general: 'Enviar texto informativo',
}
const OPERADORES: Record<string, string> = {
  esVerdadero: 'es verdadero',
  existe: 'existe y no vacío',
  igual: 'igual a',
  contiene: 'contiene',
  mayor: 'mayor que',
  menor: 'menor que',
}

function subDelNodo(t: string, config: any): string {
  if (t === 'mensaje' || t === 'fin') return String(config?.texto || '').slice(0, 60)
  if (t === 'pregunta') return `${config?.modo === 'botones' ? 'Botones' : 'Lista'} · ${(config?.opciones || []).length} opc.`
  if (t === 'lista') return FUENTES[config?.fuente] || config?.fuente || ''
  if (t === 'capturar') return `campo: ${config?.campo || '?'}`
  if (t === 'condicion') return `${config?.campo || 'texto'} ${OPERADORES[config?.operador] || ''} ${config?.valor || ''}`
  if (t === 'accion') return (config?.accion || '').replace(/_/g, ' ')
  if (t === 'inicio') return 'Punto de entrada del flujo'
  return ''
}

const nodes = ref<any[]>([])
const edges = ref<any[]>([])
const selectedNodeId = ref('')
const selectedEdgeId = ref('')

watch(
  () => props.initialDef,
  (def) => {
    cargar(def)
  },
  { immediate: true, deep: true }
)

function cargar(def: any) {
  nodes.value = (def?.nodes || []).map((n: any) => ({
    id: n.id,
    type: 'custom',
    position: n.position || { x: 0, y: 0 },
    data: { nodeType: n.nodeType || n.type || 'mensaje', config: n.config || {}, label: n.label || TIPOS[n.nodeType || n.type]?.label || 'Nodo' },
  }))
  edges.value = (def?.edges || []).map((e: any) => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' }))
}

const nodoSeleccionado = computed(() => nodes.value.find((n) => n.id === selectedNodeId.value))
const edgeSeleccionado = computed(() => edges.value.find((e) => e.id === selectedEdgeId.value))

function onNodeClick(e: any) {
  selectedNodeId.value = e.node.id
  selectedEdgeId.value = ''
}
function onEdgeClick(e: any) {
  selectedEdgeId.value = e.edge.id
  selectedNodeId.value = ''
}
function onPaneClick() {
  selectedNodeId.value = ''
  selectedEdgeId.value = ''
}

function agregarNodo(tipo: string) {
  const id = `n_${Math.random().toString(36).slice(2, 8)}`
  const spec = TIPOS[tipo]
  const base = JSON.parse(JSON.stringify(spec.config))
  nodes.value.push({
    id,
    type: 'custom',
    position: { x: 120 + Math.random() * 120, y: 120 + Math.random() * 120 },
    data: { nodeType: tipo, config: base, label: spec.label },
  })
  selectedNodeId.value = id
  selectedEdgeId.value = ''
}

function eliminarSeleccion() {
  if (selectedNodeId.value) {
    nodes.value = nodes.value.filter((n) => n.id !== selectedNodeId.value)
    edges.value = edges.value.filter((e) => e.source !== selectedNodeId.value && e.target !== selectedNodeId.value)
    selectedNodeId.value = ''
  }
  if (selectedEdgeId.value) {
    edges.value = edges.value.filter((e) => e.id !== selectedEdgeId.value)
    selectedEdgeId.value = ''
  }
}

function agregarOpcion() {
  const cfg = nodoSeleccionado.value?.data?.config
  if (cfg) cfg.opciones = [...(cfg.opciones || []), { label: '', valor: '' }]
}
function quitarOpcion(i: number) {
  const cfg = nodoSeleccionado.value?.data?.config
  if (cfg) cfg.opciones.splice(i, 1)
}

function guardar() {
  const def: any = {
    nodes: nodes.value.map((n) => ({
      id: n.id,
      nodeType: n.data.nodeType,
      config: n.data.config || {},
      label: n.data.label,
      position: n.position,
    })),
    edges: edges.value.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' })),
  }
  emit('save', def)
}
</script>

<template>
  <div class="fc-wrap">
    <div class="fc-toolbar">
      <span class="fc-title">Editor de flujos</span>
      <span class="fc-hint">Conecta los nodos arrastrando desde el punto derecho hacia el punto izquierdo de otro nodo.</span>
      <div class="fc-actions">
        <button class="btn-mini" @click="eliminarSeleccion">🗑 Eliminar selección</button>
        <button class="btn-mini" @click="emit('cancel')">Cancelar</button>
        <button class="btn-mini primary" @click="guardar">💾 Guardar flujo</button>
      </div>
    </div>

    <div class="fc-body">
      <aside class="fc-palette">
        <div class="fc-paleta-titulo">Añadir nodo</div>
        <button v-for="(spec, key) in TIPOS" :key="key" class="paleta-item" @click="agregarNodo(key)">
          {{ spec.label }}
        </button>
      </aside>

      <div class="fc-canvas">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :fit-view-on-init="true"
          :min-zoom="0.2"
          :max-zoom="2"
          :delete-key-code="['Backspace', 'Delete']"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
        >
          <Background :gap="18" />
          <Controls />
        </VueFlow>
      </div>

      <aside class="fc-inspector">
        <template v-if="nodoSeleccionado">
          <div class="insp-nombre">{{ nodoSeleccionado.data.label }}</div>

          <template v-if="nodoSeleccionado.data.nodeType === 'mensaje' || nodoSeleccionado.data.nodeType === 'fin'">
            <label class="insp-label">Texto</label>
            <textarea v-model="nodoSeleccionado.data.config.texto" rows="5" class="insp-input" placeholder="Escribe el mensaje... ({{variable}} se reemplaza)" />
          </template>

          <template v-if="nodoSeleccionado.data.nodeType === 'pregunta'">
            <label class="insp-label">Tipo de opciones</label>
            <select v-model="nodoSeleccionado.data.config.modo" class="insp-input">
              <option value="botones">Botones (máx. 3)</option>
              <option value="lista">Lista (hasta 10)</option>
            </select>
            <label class="insp-label">Texto de la pregunta</label>
            <textarea v-model="nodoSeleccionado.data.config.titulo" rows="3" class="insp-input" />
            <label class="insp-label">Opciones (el borde "valor" conecta al siguiente nodo)</label>
            <div v-for="(op, i) in nodoSeleccionado.data.config.opciones" :key="i" class="opc-row">
              <input v-model="op.label" class="insp-input" placeholder="Etiqueta (botón)" />
              <input v-model="op.valor" class="insp-input" placeholder="Valor / borde" />
              <button class="btn-mini danger" @click="quitarOpcion(i)">✕</button>
            </div>
            <button class="btn-mini" @click="agregarOpcion">+ Opción</button>
          </template>

          <template v-if="nodoSeleccionado.data.nodeType === 'lista'">
            <label class="insp-label">Fuente de datos</label>
            <select v-model="nodoSeleccionado.data.config.fuente" class="insp-input">
              <option v-for="(label, key) in FUENTES" :key="key" :value="key">{{ label }}</option>
            </select>
            <label class="insp-label">Texto de la pregunta</label>
            <textarea v-model="nodoSeleccionado.data.config.titulo" rows="3" class="insp-input" />
            <label class="insp-label">Campo donde se guarda la selección</label>
            <input v-model="nodoSeleccionado.data.config.campo" class="insp-input" placeholder="ej. doctor_id" />
            <label class="insp-label">Variable filtro (según fuente)</label>
            <input v-model="nodoSeleccionado.data.config.parametro" class="insp-input" placeholder="ej. especialidad / doctor_id" />
            <label class="insp-label">Variable filtro 2 (solo horas)</label>
            <input v-model="nodoSeleccionado.data.config.parametro2" class="insp-input" placeholder="ej. fecha" />
          </template>

          <template v-if="nodoSeleccionado.data.nodeType === 'capturar'">
            <label class="insp-label">Campo a guardar</label>
            <input v-model="nodoSeleccionado.data.config.campo" class="insp-input" placeholder="ej. nombre" />
            <label class="insp-label">Regex (opcional, extrae grupo 1)</label>
            <input v-model="nodoSeleccionado.data.config.regex" class="insp-input" placeholder="ej. soy (.+)" />
          </template>

          <template v-if="nodoSeleccionado.data.nodeType === 'condicion'">
            <label class="insp-label">Campo (o 'texto' para el mensaje)</label>
            <input v-model="nodoSeleccionado.data.config.campo" class="insp-input" placeholder="ej. especialidad | texto" />
            <label class="insp-label">Operador</label>
            <select v-model="nodoSeleccionado.data.config.operador" class="insp-input">
              <option v-for="(label, key) in OPERADORES" :key="key" :value="key">{{ label }}</option>
            </select>
            <label class="insp-label">Valor esperado</label>
            <input v-model="nodoSeleccionado.data.config.valor" class="insp-input" placeholder="ej. Cardiología" />
            <p class="insp-note">Conecta bordes etiquetados <code>true</code> y <code>false</code>.</p>
          </template>

          <template v-if="nodoSeleccionado.data.nodeType === 'accion'">
            <label class="insp-label">Acción</label>
            <select v-model="nodoSeleccionado.data.config.accion" class="insp-input">
              <option v-for="(label, key) in ACCIONES" :key="key" :value="key">{{ label }}</option>
            </select>
            <label class="insp-label">Texto personalizado (opcional; usa {{variables}})</label>
            <textarea v-model="nodoSeleccionado.data.config.texto" rows="3" class="insp-input" />
          </template>

          <template v-if="nodoSeleccionado.data.nodeType === 'inicio'">
            <p class="insp-note">Punto de entrada. El siguiente nodo conectado se ejecuta al activar el flujo.</p>
          </template>
        </template>

        <template v-else-if="edgeSeleccionado">
          <div class="insp-nombre">Conexión</div>
          <label class="insp-label">Etiqueta (opción / true-false)</label>
          <input v-model="edgeSeleccionado.label" class="insp-input" placeholder="ej. confirmar, true, false" />
          <p class="insp-note">Usa la etiqueta para que la opción del nodo pregunta o la condición salte a este camino.</p>
        </template>

        <template v-else>
          <div class="insp-placeholder">Selecciona un nodo o una conexión para editarlo.</div>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.fc-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  overflow: hidden;
}
.fc-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}
.fc-title { font-weight: 700; color: #0f172a; }
.fc-hint { font-size: 12px; color: #64748b; flex: 1; }
.fc-actions { display: flex; gap: 6px; }
.btn-mini {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
  font-size: 12px;
  color: #334155;
}
.btn-mini.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.btn-mini.danger { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.fc-body { display: flex; height: 560px; }
.fc-palette {
  width: 180px;
  border-right: 1px solid #e2e8f0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #ffffff;
  overflow-y: auto;
}
.fc-paleta-titulo { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; }
.paleta-item {
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-size: 12px;
  color: #1e293b;
}
.paleta-item:hover { background: #eff6ff; border-color: #93c5fd; }
.fc-canvas { flex: 1; min-width: 0; }
.fc-inspector {
  width: 300px;
  border-left: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 12px;
  overflow-y: auto;
  font-size: 13px;
}
.insp-nombre { font-weight: 700; margin-bottom: 10px; color: #0f172a; }
.insp-label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin: 8px 0 4px; }
.insp-input {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  box-sizing: border-box;
  margin-bottom: 2px;
}
.opc-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
.opc-row .insp-input { margin-bottom: 0; }
.insp-note { font-size: 11px; color: #94a3b8; margin-top: 8px; }
.insp-placeholder { color: #94a3b8; font-size: 12px; padding: 20px 4px; text-align: center; }
</style>