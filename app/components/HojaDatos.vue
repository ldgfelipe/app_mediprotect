<script setup lang="ts">
const props = defineProps<{ recurso: string }>()

const adminToken = useCookie('admin_token')
const asistenteToken = useCookie('token')
const authToken = computed(() => adminToken.value || asistenteToken.value || '')
const headers = computed(() => ({ Authorization: `Bearer ${authToken.value}` }))

const columnas = ref<any[]>([])
const filas = ref<any[]>([])
const total = ref(0)
const limit = ref(200)
const offset = ref(0)
const busqueda = ref('')
const sort = ref('')
const dir = ref('asc')
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const ok = ref('')
const editable = ref(false)
const celdaActiva = ref<{ fila: number; col: number } | null>(null)

const columnasEditables = computed(() => columnas.value.filter(c => c.editable))

function fmtFecha(v: any): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function prepararFila(f: any): any {
  const copia: any = { ...f, __nuevo: false }
  for (const c of columnas.value) {
    if (c.type === 'date') copia[c.key] = fmtFecha(copia[c.key])
    else if (c.type === 'boolean') copia[c.key] = copia[c.key] === true
    else if (c.type === 'datetime') copia[c.key] = copia[c.key] ? new Date(copia[c.key]).toLocaleString('es-MX') : ''
  }
  return copia
}

async function cargar(conservarOffset = false) {
  cargando.value = true
  error.value = ''
  try {
    if (!conservarOffset) offset.value = 0
    const data: any = await $fetch('/api/hoja', {
      headers: headers.value,
      query: {
        recurso: props.recurso,
        q: busqueda.value || undefined,
        sort: sort.value || undefined,
        dir: dir.value,
        limit: limit.value,
        offset: offset.value,
      },
    })
    if (data?.error) { error.value = data.error; return }
    columnas.value = data.columnas || []
    filas.value = (data.filas || []).map(prepararFila)
    total.value = data.total || 0
    editable.value = !!data.editable
  } catch (e: any) {
    error.value = e?.data?.message || 'Error al cargar la hoja'
  } finally {
    cargando.value = false
  }
}

function aviso(msg: string) {
  ok.value = msg
  setTimeout(() => { if (ok.value === msg) ok.value = '' }, 2500)
}

function ordenarPor(col: any) {
  if (sort.value === col.key) dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  else { sort.value = col.key; dir.value = 'asc' }
  cargar()
}

async function guardarCelda(i: number, col: any) {
  const fila = filas.value[i]
  if (!fila || fila.__nuevo || !col.editable) return
  guardando.value = true
  error.value = ''
  try {
    await $fetch('/api/hoja', {
      method: 'POST',
      headers: headers.value,
      body: { recurso: props.recurso, action: 'update', id: fila.id, cambios: { [col.key]: fila[col.key] } },
    })
    aviso('Guardado')
  } catch (e: any) {
    error.value = e?.data?.message || 'No se pudo guardar'
    await cargar(true)
  } finally {
    guardando.value = false
  }
}

function agregarFila() {
  if (!editable.value) { error.value = 'Esta hoja es solo de consulta'; return }
  const vacia: any = { id: `nuevo-${Date.now()}`, __nuevo: true }
  for (const c of columnas.value) vacia[c.key] = c.type === 'boolean' ? false : ''
  filas.value.unshift(vacia)
}

async function guardarNueva(i: number) {
  const fila = filas.value[i]
  if (!fila?.__nuevo) return
  const cambios: Record<string, any> = {}
  for (const c of columnasEditables.value) {
    const v = fila[c.key]
    if (v !== '' && v !== null && v !== undefined) cambios[c.key] = v
  }
  guardando.value = true
  error.value = ''
  try {
    const data: any = await $fetch('/api/hoja', {
      method: 'POST',
      headers: headers.value,
      body: { recurso: props.recurso, action: 'create', cambios },
    })
    filas.value.splice(i, 1)
    if (data?.fila) filas.value.unshift(prepararFila(data.fila))
    total.value++
    aviso('Fila agregada')
  } catch (e: any) {
    error.value = e?.data?.message || 'No se pudo agregar la fila'
  } finally {
    guardando.value = false
  }
}

function cancelarNueva(i: number) {
  filas.value.splice(i, 1)
}

