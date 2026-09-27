import {
  getAvailableSpecialties,
  getDoctorsBySpecialty,
  getAvailableDates,
  getAvailableHours,
  createCitaFromWhatsApp,
  searchPatientByPhone,
  searchPatientById,
  searchDoctorBySlug,
  searchDoctorByName,
  getDiasDisponiblesParaMedico,
  getHorasDisponiblesParaMedico
} from './whatsapp-db'

interface Conversacion {
  id: string
  telefono: string
  nombre_paciente: string | null
  id_paciente: string | null
  estado: string
  datos_temp: any
}

interface Respuesta {
  texto: string
  nuevoEstado: string
  datosTemp: any
  lista?: { titulo_seccion: string; opciones: { id: string; titulo: string; descripcion?: string }[] }
  botones?: { id: string; titulo: string }[]
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatFecha(fechaStr: string): string {
  const d = new Date(fechaStr + 'T12:00:00')
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function formatHora(hora: string): string {
  const [h, m] = hora.split(':')
  const hour = parseInt(h)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${suffix}`
}

export function parsearSolicitudCita(texto: string) {
  const result: any = {
    esSolicitudDirecta: false,
    nombre: null,
    doctor: null,
    email: null,
    telefono: null,
    pacienteId: null,
  }

  const textoLower = texto.toLowerCase()
  if (!textoLower.includes('solicito') && !textoLower.includes('cita') && !textoLower.includes('agendar')) {
    return result
  }

  result.esSolicitudDirecta = true

  // Nombre: "soy Ana Martinez Diaz" / "me llamo Juan Perez"
  const nombreMatch = texto.match(/(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i)
  if (nombreMatch) result.nombre = nombreMatch[1].trim()

  // Doctor: "médico Raul Payan Nadue" / "doctor Raul Payan" / "dr Raul" / "dra Ana"
  // Acepta mayúsculas, espacios, guiones, acentos
  const doctorMatch = texto.match(/(?:médico?|doctor?|dr\.?|dra\.?)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)+)/i)
  if (doctorMatch) result.doctor = doctorMatch[1].trim()

  // Email
  const emailMatch = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  if (emailMatch) result.email = emailMatch[0]

  // Teléfono: "Teléfono: 2224445566" o "tel: 2224445566" o solo 10 dígitos
  const phoneMatch = texto.match(/(?:teléfono|telefono|tel|cel|phone)[:\s]*(\d{10})/i) || texto.match(/\b(\d{10})\b/)
  if (phoneMatch) result.telefono = phoneMatch[1]

  // ID: "ID: ff142735-ee46-4e7d-8ed8-2e529a16d9f7" (con o sin espacios)
  const idMatch = texto.match(/ID[:\s]*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (idMatch) result.pacienteId = idMatch[1].trim()

  if (result.nombre || result.pacienteId || result.doctor) {
    console.log('[DEBUG parsearSolicitudCita RESULT]', result)
    return result
  }

  result.esSolicitudDirecta = false
  return result
}

export function detectarSaludo(texto: string): string | null {
  const textoLower = texto.toLowerCase().trim()
  const saludos = ['hola', 'hello', 'holi', 'que tal', 'que pasa']

  for (const saludo of saludos) {
    if (textoLower === saludo || textoLower.startsWith(saludo + ' ') || textoLower.startsWith(saludo + '\n')) {
      return saludo
    }
  }
  return null
}

export async function processMessage(conv: Conversacion, texto: string, nombre: string, pool: any): Promise<Respuesta | null> {
  // Primero, detectar saludos simples
  const saludo = detectarSaludo(texto)
  if (saludo) {
    const hoy = new Date()
    const diaSemana = DIAS_SEMANA[hoy.getDay()]
    const respuestaTexto = `¡Hola! 👋\n\n${nombre ? nombre + ' ' : ''}¿Cómo estás el ${diaSemana}?`
    
    return {
      texto: respuestaTexto,
      nuevoEstado: conv.estado || 'bienvenida',
      datosTemp: { ...conv.datos_temp }
    }
  }

  const state = conv.estado
  const data = conv.datos_temp || {}

  switch (state) {

    case 'bienvenida': {
      const nombrePaciente = conv.nombre_paciente || nombre || ''
      const saludo = nombrePaciente ? `¡Hola ${nombrePaciente}! 👋` : '¡Hola! 👋'

      return {
        texto: `${saludo}\n\nSoy el asistente virtual de *MediProtect* 🏥\n¿Qué necesitas hoy?`,
        nuevoEstado: 'menu_principal',
        datosTemp: { ...data },
        botones: [
          { id: 'menu_agendar', titulo: 'Agendar cita' },
          { id: 'menu_info', titulo: 'Información' },
          { id: 'menu_asesor', titulo: 'Hablar con asesor' },
        ]
      }
    }

    case 'menu_principal': {
      if (texto === 'menu_agendar') {
        const especialidades = await getAvailableSpecialties(pool)
        if (especialidades.length === 0) {
          return {
            texto: 'No hay especialidades disponibles en este momento. Por favor, intenta más tarde o habla con un asesor.',
            nuevoEstado: 'bienvenida',
            datosTemp: {}
          }
        }

        return {
          texto: '¿Con qué especialidad deseas tu consulta?',
          nuevoEstado: 'seleccionando_especialidad',
          datosTemp: { ...data },
          lista: {
            titulo_seccion: 'Especialidades',
            opciones: especialidades.map((e, i) => ({
              id: `esp_${i}_${e.toLowerCase().replace(/\s+/g, '_')}`,
              titulo: e,
            }))
          }
        }
      }

      if (texto === 'menu_info') {
        return {
          texto: 'MediProtect te ofrece acceso a especialistas con precios preferenciales.\n\n• Afiliación gratuita\n• Descuentos del 10% o más\n• Gestión completa de citas\n• Confirmación doble de asistencia\n\n¿Deseas agendar una cita?',
          nuevoEstado: 'menu_principal',
          datosTemp: { ...data },
          botones: [
            { id: 'menu_agendar', titulo: 'Agendar cita' },
            { id: 'menu_asesor', titulo: 'Hablar con asesor' },
          ]
        }
      }

      if (texto === 'menu_asesor') {
        return {
          texto: 'Un asesor de MediProtect te contactará en breve.\n\n⏱️ Tiempo de respuesta estimado: 15-30 minutos\n\n¿Qué consulta necesitas? Déjanos un mensaje breve.',
          nuevoEstado: 'esperando_asesor',
          datosTemp: { ...data }
        }
      }

      return {
        texto: 'No entendí tu selección. Por favor, elige una opción:',
        nuevoEstado: 'menu_principal',
        datosTemp: { ...data },
        botones: [
          { id: 'menu_agendar', titulo: 'Agendar cita' },
          { id: 'menu_info', titulo: 'Información' },
          { id: 'menu_asesor', titulo: 'Hablar con asesor' },
        ]
      }
    }

    case 'seleccionando_especialidad': {
      if (texto.startsWith('esp_')) {
        const partes = texto.split('_')
        const especialidad = partes.slice(2).join(' ')

        const doctores = await getDoctorsBySpecialty(pool, especialidad)

        if (doctores.length === 0) {
          return {
            texto: `No hay doctores disponibles para *${especialidad}* en este momento.`,
            nuevoEstado: 'bienvenida',
            datosTemp: {}
          }
        }

        return {
          texto: `Estos son los especialistas en *${especialidad}*:`,
          nuevoEstado: 'seleccionando_doctor',
          datosTemp: { ...data, especialidad },
          lista: {
            titulo_seccion: 'Médicos',
            opciones: doctores.map((d, i) => ({
              id: `doc_${i}_${d.id}`,
              titulo: `Dr. ${d.nombre} ${d.apellido}`,
              descripcion: `$${d.precio_regular || 'N/A'} MXN`,
            }))
          }
        }
      }

      return {
        texto: 'Por favor, selecciona una especialidad de la lista.',
        nuevoEstado: 'seleccionando_especialidad',
        datosTemp: { ...data }
      }
    }

    case 'seleccionando_doctor': {
      if (texto.startsWith('doc_')) {
        const partes = texto.split('_')
        const doctorId = partes.slice(2).join('_')

        const doctores = await getDoctorsBySpecialty(pool, data.especialidad)
        const doctor = doctores.find((d: any) => d.id === doctorId)

        if (!doctor) {
          return {
            texto: 'Doctor no encontrado. Intenta de nuevo.',
            nuevoEstado: 'bienvenida',
            datosTemp: {}
          }
        }

        const fechas = await getAvailableDates(pool, doctorId)

        if (fechas.length === 0) {
          return {
            texto: `El Dr. ${doctor.nombre} ${doctor.apellido} no tiene disponibilidad en los próximos 14 días.\n\n¿Deseas elegir otro médico?`,
            nuevoEstado: 'bienvenida',
            datosTemp: {},
            botones: [
              { id: 'menu_agendar', titulo: 'Elegir otro médico' },
              { id: 'menu_asesor', titulo: 'Hablar con asesor' },
            ]
          }
        }

        return {
          texto: `Fechas disponibles para *Dr. ${doctor.nombre} ${doctor.apellido}*:`,
          nuevoEstado: 'seleccionando_fecha',
          datosTemp: { ...data, doctorId, doctorNombre: `${doctor.nombre} ${doctor.apellido}`, precioRegular: doctor.precio_regular },
          lista: {
            titulo_seccion: 'Fechas',
            opciones: fechas.map((f: any, i) => ({
              id: `fecha_${i}_${f}`,
              titulo: formatFecha(f),
              descripcion: f,
            }))
          }
        }
      }

      return {
        texto: 'Por favor, selecciona un doctor de la lista.',
        nuevoEstado: 'seleccionando_doctor',
        datosTemp: { ...data }
      }
    }

    case 'seleccionando_fecha': {
      if (texto.startsWith('fecha_')) {
        const partes = texto.split('_')
        const fecha = partes.slice(2).join('_')

        const horas = await getAvailableHours(pool, data.doctorId, fecha)

        if (horas.length === 0) {
          return {
            texto: `No hay horas disponibles para el ${formatFecha(fecha)}.\n\n¿Deseas elegir otra fecha?`,
            nuevoEstado: 'seleccionando_fecha',
            datosTemp: { ...data }
          }
        }

        return {
          texto: `Horas disponibles para el *${formatFecha(fecha)}*:`,
          nuevoEstado: 'seleccionando_hora',
          datosTemp: { ...data, fechaSeleccionada: fecha },
          lista: {
            titulo_seccion: 'Horarios',
            opciones: horas.map((h: string, i) => ({
              id: `hora_${i}_${h}`,
              titulo: formatHora(h),
              descripcion: h,
            }))
          }
        }
      }

      return {
        texto: 'Por favor, selecciona una fecha de la lista.',
        nuevoEstado: 'seleccionando_fecha',
        datosTemp: { ...data }
      }
    }

    case 'seleccionando_hora': {
      if (texto.startsWith('hora_')) {
        const partes = texto.split('_')
        const hora = partes.slice(2).join('_')

        const descuento = 10
        const precioConDescuento = (data.precioRegular || 1000) * (1 - descuento / 100)

        return {
          texto: `📋 *Resumen de tu cita:*\n\n👨‍⚕️ *Dr. ${data.doctorNombre}*\n📅 ${formatFecha(data.fechaSeleccionada)}\n🕐 ${formatHora(hora)}\n💰 Precio preferencial: *$${precioConDescuento} MXN*\n\n¿Confirmas esta cita?`,
          nuevoEstado: 'confirmacion_paciente',
          datosTemp: { ...data, horaSeleccionada: hora, precioConDescuento },
          botones: [
            { id: 'confirmar_cita', titulo: '✅ Confirmar' },
            { id: 'cancelar_cita', titulo: '❌ Cancelar' },
            { id: 'cambiar_hora', titulo: '🔄 Cambiar hora' },
          ]
        }
      }

      return {
        texto: 'Por favor, selecciona una hora de la lista.',
        nuevoEstado: 'seleccionando_hora',
        datosTemp: { ...data }
      }
    }

    case 'confirmacion_paciente': {
      if (texto === 'confirmar_cita') {
        const paciente = await searchPatientByPhone(pool, conv.telefono)

        try {
          const cita = await createCitaFromWhatsApp(
            pool,
            data.doctorId,
            paciente?.id || null,
            data.fechaSeleccionada,
            data.horaSeleccionada,
            conv.telefono,
            conv.nombre_paciente || nombre || 'Paciente WhatsApp',
            'pendiente'
          )

          const nombrePaciente = conv.nombre_paciente || nombre || 'Paciente'

          return {
            texto: `✅ *¡Cita agendada!*\n\n📌 Folio: *${cita.folio}*\n👨‍⚕️ Dr. ${data.doctorNombre}\n📅 ${formatFecha(data.fechaSeleccionada)}\n🕐 ${formatHora(data.horaSeleccionada)}\n💰 $${data.precioConDescuento} MXN\n\nTe notificaremos cuando el médico confirme tu cita.\n\n*Instrucciones:*\n• Llegar 10 min antes\n• Traer identificación oficial\n• Presentar este folio en recepción`,
            nuevoEstado: 'cita_creada',
            datosTemp: { ...data, citaId: cita.id, folio: cita.folio }
          }
        } catch (err: any) {
          console.error('[WhatsApp Flow] Error creando cita:', err)
          return {
            texto: 'Hubo un error al crear tu cita. Por favor, intenta de nuevo o habla con un asesor.',
            nuevoEstado: 'bienvenida',
            datosTemp: {}
          }
        }
      }

      if (texto === 'cancelar_cita') {
        return {
          texto: 'Entendido. Tu cita no fue agendada.\n\n¿En qué más te puedo ayudar?',
          nuevoEstado: 'menu_principal',
          datosTemp: {},
          botones: [
            { id: 'menu_agendar', titulo: 'Agendar cita' },
            { id: 'menu_asesor', titulo: 'Hablar con asesor' },
          ]
        }
      }

      if (texto === 'cambiar_hora') {
        const horas = await getAvailableHours(pool, data.doctorId, data.fechaSeleccionada)

        return {
          texto: 'Selecciona una nueva hora:',
          nuevoEstado: 'seleccionando_hora',
          datosTemp: { ...data },
          lista: {
            titulo_seccion: 'Horarios',
            opciones: horas.map((h: string, i) => ({
              id: `hora_${i}_${h}`,
              titulo: formatHora(h),
              descripcion: h,
            }))
          }
        }
      }

      return {
        texto: 'Por favor, confirma o cancela la cita:',
        nuevoEstado: 'confirmacion_paciente',
        datosTemp: { ...data },
        botones: [
          { id: 'confirmar_cita', titulo: '✅ Confirmar' },
          { id: 'cancelar_cita', titulo: '❌ Cancelar' },
        ]
      }
    }

    case 'cita_creada': {
      return {
        texto: 'Tu cita ya fue registrada. ¿Hay algo más en lo que te pueda ayudar?',
        nuevoEstado: 'menu_principal',
        datosTemp: {},
        botones: [
          { id: 'menu_agendar', titulo: 'Agendar otra cita' },
          { id: 'menu_asesor', titulo: 'Hablar con asesor' },
        ]
      }
    }

    case 'esperando_asesor': {
      return {
        texto: 'Tu mensaje ha sido registrado. Un asesor te contactará pronto.\n\n¿Necesitas algo más?',
        nuevoEstado: 'menu_principal',
        datosTemp: {},
        botones: [
          { id: 'menu_agendar', titulo: 'Agendar cita' },
          { id: 'menu_asesor', titulo: 'Hablar con asesor' },
        ]
      }
    }

    case 'solicitando_id_paciente': {
      const idTrimmed = texto.trim()
      const pacienteIdRes = await searchPatientById(pool, idTrimmed)

      if (!pacienteIdRes) {
        return {
          texto: 'No encontré un paciente con ese ID. ¿Podrías verificarlo?\n\nSi no tienes ID, escribe "menu" para volver al inicio.',
          nuevoEstado: 'solicitando_id_paciente',
          datosTemp: { ...data }
        }
      }

      const doctorFromData = data.doctor
      if (!doctorFromData) {
        return {
          texto: `Perfecto, encontré tu registro, ${pacienteIdRes.nombre} ${pacienteIdRes.apellido}.\n\nNecesito que me indiques qué médico deseas.`,
          nuevoEstado: 'solicitando_doctor',
          datosTemp: { ...data, pacienteId: pacienteIdRes.id, pacienteEmail: pacienteIdRes.email, nombrePaciente: `${pacienteIdRes.nombre} ${pacienteIdRes.apellido}` }
        }
      }

      const precioConDesc = (doctorFromData.precio_regular || 1000) * (1 - (doctorFromData.porcentaje_descuento || 10) / 100)
      const diasPac = await getDiasDisponiblesParaMedico(pool, doctorFromData.id)

      if (diasPac.length === 0) {
        return {
          texto: `El Dr. ${doctorFromData.nombre} ${doctorFromData.apellido} no tiene disponibilidad en los próximos días.\n\n¿Deseas consultar con otro médico?`,
          nuevoEstado: 'solicitando_doctor',
          datosTemp: { ...data },
        }
      }

      return {
        texto: `¡Hola ${pacienteIdRes.nombre} ${pacienteIdRes.apellido}! 👋\n\nEncontré tu registro y al *Dr. ${doctorFromData.nombre} ${doctorFromData.apellido}*.\n\n📋 *Precio preferencial: $${precioConDesc} MXN*\n\n¿Qué día prefieres para tu cita?`,
        nuevoEstado: 'seleccionando_dia_preferencia',
        datosTemp: {
          ...data,
          nombrePaciente: `${pacienteIdRes.nombre} ${pacienteIdRes.apellido}`,
          doctorId: doctorFromData.id,
          doctorNombre: `${doctorFromData.nombre} ${doctorFromData.apellido}`,
          precioRegular: doctorFromData.precio_regular,
          precioConDescuento: precioConDesc,
          pacienteId: pacienteIdRes.id,
          pacienteEmail: pacienteIdRes.email,
        },
        lista: {
          titulo_seccion: 'Días disponibles',
          opciones: diasPac,
        }
      }
    }

    case 'solicitando_doctor': {
      const doctorBuscado = await searchDoctorBySlug(pool, texto.trim()) || await searchDoctorByName(pool, texto.trim())

      if (!doctorBuscado) {
        return {
          texto: `No encontré al médico "${texto}". ¿Podrías verificar el nombre?`,
          nuevoEstado: 'solicitando_doctor',
          datosTemp: { ...data }
        }
      }

      const precioConDesc2 = (doctorBuscado.precio_regular || 1000) * (1 - (doctorBuscado.porcentaje_descuento || 10) / 100)
      const dias2 = await getDiasDisponiblesParaMedico(pool, doctorBuscado.id)

      if (dias2.length === 0) {
        return {
          texto: `El Dr. ${doctorBuscado.nombre} ${doctorBuscado.apellido} no tiene disponibilidad en los próximos días.\n\n¿Deseas consultar con otro médico?`,
          nuevoEstado: 'solicitando_doctor',
          datosTemp: { ...data },
        }
      }

      return {
        texto: `Encontré al *Dr. ${doctorBuscado.nombre} ${doctorBuscado.apellido}* (${doctorBuscado.especialidad}).\n\n¿Qué día prefieres?`,
        nuevoEstado: 'seleccionando_dia_preferencia',
        datosTemp: {
          ...data,
          doctorId: doctorBuscado.id,
          doctorNombre: `${doctorBuscado.nombre} ${doctorBuscado.apellido}`,
          precioRegular: doctorBuscado.precio_regular,
          precioConDescuento: precioConDesc2,
        },
        lista: {
          titulo_seccion: 'Días disponibles',
          opciones: dias2,
        }
      }
    }

    case 'seleccionando_dia_preferencia': {
      if (texto.startsWith('dia_')) {
        const fecha = texto.replace('dia_', '')
        const horasDisp = await getHorasDisponiblesParaMedico(pool, data.doctorId, fecha)

        if (horasDisp.length === 0) {
          return {
            texto: `No hay horarios disponibles para el *${formatFecha(fecha)}*.\n\nSelecciona otro día:`,
            nuevoEstado: 'seleccionando_dia_preferencia',
            datosTemp: { ...data },
            lista: {
              titulo_seccion: 'Días disponibles',
              opciones: await getDiasDisponiblesParaMedico(pool, data.doctorId),
            }
          }
        }

        return {
          texto: `¿Qué horario prefieres para el *${formatFecha(fecha)}*?`,
          nuevoEstado: 'seleccionando_hora_preferencia',
          datosTemp: { ...data, fechaSeleccionada: fecha },
          lista: {
            titulo_seccion: 'Horarios disponibles',
            opciones: horasDisp,
          }
        }
      }

      return {
        texto: 'Por favor, selecciona un día de la lista.',
        nuevoEstado: 'seleccionando_dia_preferencia',
        datosTemp: { ...data },
      }
    }

    case 'seleccionando_hora_preferencia': {
      if (texto.startsWith('hora_')) {
        const hora = texto.replace('hora_', '')
        const precioDesc = data.precioConDescuento || 0
        const nombreP = data.nombrePaciente || 'Paciente'

        return {
          texto: `📋 *Resumen de tu solicitud:*\n\n👤 *Paciente:* ${nombreP}\n👨‍⚕️ *Médico:* Dr. ${data.doctorNombre}\n📅 *Fecha:* ${formatFecha(data.fechaSeleccionada)}\n🕐 *Hora:* ${formatHora(hora)}\n💰 *Precio preferencial:* $${precioDesc} MXN\n\n¿Confirmas esta cita?`,
          nuevoEstado: 'confirmacion_solicitud_directa',
          datosTemp: { ...data, horaSeleccionada: hora },
          botones: [
            { id: 'confirmar_solicitud', titulo: '✅ Confirmar' },
            { id: 'cancelar_solicitud', titulo: '❌ Cancelar' },
            { id: 'cambiar_dia', titulo: '🔄 Cambiar día' },
          ]
        }
      }

      return {
        texto: 'Por favor, selecciona una hora de la lista.',
        nuevoEstado: 'seleccionando_hora_preferencia',
        datosTemp: { ...data },
      }
    }

    case 'confirmacion_solicitud_directa': {
      if (texto === 'confirmar_solicitud') {
        try {
          const nombrePaciente = data.nombrePaciente || 'Paciente WhatsApp'
          const pacienteId = data.pacienteId || null
          const telefono = conv.telefono

          const cita = await createCitaFromWhatsApp(
            pool,
            data.doctorId,
            pacienteId,
            data.fechaSeleccionada,
            data.horaSeleccionada,
            telefono,
            nombrePaciente,
            'pendiente'
          )

          return {
            texto: `✅ *¡Cita agendada exitosamente!*\n\n📌 *Folio:* ${cita.folio}\n👨‍⚕️ *Médico:* Dr. ${data.doctorNombre}\n📅 *Fecha:* ${formatFecha(data.fechaSeleccionada)}\n🕐 *Hora:* ${formatHora(data.horaSeleccionada)}\n💰 *Precio:* $${data.precioConDescuento} MXN\n\n*Instrucciones:*\n• Llegar 10 min antes\n• Traer identificación oficial\n• Presentar este folio en recepción\n\nTe notificaremos cuando el médico confirme tu cita. 📲`,
            nuevoEstado: 'cita_creada',
            datosTemp: { ...data, citaId: cita.id, folio: cita.folio }
          }
        } catch (err: any) {
          console.error('[WhatsApp Flow] Error creando cita:', err)
          return {
            texto: 'Hubo un error al crear tu cita. Por favor, intenta de nuevo o habla con un asesor.',
            nuevoEstado: 'bienvenida',
            datosTemp: {}
          }
        }
      }

      if (texto === 'cancelar_solicitud') {
        return {
          texto: 'Tu solicitud de cita fue cancelada.\n\n¿En qué más te puedo ayudar?',
          nuevoEstado: 'menu_principal',
          datosTemp: {},
          botones: [
            { id: 'menu_agendar', titulo: 'Agendar otra cita' },
            { id: 'menu_asesor', titulo: 'Hablar con asesor' },
          ]
        }
      }

      if (texto === 'cambiar_dia') {
        const diasCamb = await getDiasDisponiblesParaMedico(pool, data.doctorId)
        return {
          texto: 'Selecciona un nuevo día:',
          nuevoEstado: 'seleccionando_dia_preferencia',
          datosTemp: { ...data },
          lista: {
            titulo_seccion: 'Días disponibles',
            opciones: diasCamb,
          }
        }
      }

      return {
        texto: 'Por favor, confirma o cancela la cita:',
        nuevoEstado: 'confirmacion_solicitud_directa',
        datosTemp: { ...data },
        botones: [
          { id: 'confirmar_solicitud', titulo: '✅ Confirmar' },
          { id: 'cancelar_solicitud', titulo: '❌ Cancelar' },
        ]
      }
    }

    default: {
      return {
        texto: 'Disculpa, no entendí. ¿Puedes repetir tu mensaje?',
        nuevoEstado: 'bienvenida',
        datosTemp: {}
      }
    }
  }
}
