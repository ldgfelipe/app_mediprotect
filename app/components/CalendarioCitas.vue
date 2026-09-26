<template>
  <div class="calendario">
    <!-- Header del calendario -->
    <div class="cal-header">
      <button class="nav-btn" @click="mesAnterior">‹</button>
      <h3>{{ nombreMes }} {{ anio }}</h3>
      <button class="nav-btn" @click="mesSiguiente">›</button>
      <button class="btn-hoy" @click="irHoy">Hoy</button>
    </div>

    <!-- Días de la semana -->
    <div class="cal-weekdays">
      <div v-for="dia in diasSemana" :key="dia" class="weekday">{{ dia }}</div>
    </div>

    <!-- Días del mes -->
    <div class="cal-days">
      <div
        v-for="(dia, index) in diasDelMes"
        :key="index"
        class="cal-day"
        :class="{
          'other-month': !dia.esMesActual,
          'today': dia.esHoy,
          'selected': dia.fecha === diaSeleccionado,
          'has-citas': dia.citas.length > 0
        }"
        @click="seleccionarDia(dia)"
      >
        <span class="day-num">{{ dia.numero }}</span>
        <div class="day-badge" v-if="dia.citas.length > 0" :style="{ background: colorPrioritario(dia.citas) }">
          <span class="badge-icon">📋</span>
          <span class="badge-count">{{ dia.citas.length }}</span>
        </div>
      </div>
    </div>

    <!-- Modal fullscreen de citas del día -->
    <div v-if="showModal && diaSeleccionado && citasDelDia.length > 0" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-fullscreen">
        <div class="modal-header">
          <div class="modal-title">
            <h2>📅 Citas del {{ formatoFechaLarga(diaSeleccionado) }}</h2>
            <span class="modal-count">{{ citasDelDia.length }} cita{{ citasDelDia.length > 1 ? 's' : '' }}</span>
          </div>
          <button class="modal-close" @click="cerrarModal">✕</button>
        </div>

        <div class="modal-body">
          <!-- Resumen de estados -->
          <div class="status-summary">
            <div v-for="item in resumenEstados" :key="item.estado" class="status-chip" :style="{ background: item.color + '20', color: item.color, borderColor: item.color }">
              <span class="chip-count">{{ item.count }}</span>
              <span class="chip-label">{{ item.label }}</span>
            </div>
          </div>

          <!-- Lista de citas -->
          <div class="appointments-table">
            <div class="table-header">
              <span class="col-hora">Hora</span>
              <span class="col-paciente">Paciente</span>
              <span class="col-medico">Médico</span>
              <span class="col-telefono">Teléfono</span>
              <span class="col-estado">Estado</span>
              <span class="col-acciones">Acción</span>
            </div>

            <div
              v-for="cita in citasDelDia"
              :key="cita.id"
              class="table-row"
              @click="abrirCita(cita)"
            >
              <span class="col-hora">{{ formatoHora(cita.fecha_hora) }}</span>
              <span class="col-paciente">
                <strong>{{ cita.paciente_nombre }} {{ cita.paciente_apellido }}</strong>
              </span>
              <span class="col-medico">{{ cita.medico_nombre }} {{ cita.medico_apellido }}</span>
              <span class="col-telefono">{{ cita.paciente_telefono || '—' }}</span>
              <span class="col-estado">
                <span class="estado-badge" :style="{ background: colorEstado(cita.estado) }">{{ cita.estado }}</span>
              </span>
              <span class="col-acciones">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leyenda -->
    <div class="cal-legend">
      <div class="legend-item" v-for="item in legendItems" :key="item.estado">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  citas: { type: Array, default: () => [] }
})

const emit = defineEmits(['seleccionar-cita', 'crear-cita'])

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const hoy = new Date()
const mesActual = ref(hoy.getMonth())
const anio = ref(hoy.getFullYear())
const diaSeleccionado = ref(null)
const showModal = ref(false)

const nombreMes = computed(() => meses[mesActual.value])

// Mapeo de colores por estado
const coloresEstado = {
  pendiente: '#fdcb6e',
  confirmada: '#00b894',
  paciente_llego: '#0984e3',
  en_atencion: '#6c5ce7',
  asistida: '#00cec9',
  no_asistida: '#d63031',
  cancelada: '#b2bec3',
  reagendada: '#e17055',
  PENDIENTE_DE_COORDINACION: '#fdcb6e'
}

