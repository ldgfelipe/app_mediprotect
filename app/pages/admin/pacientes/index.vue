<script setup lang="ts">
import { useSocket } from '~/composables/useSocket'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ middleware: 'admin-auth' })
const pacientes = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const editando = ref(false)
const saving = ref(false)
const editForm = ref<any>({})
const errorMsg = ref('')
const okMsg = ref('')

// Ver citas del paciente
const showCitasModal = ref(false)
const pacienteCitas = ref<any[]>([])
const pacienteSeleccionadoCitas = ref<any>(null)
const loadingCitas = ref(false)

async function verCitasPaciente(p: any) {
  pacienteSeleccionadoCitas.value = p
  loadingCitas.value = true
  showCitasModal.value = true
  try {
    const token = useCookie('admin_token').value
    const data: any = await $fetch(`/api/admin/pacientes/${p.id}/citas`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    pacienteCitas.value = data?.citas || []
  } catch (e: any) {
    pacienteCitas.value = []
    console.error(e)
  } finally {
    loadingCitas.value = false
  }
}

function cerrarCitasModal() {
  showCitasModal.value = false
  pacienteCitas.value = []
  pacienteSeleccionadoCitas.value = null
}

function estadoColor(estado: string) {
  const colors: Record<string, string> = {
    pendiente: '#fdcb6e', confirmada: '#00b894', paciente_llego: '#0984e3',
    en_atencion: '#6c5ce7', asistida: '#00cec9', no_asistida: '#d63031',
    cancelada: '#b2bec3', reagendada: '#e17055',
    PENDIENTE_DE_COORDINACION: '#fdcb6e'
  }
  return colors[estado] || '#636e72'
}

// CURP validation
const curpValidando = ref(false)
const curpError = ref('')
const curpDatos = ref<any>(null)

// Plans
const paquetes = ref<any[]>([])

const adminToken = useCookie('admin_token')
const { on, onReconnect } = useSocket()
const { agregar } = useNotifications()

async function cargarPacientes() {
  try {
    const [pacientesData, paqData]: any[] = await Promise.all([
      $fetch('/api/admin/pacientes', { headers: { Authorization: 'Bearer ' + adminToken.value } }),
      $fetch('/api/paquetes').catch(() => ({ paquetes: [] }))
    ])
    pacientes.value = pacientesData?.pacientes || []
    paquetes.value = paqData?.paquetes || []
  } catch (e) {
    console.error('Error cargando pacientes:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await cargarPacientes()

  on('paciente:created', (data) => {
    cargarPacientes()
    agregar({ tipo: 'paciente_created', titulo: 'Nuevo paciente', mensaje: `${data.nombre || ''} ${data.apellido || ''}`, timestamp: new Date() })
  })
  on('paciente:updated', (data) => {
    cargarPacientes()
    agregar({ tipo: 'paciente_updated', titulo: 'Paciente actualizado', mensaje: `${data.nombre || ''} ${data.apellido || ''}`, timestamp: new Date() })
  })
  onReconnect(() => {
    console.log('[WS] Reconectado, recargando pacientes...')
    cargarPacientes()
  })
})

const filtered = computed(() => {
  if (!search.value) return pacientes.value
  const s = search.value.toLowerCase()
  return pacientes.value.filter(p =>
    p.nombre?.toLowerCase().includes(s) ||
    p.apellido_paterno?.toLowerCase().includes(s) ||
    p.apellido_materno?.toLowerCase().includes(s) ||
    p.apellido?.toLowerCase().includes(s) ||
    p.email?.toLowerCase().includes(s) ||
    p.telefono?.includes(s) ||
    p.curp?.toLowerCase().includes(s)
  )
})

// ========== SEPOMEX / CODIGO POSTAL ==========
const codigosPostales = ref<any[]>([])
const cpLoading = ref(false)
const cpError = ref('')
const cpResult = ref(null) // { colonias, municipio, ciudad, estado }
let cpTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => editForm.value?.codigo_postal, (val) => {
  if (cpTimeout) clearTimeout(cpTimeout)
  cpTimeout = setTimeout(() => buscarColoniasPorCP(), 400)
})

async function buscarColoniasPorCP() {
  const cp = editForm.value.codigo_postal?.replace(/[^0-9]/g, '')
  if (!cp || cp.length !== 5) {
    codigosPostales.value = []
    cpResult.value = null
    cpError.value = ''
    return
  }
  
  cpLoading.value = true
  cpError.value = ''
  cpResult.value = null
  
  try {
    const data: any = await $fetch('/api/sepomex/colonias', { params: { codigo_postal: cp } })
    if (data?.colonias && data.colonias.length > 0) {
      codigosPostales.value = data.colonias
      cpResult.value = {
        municipios: data.municipio || data.colonias[0]?.municipio,
        ciudades: data.ciudad || data.colonias[0]?.ciudad,
        estados: data.estado || data.colonias[0]?.estado,
      }
    } else {
      codigosPostales.value = []
      cpResult.value = null
      cpError.value = 'No se encontraron colonias para este código postal'
    }
  } catch (e: any) {
    codigosPostales.value = []
    cpResult.value = null
    cpError.value = e?.data?.message || 'Error al consultar colonias'
  } finally {
    cpLoading.value = false
  }
}

function seleccionarColonia() {
  const colonia = editForm.value.colonia_seleccionada
  if (!colonia) return
  const selected = codigosPostales.value.find(c => c.colonia === colonia)
  if (selected) {
    editForm.value.estado = selected.estado || ''
    editForm.value.municipio = selected.municipio || ''
    editForm.value.ciudad = selected.ciudad || ''
    editForm.value.colonia = selected.colonia || ''
  }
}

function abrirCrear() {
  editForm.value = {
    id: null, nombre: '', apellido_paterno: '', apellido_materno: '',
    email: '', telefono: '', fecha_nacimiento: '', genero: '', curp: '',
    estado_civil: '', ocupacion: '', telefono_2: '', codigo_postal: '',
    estado: '', municipio: '', ciudad: '', domicilio: '', colonia: '', colonia_seleccionada: '',
    id_paquete: '', password: ''
  }
  codigosPostales.value = []
  cpResult.value = null
  cpError.value = ''
  curpDatos.value = null
  curpError.value = ''
  errorMsg.value = ''
  okMsg.value = ''
  editando.value = true
}

function abrirEditar(p: any) {
  editForm.value = {
    id: p.id, nombre: p.nombre, apellido_paterno: p.apellido_paterno || p.apellido || '',
    apellido_materno: p.apellido_materno || '', email: p.email,
    telefono: p.telefono || '', fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.slice(0,10) : '',
    genero: p.genero || '', curp: p.curp || '',
    estado_civil: p.estado_civil || '', ocupacion: p.ocupacion || '',
    telefono_2: p.telefono_2 || '', codigo_postal: p.codigo_postal || '',
    estado: p.estado || '', municipio: p.municipio || '',
    ciudad: p.ciudad || '', domicilio: p.domicilio || '', colonia: p.colonia || '',
    colonia_seleccionada: p.colonia || '',
    id_paquete: p.id_paquete || '', password: ''
  }
  codigosPostales.value = []
  cpResult.value = null
  cpError.value = ''
  curpDatos.value = null
  curpError.value = ''
  errorMsg.value = ''
  okMsg.value = ''
  editando.value = true
}

function cerrarModal() {
  if (cpTimeout) { clearTimeout(cpTimeout); cpTimeout = null }
  editando.value = false
  errorMsg.value = ''
  okMsg.value = ''
  curpDatos.value = null
  curpError.value = ''
  codigosPostales.value = []
  cpError.value = ''
  cpResult.value = null
}

// ========== CURP VALIDATION ==========
async function validarCURP() {
  curpError.value = ''
  curpDatos.value = null
  const curp = editForm.value.curp.toUpperCase().trim()
  if (!curp || curp.length !== 18) { curpError.value = 'La CURP debe tener 18 caracteres'; return }
  curpValidando.value = true
  try {
    const data: any = await $fetch('/api/curp/validar', { params: { curp } })
    if (data.error) { curpError.value = data.error_msg || 'No se pudieron obtener datos'; return }
    curpDatos.value = data.response
    const s = data.response?.Solicitante || {}
    editForm.value.nombre = s.Nombres || editForm.value.nombre
    editForm.value.apellido_paterno = s.ApellidoPaterno || editForm.value.apellido_paterno
    editForm.value.apellido_materno = s.ApellidoMaterno || editForm.value.apellido_materno
    if (s.FechaNacimiento) {
      const parts = s.FechaNacimiento.split('/')
      if (parts.length === 3) editForm.value.fecha_nacimiento = `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    editForm.value.genero = s.ClaveSexo === 'H' ? 'masculino' : s.ClaveSexo === 'M' ? 'femenino' : editForm.value.genero
    if (s.EntidadNacimiento) editForm.value.estado = s.EntidadNacimiento
  } catch (e: any) {
    curpError.value = e?.data?.message || 'Error al validar CURP'
  }
  curpValidando.value = false
}

// ========== SAVE ==========
async function guardar() {
  errorMsg.value = ''
  okMsg.value = ''
  if (!editForm.value.nombre || !editForm.value.email) {
    errorMsg.value = 'Nombre y email son requeridos'
    return
  }
  saving.value = true
  try {
    const token = useCookie('admin_token').value
    const body: any = { ...editForm.value }
    if (!body.password) delete body.password
    if (!body.id_paquete) delete body.id_paquete
    delete body.id
    delete body.colonia_seleccionada
    body.colonia = editForm.value.colonia || ''
    if (editForm.value.id) {
      await $fetch(`/api/admin/pacientes/${editForm.value.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body
      })
      const idx = pacientes.value.findIndex(p => p.id === editForm.value.id)
      if (idx !== -1) Object.assign(pacientes.value[idx], body)
      okMsg.value = 'Paciente actualizado correctamente'
    } else {
      const res: any = await $fetch('/api/admin/pacientes', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body
      })
      if (res?.paciente) pacientes.value.unshift(res.paciente)
      okMsg.value = 'Paciente registrado correctamente'
    }
    setTimeout(() => { okMsg.value = ''; editando.value = false }, 1500)
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

function confirmarEliminar(p: any) {
  if (!confirm(`¿Eliminar a ${p.nombre} ${p.apellido_paterno || p.apellido}? Esta acción no se puede deshacer y también eliminará sus registros en empresas y citas.`)) return
  eliminarPaciente(p)
}

async function eliminarPaciente(p: any) {
  errorMsg.value = ''
  okMsg.value = ''
  try {
    await $fetch(`/api/admin/pacientes/${p.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    // Remover de la lista local
    pacientes.value = pacientes.value.filter(pac => pac.id !== p.id)
    okMsg.value = 'Paciente eliminado correctamente'
    setTimeout(() => { okMsg.value = ''; editando.value = false }, 1500)
  } catch (e: any) {
    errorMsg.value = e.data?.message || 'Error al eliminar paciente'
  }
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">Admin</span></div>
      <nav>
        <NuxtLink to="/admin">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes" class="active">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/facturacion">Facturacion</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
      <NuxtLink to="/admin/login" class="btn-logout">Cerrar Sesion</NuxtLink>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <h1>Pacientes</h1>
        <div class="search-bar">
          <input v-model="search" placeholder="Buscar por nombre, email, telefono o CURP..." />
          <span class="count">{{ filtered.length }} pacientes</span>
          <button class="btn-primary" @click="abrirCrear">+ Nuevo Paciente</button>
        </div>
      </header>
      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else class="table-container">
        <table>
          <thead><tr><th>Nombre</th><th>CURP</th><th>Email</th><th>Telefono</th><th>Registro</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <td><strong>{{ p.nombre }} {{ p.apellido_paterno || p.apellido }} {{ p.apellido_materno }}</strong></td>
              <td><span class="curp-text">{{ p.curp || '---' }}</span></td>
              <td>{{ p.email }}</td><td>{{ p.telefono || '---' }}</td>
              <td>{{ new Date(p.created_at).toLocaleDateString('es-MX') }}</td>
              <td>
                <button class="btn-edit" @click="abrirEditar(p)">Editar</button>
                <button class="btn-view" @click="verCitasPaciente(p)">👁️ Ver Citas</button>
                <button class="btn-delete" @click="confirmarEliminar(p)" title="Eliminar paciente">🗑️ Eliminar</button>
              </td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="6" class="empty">Sin resultados</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="editando" class="modal-overlay">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>{{ editForm.id ? 'Editar' : 'Nuevo' }} Paciente</h2>
            <button class="modal-close" @click="cerrarModal">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="errorMsg" class="msg-error">{{ errorMsg }}</div>
            <div v-if="okMsg" class="msg-ok">{{ okMsg }}</div>

            <!-- CURP SECTION -->
            <div class="form-section">
              <div class="form-section-title">Datos Oficiales (CURP)</div>
              <div class="curp-row">
                <div class="form-group" style="flex:1">
                  <label>CURP</label>
                  <input v-model="editForm.curp" maxlength="18" placeholder="18 caracteres" style="text-transform:uppercase; font-family:monospace; letter-spacing:1px;" @keyup.enter="validarCURP" />
                </div>
                <button class="btn-validate" @click="validarCURP" :disabled="curpValidando || !editForm.curp || editForm.curp.length !== 18">
                  <span v-if="curpValidando" class="spinner-sm"></span>
                  <span v-else>Validar CURP</span>
                </button>
              </div>
              <div v-if="curpError" class="msg-error" style="margin-top:0.5rem">{{ curpError }}</div>
              <div v-if="curpDatos" class="curp-success">
                <span class="success-icon">&#10003;</span> Datos cargados de CURP
              </div>
            </div>

            <!-- PERSONAL DATA -->
            <div class="form-section">
              <div class="form-section-title">Datos Personales</div>
              <div class="form-row">
                <div class="form-group"><label>Nombre *</label><input v-model="editForm.nombre" /></div>
                <div class="form-group"><label>Apellido Paterno</label><input v-model="editForm.apellido_paterno" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Apellido Materno</label><input v-model="editForm.apellido_materno" /></div>
                <div class="form-group"><label>Genero</label>
                  <select v-model="editForm.genero"><option value="">---</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option></select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Fecha nacimiento</label><input v-model="editForm.fecha_nacimiento" type="date" /></div>
                <div class="form-group"><label>Estado Civil</label>
                  <select v-model="editForm.estado_civil"><option value="">---</option><option value="soltero/a">Soltero/a</option><option value="casado/a">Casado/a</option><option value="divorciado/a">Divorciado/a</option><option value="viudo/a">Viudo/a</option><option value="union libre">Union libre</option></select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Ocupacion</label><input v-model="editForm.ocupacion" /></div>
                <div class="form-group"><label>Ciudad</label><input v-model="editForm.ciudad" /></div>
              </div>
            </div>

            <!-- CONTACT DATA -->
            <div class="form-section">
              <div class="form-section-title">Datos de Contacto</div>
              <div class="form-row">
                <div class="form-group"><label>Email *</label><input v-model="editForm.email" type="email" /></div>
                <div class="form-group"><label>Telefono</label><input v-model="editForm.telefono" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Telefono 2</label><input v-model="editForm.telefono_2" /></div>
                <div class="form-group"><label>Codigo Postal</label>
                  <input v-model="editForm.codigo_postal" maxlength="5" @focus="buscarColoniasPorCP" style="text-transform:uppercase;" />
                  <span v-if="cpError" class="cp-error" style="color:#d22; font-size:0.8rem; margin-left:0.5rem;">{{ cpError }}</span>
                  <span v-if="cpLoading" class="cp-loading" style="color:#636e72; font-size:0.8rem; margin-left:0.5rem;">Buscando...</span>
                </div>
              </div>
              <div v-if="codigosPostales.length > 0" class="colonias-dropdown">
                <div class="colonias-header">
                  <span>Colonias encontradas</span>
                  <span v-if="cpResult" class="colonias-resumen">
                    {{ cpResult.ciudades }},
                    {{ cpResult.municipios }},
                    {{ cpResult.estados }}
                  </span>
                </div>
                <select v-model="editForm.colonia_seleccionada" @change="seleccionarColonia">
                  <option value="">Seleccionar colonia...</option>
                  <option v-for="colonia in codigosPostales" :key="colonia.colonia" :value="colonia.colonia">
                    {{ colonia.colonia }} {{ colonia.tipo_colonia || '' }}
                  </option>
                </select>
                <span v-if="!editForm.colonia_seleccionada" class="colonias-manual">O escribe manualmente</span>
              </div>
              <div v-if="cpError" class="msg-error" style="margin-top:0.5rem;">{{ cpError }}</div>
              <div class="form-row">
                <div class="form-group"><label>Estado</label><input v-model="editForm.estado" /></div>
                <div class="form-group"><label>Municipio</label><input v-model="editForm.municipio" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Colonia</label><input v-model="editForm.colonia" placeholder="Nombre de la colonia" /></div>
                <div class="form-group"><label>Ciudad</label><input v-model="editForm.ciudad" /></div>
              </div>
              <div class="form-group"><label>Domicilio</label><textarea v-model="editForm.domicilio" rows="2"></textarea></div>
            </div>

            <!-- PLAN & PASSWORD -->
            <div class="form-section">
              <div class="form-section-title">Plan y Acceso</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Plan / Paquete</label>
                  <select v-model="editForm.id_paquete">
                    <option value="">Sin plan</option>
                    <option v-for="p in paquetes" :key="p.id" :value="p.id">{{ p.nombre }} — ${{ p.precio }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ editForm.id ? 'Password (vacio = no cambiar)' : 'Password' }}</label>
                  <input v-model="editForm.password" type="password" :placeholder="editForm.id ? 'Dejar vacio para no cambiar' : 'mediprotect123'" />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn-cancel" @click="cerrarModal">Cancelar</button>
              <button class="btn-save" @click="guardar" :disabled="saving">{{ saving ? 'Guardando...' : (editForm.id ? 'Actualizar' : 'Crear Paciente') }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Ver Citas del Paciente -->
      <div v-if="showCitasModal" class="modal-overlay" @click.self="cerrarCitasModal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>Citas de {{ pacienteSeleccionadoCitas?.nombre }} {{ pacienteSeleccionadoCitas?.apellido_paterno || pacienteSeleccionadoCitas?.apellido }}</h2>
            <button class="modal-close" @click="cerrarCitasModal">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="loadingCitas" class="loading">Cargando citas...</div>
            <div v-else-if="!pacienteCitas.length" class="empty">Este paciente no tiene citas registradas</div>
            <div v-else class="table-container">
              <table>
                <thead><tr><th>Fecha y Hora</th><th>Médico</th><th>Estado</th><th>Notas</th></tr></thead>
                <tbody>
                  <tr v-for="c in pacienteCitas" :key="c.id">
                    <td>{{ new Date(c.fecha_hora).toLocaleString('es-MX') }}</td>
                    <td>{{ c.medico_nombre }} {{ c.medico_apellido }}</td>
                    <td><span class="badge" :style="{ background: estadoColor(c.estado) }">{{ c.estado }}</span></td>
                    <td>{{ c.notas_asistente || c.notas_paciente || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-brand h2 { font-size: 1.1rem; margin: 0; }
.sidebar-brand .rol { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; text-align: center; text-decoration: none; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; }
.content-header h1 { margin: 0 0 1rem; color: #2d3436; font-size: 1.5rem; }
.search-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
.search-bar input { flex: 1; padding: 0.6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; min-width: 200px; }
.count { font-size: 0.85rem; color: #636e72; white-space: nowrap; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.table-container { background: white; border-radius: 10px; border: 1px solid #e0e0e0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; }
th { background: #f8f9fa; color: #636e72; font-weight: 600; }
.empty { text-align: center; color: #b2bec3; padding: 2rem; }
.curp-text { font-family: monospace; font-size: 0.8rem; letter-spacing: 0.5px; }
.btn-edit { background: none; border: 1px solid #0984e3; color: #0984e3; padding: 0.3rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.btn-edit:hover { background: #0984e3; color: white; }
.btn-view { background: none; border: 1px solid #6c5ce7; color: #6c5ce7; padding: 0.3rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-left: 0.3rem; }
.btn-view:hover { background: #6c5ce7; color: white; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; white-space: nowrap; }
.btn-primary:hover:not(:disabled) { background: #00a884; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; color: white; font-size: 0.75rem; text-transform: capitalize; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 620px; max-height: 90vh; overflow-y: auto; box-sizing: border-box; }
.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.15rem; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-close:hover { color: #d63031; }
.modal-body { padding: 1.5rem; }

.form-section { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f0f0f0; }
.form-section:last-of-type { border-bottom: none; }
.form-section-title { font-size: 0.75rem; color: #00b894; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem; }

.curp-row { display: flex; gap: 0.75rem; align-items: flex-end; }
.btn-validate { background: #0984e3; color: white; border: none; padding: 0.55rem 1.25rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap; min-width: 120px; display: flex; align-items: center; justify-content: center; height: fit-content; }
.btn-validate:hover:not(:disabled) { background: #0773c5; }
.btn-validate:disabled { opacity: 0.5; cursor: not-allowed; }
.curp-success { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; font-size: 0.82rem; color: #2e7d32; background: #e8f5e9; padding: 0.4rem 0.75rem; border-radius: 6px; }
.success-icon { width: 20px; height: 20px; background: #2e7d32; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }

.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-row > .form-group { flex: 1 1 0; min-width: 0; }
.form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; flex: 1 1 100%; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #00b894; }
.form-group textarea { resize: vertical; font-family: inherit; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.btn-cancel:hover { background: #eee; }
.btn-save { background: #00b894; color: white; border: none; padding: 0.55rem 1.25rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; font-weight: 600; }
.btn-save:hover { background: #00a884; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.msg-error { background: #ffebee; color: #c62828; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }
.msg-ok { background: #e8f5e9; color: #2e7d32; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.75rem; }

.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.colonias-dropdown { margin-bottom: 0.75rem; padding: 0.75rem; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; }
.colonias-header { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem; color: #2d3436; font-weight: 600; }
.colonias-resumen { font-weight: 400; color: #636e72; font-size: 0.78rem; }
.colonias-dropdown select { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.colonias-manual { display: inline-block; margin-top: 0.4rem; font-size: 0.75rem; color: #0984e3; cursor: pointer; }
.cp-loading { color: #636e72; font-size: 0.8rem; margin-top: 0.3rem; }
.cp-error { color: #d22; font-size: 0.8rem; margin-top: 0.3rem; }

@media (max-width: 640px) {
  .form-row > .form-group { flex: 1 1 100%; min-width: 0; }
  .modal { margin: 0.5rem; max-height: 95vh; }
  .modal-body { padding: 1rem; }
  .curp-row { flex-direction: column; }
  .search-bar { flex-direction: column; align-items: stretch; }
}
</style>
