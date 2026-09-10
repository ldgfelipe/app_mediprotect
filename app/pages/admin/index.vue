<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })
const admin = useCookie('admin_usuario')
const adminToken = useCookie('admin_token')
const stats = ref<any>(null)
const loading = ref(true)
const activeSection = ref('resumen')

const searchMedicos = ref('')
const searchPacientes = ref('')
const searchEmpresas = ref('')
const resultadosMedicos = ref<any[]>([])
const resultadosPacientes = ref<any[]>([])
const resultadosEmpresas = ref<any[]>([])
const loadingSearch = ref(false)

const showNuevoMedico = ref(false)
const showNuevoPaciente = ref(false)
const showNuevaEmpresa = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const okMsg = ref('')

const formMedico = ref({ nombre: '', apellido: '', email: '', telefono: '', cedula_profesional: '', titulo: 'Dr.', especialidad: '', usuario: '', password: '' })
const formPaciente = ref({ nombre: '', apellido: '', email: '', telefono: '', fecha_nacimiento: '', genero: '', ciudad: '', curp: '', password: '' })
const formEmpresa = ref({ nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '' })

const curpInput = ref('')
const curpResult = ref<any>(null)
const curpLoading = ref(false)
const curpError = ref('')

const especialidades = ref<any[]>([])

onMounted(async () => {
  try {
    const [statsData, espData] = await Promise.all([
      $fetch('/api/admin/estadisticas', { headers: { Authorization: 'Bearer ' + adminToken.value } }),
      $fetch('/api/especialidades')
    ])
    stats.value = (statsData as any)?.stats
    especialidades.value = (espData as any)?.especialidades || []
  } catch (e) { console.error(e) }
  loading.value = false
})

function cerrarSesion() {
  adminToken.value = null; admin.value = null
  navigateTo('/admin/login')
}

let searchTimeout: any = null

function buscarMedicos() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const q = searchMedicos.value.trim()
    if (!q || q.length < 2) { resultadosMedicos.value = []; return }
    loadingSearch.value = true
    try {
      const data: any = await $fetch('/api/admin/medicos', { headers: { Authorization: 'Bearer ' + adminToken.value } })
      const all = data?.medicos || []
      const s = q.toLowerCase()
      resultadosMedicos.value = all.filter((m: any) =>
        `${m.nombre} ${m.apellido}`.toLowerCase().includes(s) ||
        m.email?.toLowerCase().includes(s) || m.cedula_profesional?.toLowerCase().includes(s) || m.especialidad_nombre?.toLowerCase().includes(s)
      )
    } catch (e) { console.error(e) }
    loadingSearch.value = false
  }, 300)
}

function buscarPacientes() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const q = searchPacientes.value.trim()
    if (!q || q.length < 2) { resultadosPacientes.value = []; return }
    loadingSearch.value = true
    try {
      const data: any = await $fetch('/api/admin/pacientes', { headers: { Authorization: 'Bearer ' + adminToken.value } })
      const all = data?.pacientes || []
      const s = q.toLowerCase()
      resultadosPacientes.value = all.filter((p: any) =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s) || p.telefono?.includes(s)
      )
    } catch (e) { console.error(e) }
    loadingSearch.value = false
  }, 300)
}

function buscarEmpresas() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const q = searchEmpresas.value.trim()
    if (!q || q.length < 2) { resultadosEmpresas.value = []; return }
    loadingSearch.value = true
    try {
      const data: any = await $fetch('/api/admin/empresas', { headers: { Authorization: 'Bearer ' + adminToken.value } })
      const all = data?.empresas || []
      const s = q.toLowerCase()
      resultadosEmpresas.value = all.filter((e: any) =>
        e.nombre?.toLowerCase().includes(s) || e.email?.toLowerCase().includes(s) ||
        e.rfc?.toLowerCase().includes(s) || e.contacto_nombre?.toLowerCase().includes(s)
      )
    } catch (e) { console.error(e) }
    loadingSearch.value = false
  }, 300)
}