async function eliminarFila(i: number) {
  const fila = filas.value[i]
  if (!fila) return
  if (fila.__nuevo) return cancelarNueva(i)
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return
  guardando.value = true
  error.value = ''
  try {
    await $fetch('/api/hoja', {
      method: 'POST',
      headers: headers.value,
      body: { recurso: props.recurso, action: 'delete', id: fila.id },
    })
    filas.value.splice(i, 1)
    total.value = Math.max(0, total.value - 1)
    aviso('Registro eliminado')
  } catch (e: any) {
    error.value = e?.data?.message || 'No se pudo eliminar'
  } finally {
    guardando.value = false
  }
}

// ===== Pegar desde Excel =====
function onFocusCelda(i: number, j: number) {
  celdaActiva.value = { fila: i, col: j }
}

function indiceEditable(j: number): number {
  const col = columnas.value[j]
  return columnasEditables.value.findIndex(c => c.key === col?.key)
}

async function onPegar(ev: ClipboardEvent) {
  const act = celdaActiva.value
  if (!act || !editable.value) return
  const texto = ev.clipboardData?.getData('text/plain') || ''
  if (!texto.trim()) return

  const editIdx = indiceEditable(act.col)
  if (editIdx < 0) { error.value = 'Selecciona una celda editable para pegar'; return }
  ev.preventDefault()

  const lineas = texto.replace(/\r/g, '').split('\n').filter(l => l !== '')
  const cambiosPorFila: any[] = []
  let pegadas = 0

  lineas.forEach((linea, r) => {
    const i = act.fila + r
    const fila = filas.value[i]
    if (!fila || fila.__nuevo) return
    const celdas = linea.split('\t')
    const cambios: Record<string, any> = {}
    celdas.forEach((valor, c) => {
      const col = columnasEditables.value[editIdx + c]
      if (!col) return
      fila[col.key] = valor
      cambios[col.key] = valor
    })
    if (Object.keys(cambios).length) {
      cambiosPorFila.push({ id: fila.id, cambios })
      pegadas++
    }
  })

  if (!cambiosPorFila.length) return

  guardando.value = true
  error.value = ''
  try {
    const data: any = await $fetch('/api/hoja', {
      method: 'POST',
      headers: headers.value,
      body: { recurso: props.recurso, action: 'bulk', rows: cambiosPorFila },
    })
    if (data?.errores?.length) {
      error.value = `${data.actualizados} guardadas, ${data.errores.length} con error: ${data.errores[0].mensaje}`
      await cargar(true)
    } else {
      aviso(`${data?.actualizados || 0} filas actualizadas`)
    }
  } catch (e: any) {
    error.value = e?.data?.message || 'No se pudo pegar'
    await cargar(true)
  } finally {
    guardando.value = false
  }
}