const legendItems = [
  { estado: 'pendiente', color: '#fdcb6e', label: 'Pendiente' },
  { estado: 'confirmada', color: '#00b894', label: 'Confirmada' },
  { estado: 'paciente_llego', color: '#0984e3', label: 'Paciente llegó' },
  { estado: 'en_atencion', color: '#6c5ce7', label: 'En atención' },
  { estado: 'asistida', color: '#00cec9', label: 'Asistida' },
  { estado: 'cancelada', color: '#b2bec3', label: 'Cancelada' }
]

function colorEstado(estado) {
  return coloresEstado[estado] || '#636e72'
}

// Color prioritario: usa el color de la cita más importante del día
function colorPrioritario(citas) {
  const prioridad = ['en_atencion', 'paciente_llego', 'confirmada', 'pendiente', 'reagendada', 'asistida', 'no_asistida', 'cancelada']
  for (const estado of prioridad) {
    if (citas.some(c => c.estado === estado)) {
      return coloresEstado[estado] || '#636e72'
    }
  }
  return '#636e72'
}

// Generar días del mes
const diasDelMes = computed(() => {
  const primerDia = new Date(anio.value, mesActual.value, 1)
  const ultimoDia = new Date(anio.value, mesActual.value + 1, 0)

  // Ajustar para que lunes sea el primer día
  let diaInicio = primerDia.getDay() - 1
  if (diaInicio < 0) diaInicio = 6

  const dias = []

  // Días del mes anterior
  const mesAnterior = new Date(anio.value, mesActual.value, 0)
  for (let i = diaInicio - 1; i >= 0; i--) {
    const fecha = new Date(anio.value, mesActual.value - 1, mesAnterior.getDate() - i)
    dias.push(crearDia(fecha, false))
  }

  // Días del mes actual
  for (let i = 1; i <= ultimoDia.getDate(); i++) {
    const fecha = new Date(anio.value, mesActual.value, i)
    dias.push(crearDia(fecha, true))
  }

  // Días del mes siguiente (para completar 6 filas)
  const diasRestantes = 42 - dias.length
  for (let i = 1; i <= diasRestantes; i++) {
    const fecha = new Date(anio.value, mesActual.value + 1, i)
    dias.push(crearDia(fecha, false))
  }

  return dias
})

function crearDia(fecha, esMesActual) {
  const fechaStr = formatoFecha(fecha)
  const esHoy = formatoFecha(new Date()) === fechaStr
  const citasDelDia = props.citas.filter(c => {
    // Convertir a fecha local para comparar correctamente
    const fechaCita = new Date(c.fecha_hora)
    const fechaLocal = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate())
    const citaFecha = formatoFecha(fechaLocal)
    return citaFecha === fechaStr
  })

  return {
    fecha: fechaStr,
    numero: fecha.getDate(),
    esMesActual,
    esHoy,
    citas: citasDelDia
  }
}