async function guardarMedico() {
  errorMsg.value = ''; okMsg.value = ''
  if (!formMedico.value.nombre || !formMedico.value.apellido) { errorMsg.value = 'Nombre y apellido son requeridos'; return }
  saving.value = true
  try {
    await $fetch('/api/admin/medicos', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body: formMedico.value })
    okMsg.value = 'Medico registrado correctamente'; showNuevoMedico.value = false
    formMedico.value = { nombre: '', apellido: '', email: '', telefono: '', cedula_profesional: '', titulo: 'Dr.', especialidad: '', usuario: '', password: '' }
    stats.value.total_medicos = (stats.value.total_medicos || 0) + 1
    setTimeout(() => { okMsg.value = '' }, 3000)
  } catch (e: any) { errorMsg.value = e.data?.message || 'Error al guardar' }
  finally { saving.value = false }
}

async function guardarPaciente() {
  errorMsg.value = ''; okMsg.value = ''
  if (!formPaciente.value.nombre || !formPaciente.value.email) { errorMsg.value = 'Nombre y email son requeridos'; return }
  saving.value = true
  try {
    await $fetch('/api/admin/pacientes', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body: formPaciente.value })
    okMsg.value = 'Paciente registrado correctamente'; showNuevoPaciente.value = false
    formPaciente.value = { nombre: '', apellido: '', email: '', telefono: '', fecha_nacimiento: '', genero: '', ciudad: '', curp: '', password: '' }
    stats.value.total_pacientes = (stats.value.total_pacientes || 0) + 1
    setTimeout(() => { okMsg.value = '' }, 3000)
  } catch (e: any) { errorMsg.value = e.data?.message || 'Error al guardar' }
  finally { saving.value = false }
}

async function guardarEmpresa() {
  errorMsg.value = ''; okMsg.value = ''
  if (!formEmpresa.value.nombre || !formEmpresa.value.email) { errorMsg.value = 'Nombre y email son requeridos'; return }
  saving.value = true
  try {
    await $fetch('/api/admin/empresas', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken.value }, body: formEmpresa.value })
    okMsg.value = 'Empresa registrada correctamente'; showNuevaEmpresa.value = false
    formEmpresa.value = { nombre: '', rfc: '', email: '', telefono: '', contacto_nombre: '', direccion: '', ciudad: '', estado: '' }
    stats.value.total_empresas = (stats.value.total_empresas || 0) + 1
    setTimeout(() => { okMsg.value = '' }, 3000)
  } catch (e: any) { errorMsg.value = e.data?.message || 'Error al guardar' }
  finally { saving.value = false }
}

