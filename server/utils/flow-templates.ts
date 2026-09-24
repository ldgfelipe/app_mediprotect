function nodo(id: string, type: string, config: any = {}, position: any): any {
  return { id, type, config, position: position || { x: 0, y: 0 }, label: '' }
}

function borde(id: string, source: string, target: string, label = ''): any {
  return { id, source, target, label }
}

export function plantillaCitas() {
  const nodes = [
    nodo('n_inicio', 'inicio', {}, { x: 20, y: 120 }),
    nodo('n_saludo', 'mensaje', { texto: '¡Hola! 👋 Soy el asistente virtual de *MediProtect* 🏥\nTe ayudo a agendar tu cita.' }, { x: 220, y: 40 }),
    nodo('n_especialidad', 'lista', { fuente: 'especialidades', titulo: '¿Con qué especialidad deseas tu consulta?', campo: 'especialidad' }, { x: 460, y: 40 }),
    nodo('n_doctor', 'lista', { fuente: 'doctores', parametro: 'especialidad', titulo: 'Estos son los especialistas disponibles:', campo: 'doctor_id' }, { x: 700, y: 40 }),
    nodo('n_cap_doctor', 'accion', { accion: 'capturar_doctor', texto: '' }, { x: 940, y: 40 }),
    nodo('n_fecha', 'lista', { fuente: 'fechas', parametro: 'doctor_id', titulo: '¿Qué día prefieres para tu cita?', campo: 'fecha' }, { x: 1180, y: 40 }),
    nodo('n_hora', 'lista', { fuente: 'horas', parametro: 'doctor_id', parametro2: 'fecha', titulo: '¿Qué horario prefieres para el {{fecha}}?', campo: 'hora' }, { x: 1420, y: 40 }),
    nodo('n_confirmar', 'pregunta', {
      modo: 'botones',
      titulo: '📋 *Resumen de tu cita:*\n\n👨‍⚕️ {{doctor_nombre}}\n📅 {{fecha}}\n🕐 {{hora}}\n💰 Precio preferencial: *${{precio}} MXN*\n\n¿Confirmas esta cita?',
      opciones: [
        { label: '✅ Confirmar', valor: 'confirmar' },
        { label: '❌ Cancelar', valor: 'cancelar' },
        { label: '🔄 Cambiar hora', valor: 'cambiar_hora' },
      ],
    }, { x: 1660, y: 40 }),
    nodo('n_crear', 'accion', { accion: 'crear_cita', texto: '' }, { x: 1900, y: -60 }),
    nodo('n_fin', 'fin', { texto: 'Te notificaremos cuando el médico confirme tu cita. 📲\n\n¿Hay algo más en lo que te pueda ayudar?' }, { x: 1900, y: 140 }),
    nodo('n_cancel', 'fin', { texto: 'Entendido. Tu solicitud de cita fue cancelada.\n\n¿En qué más te puedo ayudar?' }, { x: 2180, y: 140 }),
  ]

  const edges = [
    borde('e1', 'n_inicio', 'n_saludo'),
    borde('e2', 'n_saludo', 'n_especialidad'),
    borde('e3', 'n_especialidad', 'n_doctor'),
    borde('e4', 'n_doctor', 'n_cap_doctor'),
    borde('e5', 'n_cap_doctor', 'n_fecha'),
    borde('e6', 'n_fecha', 'n_hora'),
    borde('e7', 'n_hora', 'n_confirmar'),
    borde('e8', 'n_confirmar', 'n_crear', 'confirmar'),
    borde('e9', 'n_confirmar', 'n_cancel', 'cancelar'),
    borde('e10', 'n_confirmar', 'n_hora', 'cambiar_hora'),
    borde('e11', 'n_crear', 'n_fin'),
  ]

  return {
    keywords: ['cita', 'agendar', 'doctor', 'especialidad', 'solicito cita'],
    descripcion: 'Agendar cita: especialidad → médico → fecha → hora → confirmar',
    definicion: { nodes, edges },
  }
}

export function plantillaAsesor() {
  const nodes = [
    nodo('n_inicio', 'inicio', {}, { x: 20, y: 120 }),
    nodo('n_msg', 'mensaje', { texto: 'Un asesor de MediProtect te contactará en breve.\n\n⏱️ Tiempo de respuesta estimado: 15-30 minutos\n\nDeja tu mensaje aquí.' }, { x: 220, y: 120 }),
    nodo('n_fin', 'fin', { texto: 'Tu mensaje ha sido registrado. Un asesor te contactará pronto. 🙌' }, { x: 460, y: 120 }),
  ]
  const edges = [
    borde('e1', 'n_inicio', 'n_msg'),
    borde('e2', 'n_msg', 'n_fin'),
  ]
  return {
    keywords: ['asesor', 'humano', 'ayuda humana', 'contactar asesor'],
    descripcion: 'Deriva al usuario a un asesor humano',
    definicion: { nodes, edges },
  }
}