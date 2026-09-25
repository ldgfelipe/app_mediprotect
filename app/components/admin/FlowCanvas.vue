<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

console.log('[FlowCanvas] script setup ejecutado')
onMounted(() => console.log('[FlowCanvas] montado'))

const props = defineProps<{ initialDef?: any }>()
const emit = defineEmits<{ (e: 'save', def: any): void; (e: 'cancel'): void }>()

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

const FUENTES: Record<string, string> = {
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
  esVerdadero: 'es verdadero', existe: 'existe y no vacío', igual: 'igual a', contiene: 'contiene', mayor: 'mayor que', menor: 'menor que',
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

type Bloque = { id: string; nodeType: string; label: string; config: any }

const bloques = ref<Bloque[]>([])
const seleccionadoId = ref('')
const dragId = ref('')

watch(() => props.initialDef, (def) => { cargar(def) }, { immediate: true, deep: true })

function cargar(def: any) {
  const raw = (def?.nodes || []) as any[]
  bloques.value = raw.map((n: any) => ({
    id: n.id,
    nodeType: n.nodeType || n.type || 'mensaje',
    label: n.label || TIPOS[n.nodeType || n.type]?.label || 'Nodo',
    config: n.config || JSON.parse(JSON.stringify(TIPOS[n.nodeType || n.type]?.config || {})),
  }))
  if (bloques.value.length && !bloques.value.find(b => b.id === seleccionadoId.value)) seleccionadoId.value = bloques.value[0].id
}

const bloqueSeleccionado = computed(() => bloques.value.find(b => b.id === seleccionadoId.value) || null)

function agregarBloque(tipo: string) {
  const id = `n_${Math.random().toString(36).slice(2, 8)}`
  const spec = TIPOS[tipo]
  bloques.value.push({ id, nodeType: tipo, label: spec.label, config: JSON.parse(JSON.stringify(spec.config)) })
  seleccionadoId.value = id
}
function eliminarBloque(id: string) {
  bloques.value = bloques.value.filter(b => b.id !== id)
  if (seleccionadoId.value === id) seleccionadoId.value = bloques.value[0]?.id || ''
}
function moverBloque(id: string, dir: number) {
  const i = bloques.value.findIndex(b => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= bloques.value.length) return
  const a = bloques.value[i]; bloques.value[i] = bloques.value[j]; bloques.value[j] = a
  bloques.value = [...bloques.value]
}
function onDragStart(id: string) { dragId.value = id }
function onDragOver(id: string) {
  if (!dragId.value || dragId.value === id) return
  const from = bloques.value.findIndex(b => b.id === dragId.value)
  const to = bloques.value.findIndex(b => b.id === id)
  if (from < 0 || to < 0) return
  const item = bloques.value.splice(from, 1)[0]
  bloques.value.splice(to, 0, item)
  bloques.value = [...bloques.value]
}
function onDragEnd() { dragId.value = '' }

function agregarOpcion() {
  const cfg = bloqueSeleccionado.value?.config
  if (cfg) cfg.opciones = [...(cfg.opciones || []), { label: '', valor: '' }]
}
function quitarOpcion(i: number) {
  const cfg = bloqueSeleccionado.value?.config
  if (cfg) cfg.opciones.splice(i, 1)
}

function guardar() {
  const nodes = bloques.value.map((b, idx) => ({
    id: b.id, nodeType: b.nodeType, label: b.label, config: b.config, position: { x: idx * 220, y: 0 },
  }))
  const edges = bloques.value.slice(0, -1).map((b, i) => ({ id: `e${i}_${b.id}`, source: b.id, target: bloques.value[i + 1].id, label: '' }))
  // Para nodos pregunta/condicion, el runner ya ignora edges lineales y usa labels; esta cadena lineal es suficiente para modo lista.
  emit('save', { nodes, edges })
}
</script>

<template>
  <div class="fc-wrap">
    <div class="fc-toolbar">
      <span class="fc-title">Editor de flujos (lista arrastrable)</span>
      <span class="fc-hint">Añade bloques, arrástralos para reordenar. El orden vertical es el orden de ejecución.</span>
      <div class="fc-actions">
        <button class="btn-mini" @click="emit('cancel')">Cancelar</button>
        <button class="btn-mini primary" @click="guardar">💾 Guardar flujo</button>
      </div>
    </div>

    <div class="fc-body">
      <aside class="fc-palette">
        <div class="fc-paleta-titulo">Añadir bloque</div>
        <button v-for="(spec, key) in TIPOS" :key="key" class="paleta-item" @click="agregarBloque(key)">{{ spec.label }}</button>
        <p class="insp-note">Tip: selecciona un bloque para editarlo a la derecha.</p>
      </aside>

      <div class="fc-list">
        <div v-if="bloques.length === 0" class="empty">Sin bloques. Añade uno desde la izquierda.</div>
        <div
          v-for="(b, idx) in bloques"
          :key="b.id"
          class="bloque"
          :class="{ activo: b.id === seleccionadoId, dragging: b.id === dragId }"
          draggable="true"
          @dragstart="onDragStart(b.id)"
          @dragover.prevent="onDragOver(b.id)"
          @dragend="onDragEnd"
          @click="seleccionadoId = b.id"
        >
          <div class="bloque-head">
            <span class="bloque-idx">{{ idx + 1 }}</span>
            <span class="bloque-tipo">{{ b.label }}</span>
            <span class="bloque-sub">{{ subDelNodo(b.nodeType, b.config) }}</span>
            <span class="bloque-drag" title="Arrastra para reordenar">⋮⋮</span>
          </div>
          <div class="bloque-acciones">
            <button class="btn-mini" @click.stop="moverBloque(b.id, -1)" :disabled="idx === 0">↑</button>
            <button class="btn-mini" @click.stop="moverBloque(b.id, 1)" :disabled="idx === bloques.length - 1">↓</button>
            <button class="btn-mini danger" @click.stop="eliminarBloque(b.id)">✕</button>
          </div>
          <div v-if="idx < bloques.length - 1" class="bloque-flecha">↓</div>
        </div>
      </div>

      <aside class="fc-inspector">
        <template v-if="bloqueSeleccionado">
          <div class="insp-nombre">{{ bloqueSeleccionado.label }}</div>

          <template v-if="bloqueSeleccionado.nodeType === 'mensaje' || bloqueSeleccionado.nodeType === 'fin'">
            <label class="insp-label">Texto</label>
            <textarea v-model="bloqueSeleccionado.config.texto" rows="5" class="insp-input" placeholder="Escribe el mensaje... ({{variable}} se reemplaza)" />
          </template>

          <template v-if="bloqueSeleccionado.nodeType === 'pregunta'">
            <label class="insp-label">Tipo de opciones</label>
            <select v-model="bloqueSeleccionado.config.modo" class="insp-input">
              <option value="botones">Botones (máx. 3)</option>
              <option value="lista">Lista (hasta 10)</option>
            </select>
            <label class="insp-label">Texto de la pregunta</label>
            <textarea v-model="bloqueSeleccionado.config.titulo" rows="3" class="insp-input" />
            <label class="insp-label">Opciones</label>
            <div v-for="(op, i) in bloqueSeleccionado.config.opciones" :key="i" class="opc-row">
              <input v-model="op.label" class="insp-input" placeholder="Etiqueta" />
              <input v-model="op.valor" class="insp-input" placeholder="Valor" />
              <button class="btn-mini danger" @click="quitarOpcion(i)">✕</button>
            </div>
            <button class="btn-mini" @click="agregarOpcion">+ Opción</button>
          </template>

          <template v-if="bloqueSeleccionado.nodeType === 'lista'">
            <label class="insp-label">Fuente de datos</label>
            <select v-model="bloqueSeleccionado.config.fuente" class="insp-input">
              <option v-for="(label, key) in FUENTES" :key="key" :value="key">{{ label }}</option>
            </select>
            <label class="insp-label">Texto de la pregunta</label>
            <textarea v-model="bloqueSeleccionado.config.titulo" rows="3" class="insp-input" />
            <label class="insp-label">Campo donde se guarda la selección</label>
            <input v-model="bloqueSeleccionado.config.campo" class="insp-input" placeholder="ej. doctor_id" />
            <label class="insp-label">Variable filtro (según fuente)</label>
            <input v-model="bloqueSeleccionado.config.parametro" class="insp-input" placeholder="ej. especialidad / doctor_id" />
            <label class="insp-label">Variable filtro 2 (solo horas)</label>
            <input v-model="bloqueSeleccionado.config.parametro2" class="insp-input" placeholder="ej. fecha" />
          </template>

          <template v-if="bloqueSeleccionado.nodeType === 'capturar'">
            <label class="insp-label">Campo a guardar</label>
            <input v-model="bloqueSeleccionado.config.campo" class="insp-input" placeholder="ej. nombre" />
            <label class="insp-label">Regex (opcional)</label>
            <input v-model="bloqueSeleccionado.config.regex" class="insp-input" placeholder="ej. soy (.+)" />
          </template>

          <template v-if="bloqueSeleccionado.nodeType === 'condicion'">
            <label class="insp-label">Campo</label>
            <input v-model="bloqueSeleccionado.config.campo" class="insp-input" placeholder="ej. especialidad | texto" />
            <label class="insp-label">Operador</label>
            <select v-model="bloqueSeleccionado.config.operador" class="insp-input">
              <option v-for="(label, key) in OPERADORES" :key="key" :value="key">{{ label }}</option>
            </select>
            <label class="insp-label">Valor esperado</label>
            <input v-model="bloqueSeleccionado.config.valor" class="insp-input" placeholder="ej. Cardiología" />
          </template>

          <template v-if="bloqueSeleccionado.nodeType === 'accion'">
            <label class="insp-label">Acción</label>
            <select v-model="bloqueSeleccionado.config.accion" class="insp-input">
              <option v-for="(label, key) in ACCIONES" :key="key" :value="key">{{ label }}</option>
            </select>
            <label class="insp-label">Texto personalizado (opcional)</label>
            <textarea v-model="bloqueSeleccionado.config.texto" rows="3" class="insp-input" />
          </template>

          <template v-if="bloqueSeleccionado.nodeType === 'inicio'">
            <p class="insp-note">Punto de entrada. El siguiente bloque se ejecuta al activar el flujo.</p>
          </template>
        </template>
        <template v-else>
          <div class="insp-placeholder">Selecciona un bloque para editarlo.</div>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.fc-wrap { border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; overflow: hidden; }
.fc-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #ffffff; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
.fc-title { font-weight: 700; color: #0f172a; }
.fc-hint { font-size: 12px; color: #64748b; flex: 1; }
.fc-actions { display: flex; gap: 6px; }
.btn-mini { padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; cursor: pointer; font-size: 12px; color: #334155; }
.btn-mini.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.btn-mini.danger { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.btn-mini:disabled { opacity: .4; cursor: not-allowed; }
.fc-body { display: flex; min-height: 420px; }
.fc-palette { width: 180px; border-right: 1px solid #e2e8f0; padding: 10px; display: flex; flex-direction: column; gap: 6px; background: #ffffff; overflow-y: auto; }
.fc-paleta-titulo { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; }
.paleta-item { text-align: left; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-size: 12px; color: #1e293b; }
.paleta-item:hover { background: #eff6ff; border-color: #93c5fd; }
.fc-list { flex: 1; min-width: 0; padding: 14px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 560px; }
.bloque { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; cursor: pointer; }
.bloque.activo { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
.bloque.dragging { opacity: .5; }
.bloque-head { display: flex; align-items: center; gap: 8px; }
.bloque-idx { width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; color: #334155; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.bloque-tipo { font-weight: 700; font-size: 13px; color: #0f172a; }
.bloque-sub { font-size: 11px; color: #64748b; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bloque-drag { color: #94a3b8; cursor: grab; }
.bloque-acciones { display: flex; gap: 4px; margin-top: 6px; }
.bloque-flecha { text-align: center; color: #94a3b8; font-size: 14px; margin: 2px 0 -2px; }
.fc-inspector { width: 300px; border-left: 1px solid #e2e8f0; background: #ffffff; padding: 12px; overflow-y: auto; font-size: 13px; }
.insp-nombre { font-weight: 700; margin-bottom: 10px; color: #0f172a; }
.insp-label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin: 8px 0 4px; }
.insp-input { width: 100%; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; margin-bottom: 2px; }
.opc-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
.opc-row .insp-input { margin-bottom: 0; }
.insp-note { font-size: 11px; color: #94a3b8; margin-top: 8px; }
.insp-placeholder { color: #94a3b8; font-size: 12px; padding: 20px 4px; text-align: center; }
.empty { color: #64748b; padding: 20px; text-align: center; }
</style>