function formatoFecha(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatoFechaLarga(fechaStr) {
  const fecha = new Date(fechaStr + 'T12:00:00')
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  return fecha.toLocaleDateString('es-MX', opciones)
}

function formatoHora(fechaISO) {
  const fecha = new Date(fechaISO)
  return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const citasDelDia = computed(() => {
  if (!diaSeleccionado.value) return []
  return props.citas.filter(c => {
    // Convertir a fecha local para comparar correctamente
    const fechaCita = new Date(c.fecha_hora)
    const fechaLocal = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate())
    const citaFecha = formatoFecha(fechaLocal)
    return citaFecha === diaSeleccionado.value
  }).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
})

// Resumen de estados para el día seleccionado
const resumenEstados = computed(() => {
  if (!citasDelDia.value.length) return []
  const counts = {}
  for (const c of citasDelDia.value) {
    counts[c.estado] = (counts[c.estado] || 0) + 1
  }
  return Object.entries(counts).map(([estado, count]) => ({
    estado,
    count,
    color: coloresEstado[estado] || '#636e72',
    label: estado.replace(/_/g, ' ')
  }))
})

function seleccionarDia(dia) {
  diaSeleccionado.value = dia.fecha
  if (dia.citas.length > 0) {
    showModal.value = true
  }
}

function cerrarModal() {
  showModal.value = false
}

function abrirCita(cita) {
  showModal.value = false
  emit('seleccionar-cita', cita)
}

function mesAnterior() {
  if (mesActual.value === 0) {
    mesActual.value = 11
    anio.value--
  } else {
    mesActual.value--
  }
  diaSeleccionado.value = null
}

function mesSiguiente() {
  if (mesActual.value === 11) {
    mesActual.value = 0
    anio.value++
  } else {
    mesActual.value++
  }
  diaSeleccionado.value = null
}

function irHoy() {
  mesActual.value = hoy.getMonth()
  anio.value = hoy.getFullYear()
  diaSeleccionado.value = formatoFecha(hoy)
}
</script>

<style scoped>
.calendario { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #dfe6e9; }

.cal-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.cal-header h3 { flex: 1; text-align: center; margin: 0; color: #2d3436; font-size: 1.1rem; }
.nav-btn { background: none; border: 1px solid #dfe6e9; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 1.2rem; color: #636e72; }
.nav-btn:hover { background: #f0f2f5; }
.btn-hoy { background: #0984e3; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }

.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
.weekday { text-align: center; font-size: 0.75rem; font-weight: 600; color: #636e72; padding: 0.5rem 0; }

.cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-day {
  min-height: 60px; padding: 4px; border-radius: 6px; cursor: pointer; transition: all 0.1s;
  border: 2px solid transparent;
}
.cal-day:hover { background: #f0f2f5; }
.cal-day.other-month { opacity: 0.3; }
.cal-day.today { background: #e8f4fd; border-color: #0984e3; }
.cal-day.selected { background: #0984e3; color: white; }
.cal-day.selected .day-num { color: white; }
.cal-day.has-citas { background: #f8f9fa; }

.day-num { font-size: 0.85rem; font-weight: 500; display: block; margin-bottom: 2px; }
.cal-day.today .day-num { color: #0984e3; font-weight: 700; }

.day-badge {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 1px 5px; border-radius: 10px; font-size: 0.65rem; color: white; font-weight: 600;
}
.badge-icon { font-size: 0.6rem; }
.badge-count { line-height: 1; }

/* Modal Fullscreen */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.modal-fullscreen {
  background: white; border-radius: 16px; width: 100%; height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;
}
.modal-title { display: flex; align-items: center; gap: 1rem; }
.modal-title h2 { margin: 0; font-size: 1.2rem; color: #2d3436; }
.modal-count { background: #0984e3; color: white; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #636e72; width: 40px; height: 40px; border-radius: 50%; }
.modal-close:hover { background: #e0e0e0; }

.modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }

.status-summary { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.status-chip {
  display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem;
  border: 1px solid; border-radius: 20px; font-size: 0.85rem; font-weight: 500;
}
.chip-count { font-weight: 700; font-size: 1rem; }
.chip-label { text-transform: capitalize; font-size: 0.8rem; }

.appointments-table { border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; }
.table-header {
  display: grid; grid-template-columns: 70px 1fr 1fr 120px 100px 40px;
  gap: 0.75rem; padding: 0.75rem 1rem; background: #f8f9fa; font-weight: 600;
  font-size: 0.8rem; color: #636e72; text-transform: uppercase; letter-spacing: 0.3px;
}
.table-row {
  display: grid; grid-template-columns: 70px 1fr 1fr 120px 100px 40px;
  gap: 0.75rem; padding: 0.8rem 1rem; border-top: 1px solid #f0f0f0;
  cursor: pointer; transition: background 0.1s; align-items: center;
}
.table-row:hover { background: #f0f7ff; }
.col-hora { font-weight: 600; color: #2d3436; font-size: 0.9rem; }
.col-paciente strong { color: #2d3436; }
.col-medico { color: #636e72; font-size: 0.9rem; }
.col-telefono { color: #636e72; font-size: 0.85rem; }
.col-estado { text-align: center; }
.col-acciones { color: #0984e3; font-weight: 600; text-align: center; }

.estado-badge { padding: 0.2rem 0.5rem; border-radius: 10px; color: white; font-size: 0.7rem; font-weight: 600; text-transform: capitalize; }

.cal-legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f0f2f5; }
.legend-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #636e72; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }

@media (max-width: 768px) {
  .modal-fullscreen { height: 95vh; border-radius: 0; }
  .table-header, .table-row { grid-template-columns: 60px 1fr 100px 40px; }
  .col-medico, .col-telefono { display: none; }
  .cal-day { min-height: 50px; }
}
</style>