async function validarCURP() {
  curpError.value = ''
  curpResult.value = null
  const curp = curpInput.value.toUpperCase().trim()
  if (!curp || curp.length !== 18) {
    curpError.value = 'La CURP debe tener exactamente 18 caracteres'
    return
  }
  curpLoading.value = true
  try {
    const data = await $fetch('/api/admin/validar-curp', { params: { curp } })
    curpResult.value = data
  } catch (e: any) {
    curpError.value = e?.data?.message || e?.message || 'Error al validar CURP'
  }
  curpLoading.value = false
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand"><h2>MediProtect</h2><span class="rol">{{ admin?.rol_nombre || admin?.rol || 'Admin' }}</span></div>
      <nav>
        <NuxtLink to="/admin" class="active">Dashboard</NuxtLink>
        <NuxtLink to="/admin/pacientes">Pacientes</NuxtLink>
        <NuxtLink to="/admin/medicos">Medicos</NuxtLink>
        <NuxtLink to="/admin/empresas">Empresas</NuxtLink>
        <NuxtLink to="/admin/pagos">Pagos</NuxtLink>
        <NuxtLink to="/admin/citas">Citas</NuxtLink>
        <NuxtLink to="/admin/asistentes">Asistentes</NuxtLink>
        <NuxtLink to="/admin/usuarios">Usuarios</NuxtLink>
        <NuxtLink to="/admin/planes">Planes</NuxtLink>
        <NuxtLink to="/admin/facturacion">Facturacion</NuxtLink>
        <NuxtLink to="/admin/configuracion">Configuracion</NuxtLink>
      </nav>
      <button @click="cerrarSesion" class="btn-logout">Cerrar Sesion</button>
    </aside>
    <main class="admin-content">
      <header class="content-header">
        <div>
          <h1>Panel de Administracion</h1>
          <p>Bienvenido, {{ admin?.nombre }} — {{ new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
        </div>
      </header>
      <p v-if="loading" class="loading">Cargando...</p>
      <div v-else>
        <div class="stats-grid">
          <div class="stat-card clickable" @click="activeSection = 'medicos'"><span class="num">{{ stats?.total_medicos || 0 }}</span><span class="label">Medicos</span></div>
          <div class="stat-card clickable" @click="activeSection = 'pacientes'"><span class="num">{{ stats?.total_pacientes || 0 }}</span><span class="label">Pacientes</span></div>
          <div class="stat-card clickable" @click="activeSection = 'empresas'"><span class="num">{{ stats?.total_empresas || 0 }}</span><span class="label">Empresas</span></div>
          <div class="stat-card clickable" @click="activeSection = 'citas'"><span class="num">{{ stats?.total_citas || 0 }}</span><span class="label">Citas</span><small v-if="stats?.citas_pendientes">{{ stats.citas_pendientes }} pendientes</small></div>
          <div class="stat-card accent-green"><span class="num">${{ (stats?.ingresos_totales || 0).toLocaleString() }}</span><span class="label">Ingresos</span></div>
        </div>
        <div v-if="okMsg" class="toast-success">{{ okMsg }}</div>
        <div v-if="errorMsg" class="toast-error">{{ errorMsg }}</div>
        <div class="section-nav">
          <button :class="['nav-btn', { active: activeSection === 'resumen' }]" @click="activeSection = 'resumen'">Resumen</button>
          <button :class="['nav-btn', { active: activeSection === 'medicos' }]" @click="activeSection = 'medicos'">Medicos</button>
          <button :class="['nav-btn', { active: activeSection === 'pacientes' }]" @click="activeSection = 'pacientes'">Pacientes</button>
          <button :class="['nav-btn', { active: activeSection === 'empresas' }]" @click="activeSection = 'empresas'">Empresas</button>
          <button :class="['nav-btn', { active: activeSection === 'integraciones' }]" @click="activeSection = 'integraciones'">Integraciones</button>
        </div>

        <div v-if="activeSection === 'resumen'" class="panel">
          <div class="summary-cards">
            <NuxtLink to="/admin/pacientes" class="summary-card"><h3>Pacientes</h3><p>{{ stats?.total_pacientes || 0 }} registrados</p><span class="action">Gestionar</span></NuxtLink>
            <NuxtLink to="/admin/medicos" class="summary-card"><h3>Medicos</h3><p>{{ stats?.total_medicos || 0 }} registrados</p><span class="action">Gestionar</span></NuxtLink>
            <NuxtLink to="/admin/empresas" class="summary-card"><h3>Empresas</h3><p>{{ stats?.total_empresas || 0 }} afiliadas</p><span class="action">Gestionar</span></NuxtLink>
            <NuxtLink to="/admin/citas" class="summary-card"><h3>Citas</h3><p>{{ stats?.citas_pendientes || 0 }} pendientes de {{ stats?.total_citas || 0 }}</p><span class="action">Ver</span></NuxtLink>
          </div>
        </div>

        <div v-if="activeSection === 'medicos'" class="panel">
          <div class="panel-header"><h2>Directorio de Medicos</h2><button class="btn-primary" @click="showNuevoMedico = true">+ Nuevo Medico</button></div>
          <div class="search-box"><input v-model="searchMedicos" @input="buscarMedicos" placeholder="Buscar por nombre, email, cedula o especialidad..." /><span v-if="loadingSearch" class="spinner">...</span></div>
          <div v-if="resultadosMedicos.length > 0" class="results-list">
            <div v-for="m in resultadosMedicos" :key="m.id" class="result-card">
              <div class="result-avatar blue"><img v-if="m.foto_url" :src="m.foto_url" :alt="m.nombre" /><span v-else>{{ m.nombre?.charAt(0) }}{{ m.apellido?.charAt(0) }}</span></div>
              <div class="result-info"><strong>{{ m.titulo || 'Dr.' }} {{ m.nombre }} {{ m.apellido }}</strong><span class="result-meta">{{ m.especialidad_nombre || 'Sin especialidad' }}</span><span class="result-meta">{{ m.email || '' }} {{ m.telefono ? '· ' + m.telefono : '' }}</span></div>
              <span class="result-badge" :class="m.activo ? 'activo' : 'inactivo'">{{ m.activo ? 'Activo' : 'Inactivo' }}</span>
            </div>
          </div>
          <div v-else-if="searchMedicos.length >= 2" class="empty-results">No se encontraron medicos con "{{ searchMedicos }}"</div>
          <div v-else class="empty-results">Escribe al menos 2 caracteres para buscar un medico</div>
        </div>

        <div v-if="activeSection === 'pacientes'" class="panel">
          <div class="panel-header"><h2>Directorio de Pacientes</h2><button class="btn-primary" @click="showNuevoPaciente = true">+ Nuevo Paciente</button></div>
          <div class="search-box"><input v-model="searchPacientes" @input="buscarPacientes" placeholder="Buscar por nombre, email o telefono..." /><span v-if="loadingSearch" class="spinner">...</span></div>
          <div v-if="resultadosPacientes.length > 0" class="results-list">
            <div v-for="p in resultadosPacientes" :key="p.id" class="result-card">
              <div class="result-avatar green"><span>{{ p.nombre?.charAt(0) }}{{ p.apellido?.charAt(0) }}</span></div>
              <div class="result-info"><strong>{{ p.nombre }} {{ p.apellido }}</strong><span class="result-meta">{{ p.email || '' }}</span><span class="result-meta">{{ p.telefono || '' }}</span></div>
              <span class="result-date">{{ p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX') : '' }}</span>
            </div>
          </div>
          <div v-else-if="searchPacientes.length >= 2" class="empty-results">No se encontraron pacientes con "{{ searchPacientes }}"</div>
          <div v-else class="empty-results">Escribe al menos 2 caracteres para buscar un paciente</div>
        </div>

        <div v-if="activeSection === 'empresas'" class="panel">
          <div class="panel-header"><h2>Directorio de Empresas</h2><button class="btn-primary" @click="showNuevaEmpresa = true">+ Nueva Empresa</button></div>
          <div class="search-box"><input v-model="searchEmpresas" @input="buscarEmpresas" placeholder="Buscar por nombre, RFC, email o contacto..." /><span v-if="loadingSearch" class="spinner">...</span></div>
          <div v-if="resultadosEmpresas.length > 0" class="results-list">
            <div v-for="e in resultadosEmpresas" :key="e.id" class="result-card">
              <div class="result-avatar orange"><span>{{ e.nombre?.charAt(0) }}</span></div>
              <div class="result-info"><strong>{{ e.nombre }}</strong><span class="result-meta">{{ e.rfc || '' }} {{ e.contacto_nombre ? '· Contacto: ' + e.contacto_nombre : '' }}</span><span class="result-meta">{{ e.email || '' }} {{ e.telefono ? '· ' + e.telefono : '' }}</span></div>
              <span class="result-badge" :class="e.activo ? 'activo' : 'inactivo'">{{ e.activo ? 'Activa' : 'Inactiva' }}</span>
            </div>
          </div>
          <div v-else-if="searchEmpresas.length >= 2" class="empty-results">No se encontraron empresas con "{{ searchEmpresas }}"</div>
          <div v-else class="empty-results">Escribe al menos 2 caracteres para buscar una empresa</div>
        </div>

        <div v-if="activeSection === 'integraciones'" class="panel">
          <div class="panel-header"><h2>Pruebas de Integracion</h2></div>

          <div class="integration-card">
            <div class="integration-header">
              <h3>Validador de CURP</h3>
              <span class="integration-badge">API Externa</span>
            </div>
            <p class="integration-desc">Consulta datos de una CURP contra el servicio de validacion oficial de Mexico.</p>

            <div class="curp-input-row">
              <div class="form-group" style="flex:1">
                <label>CURP a validar</label>
                <input v-model="curpInput" maxlength="18" placeholder="18 caracteres (ej. XAXX010101HTCPRL09)" style="text-transform:uppercase; font-family:monospace; letter-spacing:1px;" @keyup.enter="validarCURP" />
              </div>
              <button class="btn-primary" @click="validarCURP" :disabled="curpLoading" style="align-self:flex-end">{{ curpLoading ? 'Consultando...' : 'Validar CURP' }}</button>
            </div>

            <div v-if="curpError" class="integration-error">{{ curpError }}</div>

            <div v-if="curpResult" class="curp-result">
              <div class="result-section">
                <h4>Datos del Solicitante</h4>
                <div class="result-grid">
                  <div class="result-field"><label>CURP</label><span>{{ curpResult.response?.Solicitante?.CURP || '-' }}</span></div>
                  <div class="result-field"><label>Status</label><span :class="curpResult.error ? 'status-error' : 'status-ok'">{{ curpResult.error ? 'Error' : 'Valida' }}</span></div>
                  <div class="result-field"><label>Nombres</label><span>{{ curpResult.response?.Solicitante?.Nombres || '-' }}</span></div>
                  <div class="result-field"><label>Apellido Paterno</label><span>{{ curpResult.response?.Solicitante?.ApellidoPaterno || '-' }}</span></div>
                  <div class="result-field"><label>Apellido Materno</label><span>{{ curpResult.response?.Solicitante?.ApellidoMaterno || '-' }}</span></div>
                  <div class="result-field"><label>Sexo</label><span>{{ curpResult.response?.Solicitante?.Sexo || '-' }}</span></div>
                  <div class="result-field"><label>Fecha Nacimiento</label><span>{{ curpResult.response?.Solicitante?.FechaNacimiento || '-' }}</span></div>
                  <div class="result-field"><label>Nacionalidad</label><span>{{ curpResult.response?.Solicitante?.Nacionalidad || '-' }}</span></div>
                  <div class="result-field"><label>Entidad Nacimiento</label><span>{{ curpResult.response?.Solicitante?.EntidadNacimiento || '-' }}</span></div>
                  <div class="result-field"><label>Doc. Probatorio</label><span>{{ curpResult.response?.Solicitante?.DocProbatorio || '-' }}</span></div>
                </div>
              </div>
              <div class="result-section">
                <h4>Documento Probatorio</h4>
                <div class="result-grid">
                  <div class="result-field"><label>Anio Registro</label><span>{{ curpResult.response?.DocProbatorio?.AnioRegistro || '-' }}</span></div>
                  <div class="result-field"><label>Entidad Emisora</label><span>{{ curpResult.response?.DocProbatorio?.EntidadRegistrante || '-' }}</span></div>
                  <div class="result-field"><label>Num Acta</label><span>{{ curpResult.response?.DocProbatorio?.NumActa || '-' }}</span></div>
                  <div class="result-field"><label>Foja</label><span>{{ curpResult.response?.DocProbatorio?.Foja || '-' }}</span></div>
                </div>
              </div>
              <details class="json-details">
                <summary>Ver respuesta JSON completa</summary>
                <pre>{{ JSON.stringify(curpResult, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showNuevoMedico" class="modal-overlay">
      <div class="modal"><div class="modal-header"><h2>Nuevo Medico</h2><button class="modal-close" @click="showNuevoMedico = false">&times;</button></div>
        <div class="modal-body">
          <div class="form-row"><div class="form-group"><label>Nombre *</label><input v-model="formMedico.nombre" /></div><div class="form-group"><label>Apellido *</label><input v-model="formMedico.apellido" /></div></div>
          <div class="form-row"><div class="form-group"><label>Email</label><input v-model="formMedico.email" type="email" /></div><div class="form-group"><label>Telefono</label><input v-model="formMedico.telefono" /></div></div>
          <div class="form-row"><div class="form-group"><label>Cedula Profesional</label><input v-model="formMedico.cedula_profesional" /></div><div class="form-group"><label>Titulo</label><input v-model="formMedico.titulo" placeholder="Dr." /></div></div>
          <div class="form-group"><label>Especialidad</label><select v-model="formMedico.especialidad"><option value="">Seleccionar...</option><option v-for="e in especialidades" :key="e.id" :value="e.nombre">{{ e.nombre }}</option></select></div>
          <div class="form-row"><div class="form-group"><label>Usuario (login)</label><input v-model="formMedico.usuario" placeholder="dr.lopez" /></div><div class="form-group"><label>Contrasena</label><input v-model="formMedico.password" type="password" placeholder="******" /></div></div>
          <div class="form-actions"><button class="btn-cancel" @click="showNuevoMedico = false">Cancelar</button><button class="btn-primary" @click="guardarMedico" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
        </div>
      </div>
    </div>

    <div v-if="showNuevoPaciente" class="modal-overlay">
      <div class="modal"><div class="modal-header"><h2>Nuevo Paciente</h2><button class="modal-close" @click="showNuevoPaciente = false">&times;</button></div>
        <div class="modal-body">
          <div class="form-row"><div class="form-group"><label>Nombre *</label><input v-model="formPaciente.nombre" /></div><div class="form-group"><label>Apellido</label><input v-model="formPaciente.apellido" /></div></div>
          <div class="form-row"><div class="form-group"><label>Email *</label><input v-model="formPaciente.email" type="email" /></div><div class="form-group"><label>Telefono</label><input v-model="formPaciente.telefono" /></div></div>
          <div class="form-row"><div class="form-group"><label>Fecha nacimiento</label><input v-model="formPaciente.fecha_nacimiento" type="date" /></div><div class="form-group"><label>Genero</label><select v-model="formPaciente.genero"><option value="">---</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select></div></div>
          <div class="form-row"><div class="form-group"><label>Ciudad</label><input v-model="formPaciente.ciudad" /></div><div class="form-group"><label>CURP</label><input v-model="formPaciente.curp" maxlength="18" placeholder="18 caracteres" /></div></div>
          <div class="form-group"><label>Contrasena (default: mediprotect123)</label><input v-model="formPaciente.password" type="password" placeholder="******" /></div>
          <div class="form-actions"><button class="btn-cancel" @click="showNuevoPaciente = false">Cancelar</button><button class="btn-primary" @click="guardarPaciente" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
        </div>
      </div>
    </div>

    <div v-if="showNuevaEmpresa" class="modal-overlay">
      <div class="modal"><div class="modal-header"><h2>Nueva Empresa</h2><button class="modal-close" @click="showNuevaEmpresa = false">&times;</button></div>
        <div class="modal-body">
          <div class="form-row"><div class="form-group"><label>Nombre *</label><input v-model="formEmpresa.nombre" /></div><div class="form-group"><label>RFC</label><input v-model="formEmpresa.rfc" /></div></div>
          <div class="form-row"><div class="form-group"><label>Email *</label><input v-model="formEmpresa.email" type="email" /></div><div class="form-group"><label>Telefono</label><input v-model="formEmpresa.telefono" /></div></div>
          <div class="form-group"><label>Contacto</label><input v-model="formEmpresa.contacto_nombre" /></div>
          <div class="form-group"><label>Direccion</label><input v-model="formEmpresa.direccion" /></div>
          <div class="form-row"><div class="form-group"><label>Ciudad</label><input v-model="formEmpresa.ciudad" /></div><div class="form-group"><label>Estado</label><input v-model="formEmpresa.estado" /></div></div>
          <div class="form-actions"><button class="btn-cancel" @click="showNuevaEmpresa = false">Cancelar</button><button class="btn-primary" @click="guardarEmpresa" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #2d3436; color: white; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-brand h2 { font-size: 1.1rem; margin: 0; }
.sidebar-brand .rol { font-size: 0.75rem; color: #b2bec3; }
.sidebar nav { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar nav a { color: #dfe6e9; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: 0.15s; }
.sidebar nav a.active, .sidebar nav a:hover { background: #00b894; color: white; }
.btn-logout { background: none; border: 1px solid #636e72; color: #b2bec3; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem; font-size: 0.85rem; }
.btn-logout:hover { border-color: #d63031; color: #d63031; }
.admin-content { flex: 1; padding: 2rem; background: #f5f6fa; overflow-y: auto; }
.content-header h1 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.content-header p { color: #636e72; font-size: 0.85rem; margin: 0.25rem 0 2rem; text-transform: capitalize; }
.loading { text-align: center; color: #636e72; padding: 3rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; }
.stat-card.clickable { cursor: pointer; transition: 0.15s; }
.stat-card.clickable:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,184,148,0.15); }
.stat-card .num { font-size: 1.8rem; font-weight: 700; color: #2d3436; line-height: 1.2; }
.stat-card .label { font-size: 0.8rem; color: #636e72; margin-top: 0.25rem; }
.stat-card small { font-size: 0.75rem; color: #d63031; margin-top: 0.15rem; }
.stat-card.accent-green { border-left: 3px solid #00b894; }
.toast-success { position: fixed; bottom: 2rem; right: 2rem; background: #00b894; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; z-index: 1001; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.toast-error { background: #ffebee; color: #c62828; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem; border: 1px solid #ffd7d7; }
.section-nav { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.nav-btn { padding: 0.5rem 1rem; border: 1px solid #e0e0e0; background: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #636e72; transition: 0.15s; }
.nav-btn.active { background: #00b894; color: white; border-color: #00b894; }
.panel { background: white; border-radius: 10px; border: 1px solid #e0e0e0; padding: 1.5rem; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.panel-header h2 { margin: 0; color: #2d3436; font-size: 1.2rem; }
.btn-primary { background: #00b894; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
.btn-primary:hover:not(:disabled) { background: #00a884; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-cancel:hover { background: #eee; }
.search-box { position: relative; margin-bottom: 1rem; }
.search-box input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; }
.search-box input:focus { outline: none; border-color: #00b894; }
.spinner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); }
.results-list { display: flex; flex-direction: column; gap: 0.5rem; }
.result-card { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 1rem; border: 1px solid #e0e0e0; border-radius: 10px; cursor: pointer; transition: 0.15s; }
.result-card:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.result-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.85rem; flex-shrink: 0; overflow: hidden; }
.result-avatar.blue { background: #0984e3; }
.result-avatar.green { background: #00b894; }
.result-avatar.orange { background: #e17055; }
.result-avatar img { width: 100%; height: 100%; object-fit: cover; }
.result-info { flex: 1; display: flex; flex-direction: column; }
.result-info strong { font-size: 0.95rem; color: #2d3436; }
.result-meta { font-size: 0.8rem; color: #636e72; }
.result-badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.result-badge.activo { background: #e8f5e9; color: #2e7d32; }
.result-badge.inactivo { background: #ffebee; color: #c62828; }
.result-date { font-size: 0.8rem; color: #b2bec3; white-space: nowrap; }
.empty-results { text-align: center; padding: 2rem; color: #636e72; font-size: 0.9rem; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.summary-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; text-decoration: none; color: inherit; transition: 0.15s; }
.summary-card:hover { border-color: #00b894; box-shadow: 0 2px 8px rgba(0,184,148,0.1); }
.summary-card h3 { margin: 0 0 0.25rem; font-size: 1rem; color: #2d3436; }
.summary-card p { margin: 0; font-size: 0.85rem; color: #636e72; }
.summary-card .action { display: inline-block; margin-top: 0.75rem; font-size: 0.8rem; color: #00b894; font-weight: 600; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { margin: 0; font-size: 1.15rem; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; }
.modal-close:hover { color: #d63031; }
.modal-body { padding: 1.5rem; }
.form-row { display: flex; gap: 1rem; }
.form-row > .form-group { flex: 1; }
.form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
.form-group label { font-size: 0.8rem; color: #636e72; margin-bottom: 0.3rem; font-weight: 500; }
.form-group input, .form-group select { padding: 0.55rem 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.85rem; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #00b894; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
.integration-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; }
.integration-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.integration-header h3 { margin: 0; font-size: 1.05rem; color: #2d3436; }
.integration-badge { background: #e3f2fd; color: #1565c0; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 10px; }
.integration-desc { color: #636e72; font-size: 0.85rem; margin: 0 0 1rem; }
.curp-input-row { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
.integration-error { background: #ffebee; color: #c62828; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-top: 1rem; border: 1px solid #ffd7d7; }
.curp-result { margin-top: 1.25rem; }
.result-section { margin-bottom: 1.25rem; }
.result-section h4 { margin: 0 0 0.75rem; font-size: 0.95rem; color: #2d3436; border-bottom: 1px solid #f0f0f0; padding-bottom: 0.5rem; }
.result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
.result-field { display: flex; flex-direction: column; }
.result-field label { font-size: 0.75rem; color: #636e72; margin-bottom: 0.15rem; font-weight: 500; }
.result-field span { font-size: 0.9rem; color: #2d3436; }
.status-ok { color: #2e7d32; font-weight: 600; }
.status-error { color: #c62828; font-weight: 600; }
.json-details { margin-top: 1rem; }
.json-details summary { cursor: pointer; font-size: 0.85rem; color: #0984e3; font-weight: 500; padding: 0.4rem 0; }
.json-details pre { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; font-size: 0.78rem; overflow-x: auto; max-height: 400px; overflow-y: auto; margin-top: 0.5rem; }
@media (max-width: 640px) {
  .curp-input-row { flex-direction: column; }
  .result-grid { grid-template-columns: 1fr; }
}
</style>
