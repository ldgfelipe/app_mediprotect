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
const bloqueSel = ref('')

const authHeaders = () => ({ Authorization: `Bearer ${useCookie('admin_token').value}` })

async function cargarFlujos() {
  cargando.value = true
  error.value = ''
  try {
    console.log('[FlujosPanel] fetch flujos...')
    const data: any = await $fetch('/api/admin/whatsapp-flows', { headers: authHeaders() })
    console.log('[FlujosPanel] flujos recibidos:', data?.flows?.length)
    flows.value = data.flows || []
  } catch (e: any) {
    console.error('[FlujosPanel] error fetch:', e)
    error.value = e?.data?.message || e?.message || 'Error cargando flujos'
  } finally {
    cargando.value = false
    console.log('[FlujosPanel] cargando=false, flows:', flows.value.length)
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
  editarFlow.value = { ...flow, keywords: (flow.keywords || []).join(', ') }
  editDef.value = JSON.parse(JSON.stringify(flow.definicion || { nodes: [], edges: [] }))
  bloqueSel.value = editDef.value.nodes?.[0]?.id || ''
}
function resumenBloque(n: any) {
  const t = n.nodeType || n.type
  const c = n.config || {}
  if (t === 'mensaje' || t === 'fin') return (c.texto || '').slice(0, 50)
  if (t === 'pregunta') return c.titulo?.slice(0, 40) || `${c.opciones?.length || 0} opciones`
  if (t === 'lista') return c.titulo?.slice(0, 40) || c.fuente
  if (t === 'capturar') return c.campo || ''
  if (t === 'accion') return accionLabel(c.accion)
  if (t === 'condicion') return `${c.campo || '?'} ${c.operador} ${c.valor || ''}`
  return ''
}
function accionLabel(a: string) {
  return ({ info_general: 'Info general', crear_cita: 'Crear cita', capturar_doctor: 'Capturar doctor' } as Record<string, string>)[a] || a || ''
}
function destinos(actualId: string) {
  const arr = editDef.value?.nodes || []
  return arr
    .map((n: any, i: number) => ({ n, i }))
    .filter((x: any) => x.n.id !== actualId)
    .map((x: any) => ({ id: x.n.id, txt: `${x.i + 1}. ${x.n.nodeType || x.n.type} · ${resumenBloque(x.n) || x.n.id}` }))
}
function agregarBloqueSimple(tipo: string) {
  if (!editDef.value) editDef.value = { nodes: [], edges: [] }
  if (!editDef.value.nodes) editDef.value.nodes = []
  const base: any = {
    mensaje: { texto: '' },
    pregunta: { titulo: '', modo: 'botones', opciones: [{ label: '', valor: '', destino: '' }] },
    lista: { titulo: '', fuente: 'especialidades', campo: '', parametro: '', parametro2: '' },
    capturar: { campo: '', regex: '' },
    accion: { accion: 'info_general', texto: '' },
    condicion: { campo: '', operador: 'igual', valor: '', destinoTrue: '', destinoFalse: '' },
    fin: { texto: '' },
    inicio: {},
  }[tipo] || {}
  const id = `n_${Math.random().toString(36).slice(2,6)}`
  editDef.value.nodes.push({ id, nodeType: tipo, type: tipo, config: JSON.parse(JSON.stringify(base)), position: { x: 0, y: 0 } })
  bloqueSel.value = id
}
function moverSimple(idx: number, dir: number) {
  const a = editDef.value.nodes
  const j = idx + dir
  if (j < 0 || j >= a.length) return
  const tmp = a[idx]; a[idx] = a[j]; a[j] = tmp
}
function eliminarSimple(id: string) {
  editDef.value.nodes = editDef.value.nodes.filter((n: any) => n.id !== id)
  if (bloqueSel.value === id) bloqueSel.value = editDef.value.nodes[0]?.id || ''
}
async function guardarSimple() {
  error.value = ''
  try {
    const nodes = editDef.value.nodes || []
    const ids = new Set(nodes.map((n: any) => n.id))
    nodes.forEach((n: any) => {
      const c = n.config || {}
      if (c.destinoTrue && !ids.has(c.destinoTrue)) c.destinoTrue = ''
      if (c.destinoFalse && !ids.has(c.destinoFalse)) c.destinoFalse = ''
      ;(c.opciones || []).forEach((op: any) => { if (op.destino && !ids.has(op.destino)) op.destino = '' })
    })
    const siguiente = (i: number) => nodes[i + 1]?.id || ''
    const edges: any[] = []
    nodes.forEach((n: any, i: number) => {
      const t = n.nodeType || n.type
      if (t === 'pregunta') {
        const ops = n.config?.opciones || []
        ops.forEach((op: any, oi: number) => {
          const destino = op.destino || siguiente(i)
          if (!destino) return
          edges.push({ id: `e_${n.id}_${oi}`, source: n.id, target: destino, label: String(op.valor || op.label || '').trim() })
        })
        if (!edges.some((e: any) => e.source === n.id)) {
          edges.push({ id: `e_${n.id}_f`, source: n.id, target: siguiente(i), label: '' })
        }
      } else if (t === 'condicion') {
        const vt = n.config?.destinoTrue || siguiente(i)
        const vf = n.config?.destinoFalse || siguiente(i)
        if (vt) edges.push({ id: `e_${n.id}_t`, source: n.id, target: vt, label: 'true' })
        if (vf) edges.push({ id: `e_${n.id}_f`, source: n.id, target: vf, label: 'false' })
      } else {
        const destino = siguiente(i)
        if (destino) edges.push({ id: `e_${i}`, source: n.id, target: destino, label: '' })
      }
    })
    await $fetch(`/api/admin/whatsapp-flows/${editarFlow.value.id}`, { method: 'PUT', headers: authHeaders(), body: { definicion: { nodes, edges }, keywords: keywordsDe(editarFlow.value.keywords) } })
    msg.value = 'Flujo guardado'
    editarFlow.value = null
    editDef.value = null
    await cargarFlujos()
  } catch (e: any) { error.value = e?.data?.message || e?.message || 'Error al guardar' }
}

async function guardarDef(def: any) {
  error.value = ''
  try {
    await $fetch(`/api/admin/whatsapp-flows/${editarFlow.value.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { definicion: def, keywords: keywordsDe(editarFlow.value.keywords) },
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
      body: { keywords: keywordsDe(editarFlow.value.keywords), activo: editarFlow.value.activo },
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

        <div class="simple-editor">
          <div class="simple-editor-head">
            <h3>Bloques del flujo ({{ (editDef?.nodes || []).length }})</h3>
            <div class="simple-actions">
              <button class="btn primary" @click="agregarBloqueSimple('mensaje')">+ Mensaje</button>
              <button class="btn" @click="agregarBloqueSimple('pregunta')">+ Pregunta</button>
              <button class="btn" @click="agregarBloqueSimple('lista')">+ Lista</button>
              <button class="btn" @click="agregarBloqueSimple('capturar')">+ Capturar</button>
              <button class="btn" @click="agregarBloqueSimple('accion')">⚡ + Acción</button>
              <button class="btn" @click="agregarBloqueSimple('condicion')">🔀 + Condición</button>
              <button class="btn" @click="agregarBloqueSimple('fin')">+ Fin</button>
              <button class="btn primary" @click="guardarSimple">💾 Guardar flujo</button>
            </div>
          </div>
          <div v-if="!(editDef?.nodes || []).length" class="empty">Sin bloques. Agrega uno.</div>
          <div v-for="(n, idx) in (editDef?.nodes || [])" :key="n.id" class="bloque-simple" :class="{ activo: bloqueSel === n.id }" @click="bloqueSel = n.id">
            <div class="bloque-simple-head">
              <span class="bloque-idx">{{ idx + 1 }}</span>
              <span class="bloque-tipo">{{ n.nodeType || n.type }}</span>
              <span class="bloque-resumen">{{ resumenBloque(n) }}</span>
              <button class="btn-mini" @click.stop="moverSimple(idx, -1)" :disabled="idx === 0">↑</button>
              <button class="btn-mini" @click.stop="moverSimple(idx, 1)" :disabled="idx === (editDef.nodes.length - 1)">↓</button>
              <button class="btn-mini danger" @click.stop="eliminarSimple(n.id)">✕</button>
            </div>
            <div v-if="bloqueSel === n.id" class="bloque-edit">
              <template v-if="(n.nodeType || n.type) === 'mensaje' || (n.nodeType || n.type) === 'fin'">
                <label class="insp-label">Texto</label>
                <textarea v-model="n.config.texto" rows="3" class="insp-input" />
              </template>
              <template v-if="(n.nodeType || n.type) === 'pregunta'">
                <label class="insp-label">Título</label>
                <textarea v-model="n.config.titulo" rows="2" class="insp-input" />
                <label class="insp-label">Opciones (valor es el que dispara el siguiente paso)</label>
                <div v-for="(op, oi) in n.config.opciones" :key="oi" class="opc-col">
                  <div class="opc-row">
                    <input v-model="op.label" class="insp-input" placeholder="Etiqueta" />
                    <input v-model="op.valor" class="insp-input" placeholder="valor" />
                    <button class="btn-mini danger" @click="n.config.opciones.splice(oi,1)">✕</button>
                  </div>
                  <select v-model="op.destino" class="insp-input destino">
                    <option value="">→ Siguiente bloque</option>
                    <option v-for="d in destinos(n.id)" :key="d.id" :value="d.id">{{ d.txt }}</option>
                  </select>
                </div>
                <button class="btn-mini" @click="n.config.opciones.push({label:'',valor:'',destino:''})">+ Opción</button>
              </template>
              <template v-if="(n.nodeType || n.type) === 'lista'">
                <label class="insp-label">Título</label>
                <textarea v-model="n.config.titulo" rows="2" class="insp-input" />
                <label class="insp-label">Fuente</label>
                <select v-model="n.config.fuente" class="insp-input">
                  <option value="especialidades">Especialidades</option>
                  <option value="doctores">Doctores</option>
                  <option value="fechas">Fechas</option>
                  <option value="horas">Horas</option>
                </select>
                <label class="insp-label">Campo</label>
                <input v-model="n.config.campo" class="insp-input" placeholder="ej. especialidad" />
                <label class="insp-label">Parámetro (variable de origen)</label>
                <input v-model="n.config.parametro" class="insp-input" placeholder="ej. especialidad" />
                <label class="insp-label">Parámetro 2 (solo para horas)</label>
                <input v-model="n.config.parametro2" class="insp-input" placeholder="ej. fecha" />
              </template>
              <template v-if="(n.nodeType || n.type) === 'capturar'">
                <label class="insp-label">Campo</label>
                <input v-model="n.config.campo" class="insp-input" />
                <label class="insp-label">Regex</label>
                <input v-model="n.config.regex" class="insp-input" />
              </template>
              <template v-if="(n.nodeType || n.type) === 'accion'">
                <label class="insp-label">Acción</label>
                <select v-model="n.config.accion" class="insp-input">
                  <option value="info_general">Info general</option>
                  <option value="crear_cita">Crear cita</option>
                  <option value="capturar_doctor">Capturar doctor</option>
                  <option value="registrar_asistencia">Registrar asistencia</option>
                </select>
                <template v-if="n.config.accion === 'registrar_asistencia'">
                  <label class="insp-label">Variable de la cita</label>
                  <input v-model="n.config.campo_cita" class="insp-input" placeholder="cita_id" />
                  <label class="insp-label">Variable de la respuesta</label>
                  <input v-model="n.config.campo_respuesta" class="insp-input" placeholder="respuesta_asistencia" />
                  <label class="insp-label">Texto si asistió</label>
                  <textarea v-model="n.config.texto_si" rows="2" class="insp-input" />
                  <label class="insp-label">Texto si no asistió</label>
                  <textarea v-model="n.config.texto_no" rows="2" class="insp-input" />
                </template>
                <template v-else>
                  <label class="insp-label">Texto</label>
                  <textarea v-model="n.config.texto" rows="2" class="insp-input" />
                  <p class="insp-help">
                    ℹ️ <b>Crear cita</b> usa doctor_id, fecha y hora. <b>Capturar doctor</b> calcula precio y nombre.
                    <b>Info general</b> envía el texto de abajo.
                  </p>
                </template>
              </template>
              <template v-if="(n.nodeType || n.type) === 'condicion'">
                <label class="insp-label">Campo (variable o «texto»)</label>
                <input v-model="n.config.campo" class="insp-input" placeholder="ej. especialidad, o texto" />
                <label class="insp-label">Operador</label>
                <select v-model="n.config.operador" class="insp-input">
                  <option value="igual">igual</option>
                  <option value="contiene">contiene</option>
                  <option value="existe">existe</option>
                  <option value="esVerdadero">esVerdadero</option>
                  <option value="mayor">mayor que</option>
                  <option value="menor">menor que</option>
                </select>
                <label class="insp-label">Valor esperado</label>
                <input v-model="n.config.valor" class="insp-input" placeholder="ej. si" />
                <label class="insp-label">Si CUMPLE → bloque</label>
                <select v-model="n.config.destinoTrue" class="insp-input">
                  <option value="">→ Siguiente bloque</option>
                  <option v-for="d in destinos(n.id)" :key="d.id" :value="d.id">{{ d.txt }}</option>
                </select>
                <label class="insp-label">Si NO cumple → bloque</label>
                <select v-model="n.config.destinoFalse" class="insp-input">
                  <option value="">→ Siguiente bloque</option>
                  <option v-for="d in destinos(n.id)" :key="d.id" :value="d.id">{{ d.txt }}</option>
                </select>
              </template>
            </div>
          </div>
        </div>
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
.simple-editor { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
.simple-editor-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.simple-editor-head h3 { margin: 0; font-size: 14px; color: #0f172a; }
.simple-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.bloque-simple { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
.bloque-simple.activo { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
.bloque-simple-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #f8fafc; cursor: pointer; }
.bloque-idx { width: 22px; height: 22px; border-radius: 50%; background: #2563eb; color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.bloque-tipo { font-weight: 700; font-size: 12px; color: #0f172a; }
.bloque-resumen { flex: 1; font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bloque-edit { padding: 12px; border-top: 1px solid #e2e8f0; background: #fff; }
.btn-mini { padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 11px; }
.btn-mini.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn-mini.danger { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.btn-mini:disabled { opacity: .4; cursor: not-allowed; }
.insp-label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin: 8px 0 4px; }
.insp-input { width: 100%; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; box-sizing: border-box; margin-bottom: 2px; }
.opc-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
.opc-row .insp-input { margin-bottom: 0; }
.opc-col { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 6px; margin-bottom: 6px; background: #f8fafc; }
.opc-col .destino { font-size: 12px; color: #334155; margin-top: 4px; }
.insp-help { font-size: 11px; color: #64748b; line-height: 1.5; margin: 8px 0 0; }
</style>