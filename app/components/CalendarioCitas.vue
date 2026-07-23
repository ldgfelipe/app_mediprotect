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
        <div class="day-dots" v-if="dia.citas.length > 0">
          <span
            v-for="(cita, i) in dia.citas.slice(0, 4)"
            :key="i"
            class="dot"
            :style="{ background: colorEstado(cita.estado) }"
          ></span>
          <span v-if="dia.citas.length > 4" class="dot-more">+{{ dia.citas.length - 4 }}</span>
        </div>
      </div>
    </div>

    <!-- Lista de citas del día seleccionado -->
    <div v-if="diaSeleccionado && citasDelDia.length > 0" class="day-appointments">
      <div class="day-header">
        <h4>📅 Citas del {{ formatoFechaLarga(diaSeleccionado) }}</h4>
        <span class="day-count">{{ citasDelDia.length }} cita{{ citasDelDia.length > 1 ? 's' : '' }}</span>
      </div>
      <div class="appointments-list">
        <div
          v-for="cita in citasDelDia"
          :key="cita.id"
          class="appointment-row"
          @click="$emit('seleccionar-cita', cita)"
        >
          <div class="appt-time">{{ formatoHora(cita.fecha_hora) }}</div>
          <div class="appt-paciente">
            <strong>{{ cita.paciente_nombre }} {{ cita.paciente_apellido }}</strong>
            <span v-if="cita.paciente_telefono" class="appt-phone">📱 {{ cita.paciente_telefono }}</span>
          </div>
          <div class="appt-medico">
            {{ cita.medico_nombre }} {{ cita.medico_apellido }}
          </div>
          <div class="appt-estado">
            <span class="estado-badge" :style="{ background: colorEstado(cita.estado) }">{{ cita.estado }}</span>
          </div>
          <div class="appt-action">→</div>
        </div>
      </div>
    </div>

    <div v-if="diaSeleccionado && citasDelDia.length === 0" class="day-empty">
      <p>Sin citas para el {{ formatoFechaLarga(diaSeleccionado) }}</p>
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
  reagendada: '#e17055'
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
    const citaFecha = formatoFecha(new Date(c.fecha_hora))
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
    const citaFecha = formatoFecha(new Date(c.fecha_hora))
    return citaFecha === diaSeleccionado.value
  }).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
})

function seleccionarDia(dia) {
  diaSeleccionado.value = dia.fecha
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

.day-dots { display: flex; gap: 2px; flex-wrap: wrap; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-more { font-size: 0.6rem; color: #636e72; }

.day-appointments { margin-top: 1.5rem; border-top: 1px solid #f0f2f5; padding-top: 1rem; }
.day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.day-header h4 { margin: 0; color: #2d3436; font-size: 0.95rem; }
.day-count { font-size: 0.8rem; color: #636e72; background: #f0f2f5; padding: 0.2rem 0.6rem; border-radius: 10px; }

.appointments-list { display: flex; flex-direction: column; gap: 0.5rem; }
.appointment-row {
  display: grid; grid-template-columns: 70px 1fr 1fr auto 30px; gap: 0.75rem; align-items: center;
  background: #f8f9fa; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.15s;
}
.appointment-row:hover { background: #e8f4fd; }
.appt-time { font-weight: 600; color: #2d3436; font-size: 0.9rem; }
.appt-paciente strong { display: block; font-size: 0.9rem; color: #2d3436; }
.appt-phone { font-size: 0.75rem; color: #636e72; }
.appt-medico { font-size: 0.85rem; color: #636e72; }
.estado-badge { padding: 0.2rem 0.5rem; border-radius: 10px; color: white; font-size: 0.7rem; font-weight: 600; text-transform: capitalize; }
.appt-action { color: #0984e3; font-size: 1.1rem; }

.day-empty { text-align: center; padding: 2rem; color: #636e72; margin-top: 1rem; border-top: 1px solid #f0f2f5; }
.day-empty p { margin: 0; }

.cal-legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f0f2f5; }
.legend-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #636e72; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }

@media (max-width: 768px) {
  .appointment-row { grid-template-columns: 60px 1fr auto; }
  .appt-medico, .appt-action { display: none; }
  .cal-day { min-height: 50px; }
}
</style>