// ===== Exportar CSV =====
async function exportarCSV() {
  try {
    const todas: any[] = []
    let off = 0
    const pageSize = 1000
    while (true) {
      const data: any = await $fetch('/api/hoja', {
        headers: headers.value,
        query: { recurso: props.recurso, q: busqueda.value || undefined, limit: pageSize, offset: off, sort: sort.value || undefined, dir: dir.value },
      })
      todas.push(...(data.filas || []))
      if (todas.length >= (data.total || 0) || (data.filas || []).length === 0) break
      off += pageSize
    }
    const cols = columnas.value
    const esc = (v: any) => {
      if (v === null || v === undefined) return ''
      const s = String(v).replace(/"/g, '""')
      return /[",\n;]/.test(s) ? `"${s}"` : s
    }
    const lineas = [cols.map(c => esc(c.label)).join(',')]
    for (const f of todas) lineas.push(cols.map(c => esc(f[c.key])).join(','))
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.recurso}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    aviso(`Exportadas ${todas.length} filas`)
  } catch (e: any) {
    error.value = e?.data?.message || 'No se pudo exportar'
  }
}

function paginaAnterior() {
  if (offset.value === 0) return
  offset.value = Math.max(0, offset.value - limit.value)
  cargar(true)
}
function paginaSiguiente() {
  if (offset.value + limit.value >= total.value) return
  offset.value += limit.value
  cargar(true)
}

const rangoTexto = computed(() => {
  if (total.value === 0) return '0 registros'
  const desde = offset.value + 1
  const hasta = Math.min(offset.value + filas.value.length, total.value)
  return `${desde}–${hasta} de ${total.value}`
})

let buscadorTimer: any = null
watch(busqueda, () => {
  clearTimeout(buscadorTimer)
  buscadorTimer = setTimeout(() => cargar(), 350)
})

watch(() => props.recurso, () => {
  sort.value = ''
  dir.value = 'asc'
  busqueda.value = ''
  cargar()
})

onMounted(() => cargar())
</script>

<template>
  <div class="hoja">
    <div class="hoja-toolbar">
      <input v-model="busqueda" class="hoja-buscar" type="search" placeholder="🔍 Buscar..." />
      <button class="hbtn" @click="cargar()" :disabled="cargando">{{ cargando ? 'Cargando...' : 'Actualizar' }}</button>
      <button v-if="editable" class="hbtn hbtn-ok" @click="agregarFila" :disabled="guardando">➕ Fila</button>
      <button class="hbtn" @click="exportarCSV">⬇ Exportar CSV</button>
      <span class="hoja-rango">{{ rangoTexto }}</span>
      <span v-if="guardando" class="hoja-guardando">Guardando…</span>
    </div>

    <div v-if="error" class="hoja-msg error">⚠️ {{ error }}</div>
    <div v-else-if="ok" class="hoja-msg ok">✓ {{ ok }}</div>

    <div v-if="!editable" class="hoja-nota">Esta hoja es de solo consulta. Puedes filtrar, ordenar y exportar.</div>
    <div v-else class="hoja-nota">
      Edita cualquier celda para guardarla. También puedes copiar un bloque desde Excel y pegarlo (Ctrl+V) sobre una celda.
    </div>

    <div class="hoja-scroll">
      <table class="hoja-tabla">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-acc"></th>
            <th
              v-for="col in columnas"
              :key="col.key"
              :class="{ 'col-virt': !col.editable }"
              @click="ordenarPor(col)"
              :title="'Ordenar por ' + col.label"
            >
              {{ col.label }}
              <span v-if="sort === col.key" class="orden">{{ dir === 'asc' ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(fila, i) in filas" :key="fila.id" :class="{ 'fila-nueva': fila.__nuevo }">
            <td class="col-num">{{ offset + i + 1 }}</td>
            <td class="col-acc">
              <button v-if="fila.__nuevo" class="ico-ok" title="Guardar" @click="guardarNueva(i)">💾</button>
              <button class="ico-del" :title="fila.__nuevo ? 'Cancelar' : 'Eliminar'" @click="eliminarFila(i)">{{ fila.__nuevo ? '✕' : '🗑' }}</button>
            </td>
            <td
              v-for="(col, j) in columnas"
              :key="col.key"
              :class="{ 'celda-virt': !col.editable }"
            >
              <template v-if="!col.editable">
                <span class="texto-virt">{{ fila[col.key] }}</span>
              </template>
              <template v-else-if="col.type === 'boolean'">
                <input type="checkbox" v-model="fila[col.key]" @focus="onFocusCelda(i, j)" @change="guardarCelda(i, col)" />
              </template>
              <template v-else-if="col.type === 'select'">
                <select v-model="fila[col.key]" @focus="onFocusCelda(i, j)" @change="guardarCelda(i, col)">
                  <option value="">—</option>
                  <option v-for="op in (col.options || [])" :key="op" :value="op">{{ op }}</option>
                </select>
              </template>
              <template v-else-if="col.type === 'date'">
                <input type="date" v-model="fila[col.key]" @focus="onFocusCelda(i, j)" @change="guardarCelda(i, col)" @paste="onPegar" />
              </template>
              <template v-else-if="col.type === 'number'">
                <input type="number" step="any" v-model="fila[col.key]" @focus="onFocusCelda(i, j)" @change="guardarCelda(i, col)" @paste="onPegar" />
              </template>
              <template v-else>
                <input
                  type="text"
                  v-model="fila[col.key]"
                  @focus="onFocusCelda(i, j)"
                  @change="guardarCelda(i, col)"
                  @paste="onPegar"
                />
              </template>
            </td>
          </tr>
          <tr v-if="!cargando && filas.length === 0">
            <td :colspan="columnas.length + 2" class="hoja-vacia">Sin registros</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="hoja-pie">
      <button class="hbtn" @click="paginaAnterior" :disabled="offset === 0 || cargando">‹ Anterior</button>
      <span>{{ rangoTexto }}</span>
      <button class="hbtn" @click="paginaSiguiente" :disabled="offset + limit >= total || cargando">Siguiente ›</button>
    </div>
  </div>
</template>

<style scoped>
.hoja { display: flex; flex-direction: column; gap: 0.75rem; }
.hoja-toolbar { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.hoja-buscar { flex: 1; min-width: 180px; padding: 0.5rem 0.75rem; border: 1px solid #dfe6e9; border-radius: 8px; font-size: 0.9rem; }
.hbtn { background: #f1f3f5; border: 1px solid #dfe6e9; color: #2d3436; padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; }
.hbtn:hover:not(:disabled) { background: #e9ecef; }
.hbtn:disabled { opacity: 0.55; cursor: not-allowed; }
.hbtn-ok { background: #00b894; color: #fff; border-color: #00b894; }
.hbtn-ok:hover:not(:disabled) { background: #00a884; }
.hoja-rango { margin-left: auto; font-size: 0.82rem; color: #636e72; }
.hoja-guardando { font-size: 0.8rem; color: #0984e3; }
.hoja-msg { padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.85rem; }
.hoja-msg.error { background: #ffebee; color: #c62828; }
.hoja-msg.ok { background: #e8f5e9; color: #2e7d32; }
.hoja-nota { font-size: 0.8rem; color: #636e72; background: #f8f9fa; border: 1px solid #eceff1; border-radius: 8px; padding: 0.5rem 0.8rem; }
.hoja-scroll { overflow: auto; max-height: 62vh; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; }
.hoja-tabla { border-collapse: separate; border-spacing: 0; font-size: 0.82rem; width: max-content; min-width: 100%; }
.hoja-tabla th { position: sticky; top: 0; z-index: 3; background: #f5f6fa; color: #2d3436; text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid #dfe6e9; border-right: 1px solid #eceff1; white-space: nowrap; cursor: pointer; font-weight: 600; }
.hoja-tabla th.col-virt { background: #eef1f5; color: #636e72; }
.hoja-tabla th:hover { background: #e9edf2; }
.orden { color: #0984e3; font-size: 0.7rem; }
.hoja-tabla td { padding: 0; border-bottom: 1px solid #f1f3f5; border-right: 1px solid #f5f6fa; }
.col-num { position: sticky; left: 0; z-index: 2; background: #f5f6fa; text-align: center; color: #95a5a6; font-size: 0.75rem; padding: 0.4rem 0.5rem; width: 44px; }
.hoja-tabla thead .col-num { z-index: 4; }
.col-acc { position: sticky; left: 44px; z-index: 2; background: #fff; width: 62px; text-align: center; padding: 0.2rem; white-space: nowrap; }
.hoja-tabla thead .col-acc { z-index: 4; background: #f5f6fa; }
.ico-del, .ico-ok { border: none; background: none; cursor: pointer; font-size: 0.85rem; padding: 0.2rem; }
.ico-del:hover { color: #d63031; }
.celda-virt { background: #f7f8fa; }
.texto-virt { display: block; padding: 0.45rem 0.6rem; color: #636e72; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hoja-tabla input, .hoja-tabla select { width: 100%; min-width: 110px; border: none; background: transparent; padding: 0.45rem 0.6rem; font-size: 0.82rem; font-family: inherit; color: #2d3436; box-sizing: border-box; }
.hoja-tabla input:focus, .hoja-tabla select:focus { outline: 2px solid #0984e3; outline-offset: -2px; background: #fff; }
.hoja-tabla input[type="checkbox"] { min-width: auto; width: auto; margin: 0.5rem; }
.hoja-tabla input[type="date"] { min-width: 140px; }
.fila-nueva { background: #fffde7; }
.hoja-vacia { text-align: center; padding: 2rem 1rem; color: #95a5a6; }
.hoja-pie { display: flex; align-items: center; justify-content: center; gap: 1rem; font-size: 0.82rem; color: #636e72; }
</style>
