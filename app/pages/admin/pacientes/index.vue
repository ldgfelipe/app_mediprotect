<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const pacientes = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const editando = ref(false)
const saving = ref(false)
const editForm = ref<any>({})
const errorMsg = ref('')
const okMsg = ref('')

// CURP validation
const curpValidando = ref(false)
const curpError = ref('')
const curpDatos = ref<any>(null)

// Plans
const paquetes = ref<any[]>([])

onMounted(async () => {
  const [pacientesData, paqData]: any[] = await Promise.all([
    useFetch('/api/admin/pacientes'),
    $fetch('/api/paquetes').catch(() => ({ paquetes: [] }))
  ])
  pacientes.value = pacientesData.data.value?.pacientes || []
  paquetes.value = paqData?.paquetes || []
  loading.value = false
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

function abrirCrear() {
  editForm.value = {
    id: null, nombre: '', apellido_paterno: '', apellido_materno: '',
    email: '', telefono: '', fecha_nacimiento: '', genero: '', curp: '',
    estado_civil: '', ocupacion: '', telefono_2: '', codigo_postal: '',
    estado: '', municipio: '', ciudad: '', domicilio: '', id_paquete: '', password: ''
  }
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
    ciudad: p.ciudad || '', domicilio: p.domicilio || '',
    id_paquete: p.id_paquete || '', password: ''
  }
  curpDatos.value = null
  curpError.value = ''
  errorMsg.value = ''
  okMsg.value = ''
  editando.value = true
}

function cerrarModal() {
  editando.value = false
  errorMsg.value = ''
  okMsg.value = ''
  curpDatos.value = null
  curpError.value = ''
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
              <td><button class="btn-edit" @click="abrirEditar(p)">Editar</button></td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="6" class="empty">Sin resultados</td></tr>
          </tbody>
        </table>
      </div>

      <div v-if="editando" class="modal-overlay" @click.self="cerrarModal">
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
                <div class="form-group"><label>Codigo Postal</label><input v-model="editForm.codigo_postal" maxlength="5" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Estado</label><input v-model="editForm.estado" /></div>
                <div class="form-group"><label>Municipio</label><input v-model="editForm.municipio" /></div>
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
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; white-space: nowrap; }
.btn-primary:hover:not(:disabled) { background: #00a884; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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

@media (max-width: 640px) {
  .form-row > .form-group { flex: 1 1 100%; min-width: 0; }
  .modal { margin: 0.5rem; max-height: 95vh; }
  .modal-body { padding: 1rem; }
  .curp-row { flex-direction: column; }
  .search-bar { flex-direction: column; align-items: stretch; }
}
</style>
