/**
 * "Tareas de hoy": panel de trabajo accionable para admin/asistente.
 *
 * Reúne pendientes reales de la base de datos y, para cada uno, sugiere
 * la SIGUIENTE ACCIÓN (técnica tomada del CRM de MediProtect).
 *
 * Cada consulta está aislada: si una falla (p. ej. una columna ausente),
 * se ignora ese grupo y el panel sigue funcionando.
 */

function fmt(rows: any[], mapper: (r: any) => any): any[] {
  return rows.map(mapper)
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)

  const safe = async (sql: string, params: any[] = []): Promise<any[]> => {
    try {
      const r = await pool.query(sql, params)
      return r.rows || []
    } catch (e: any) {
      console.error('[tareas-hoy] consulta omitida:', e?.message)
      return []
    }
  }

  const [
    citasCoordinar,
    citasHoy,
    pagosPendientes,
    medicosConvenio,
    medicosPerfil,
    pacientesSinTel,
    importConErrores,
  ] = await Promise.all([
    safe(`
      SELECT c.id, c.estado, c.created_at,
             COALESCE(c.whatsapp_nombre, CONCAT_WS(' ', p.nombre, p.apellido)) AS paciente,
             COALESCE(c.whatsapp_medico_nombre, CONCAT_WS(' ', m.nombre, m.apellido)) AS medico
      FROM citas c
      LEFT JOIN pacientes p ON c.id_paciente = p.id
      LEFT JOIN medicos m ON c.id_medico = m.id
      WHERE c.estado IN ('pendiente', 'PENDIENTE_DE_COORDINACION', 'por_confirmar')
      ORDER BY c.created_at ASC
      LIMIT 50
    `),

    safe(`
      SELECT c.id, c.fecha_hora, c.estado,
             COALESCE(c.whatsapp_nombre, CONCAT_WS(' ', p.nombre, p.apellido)) AS paciente,
             COALESCE(p.telefono, c.whatsapp_telefono) AS telefono,
             COALESCE(c.whatsapp_medico_nombre, CONCAT_WS(' ', m.nombre, m.apellido)) AS medico
      FROM citas c
      LEFT JOIN pacientes p ON c.id_paciente = p.id
      LEFT JOIN medicos m ON c.id_medico = m.id
      WHERE c.fecha_hora IS NOT NULL
        AND c.fecha_hora::date = CURRENT_DATE
        AND c.estado <> 'cancelada'
      ORDER BY c.fecha_hora ASC
      LIMIT 50
    `),

    safe(`
      SELECT g.id, g.monto, g.moneda, g.estatus, g.created_at,
             CONCAT_WS(' ', p.nombre, p.apellido) AS paciente
      FROM pagos g
      LEFT JOIN pacientes p ON g.id_paciente = p.id
      WHERE g.estatus = 'pendiente'
      ORDER BY g.created_at DESC
      LIMIT 50
    `),

    safe(`
      SELECT id, nombre, apellido, email, telefono
      FROM medicos
      WHERE COALESCE(convenio_firmado, false) = false
        AND COALESCE(activo, true) = true
      ORDER BY created_at ASC
      LIMIT 50
    `),

    safe(`
      SELECT id, nombre, apellido, email, telefono, foto_url, id_especialidad
      FROM medicos
      WHERE COALESCE(activo, true) = true
        AND (
          foto_url IS NULL OR foto_url = ''
          OR telefono IS NULL OR telefono = ''
          OR id_especialidad IS NULL
        )
      ORDER BY created_at ASC
      LIMIT 50
    `),

    safe(`
      SELECT id, nombre, apellido, email, created_at
      FROM pacientes
      WHERE COALESCE(activo, true) = true
        AND (telefono IS NULL OR telefono = '')
      ORDER BY created_at DESC
      LIMIT 50
    `),

    safe(`
      SELECT id, archivo, total, insertados, actualizados, errores, creado_en
      FROM medicos_import_batches
      WHERE errores > 0 AND creado_en > NOW() - INTERVAL '7 days'
      ORDER BY creado_en DESC
      LIMIT 10
    `),
  ])

  const nombreM = (r: any) => `Dr(a). ${[r.nombre, r.apellido].filter(Boolean).join(' ')}`.trim()

  const grupos: any[] = []

  // 1. Citas por coordinar
  if (citasCoordinar.length) {
    grupos.push({
      id: 'citas_coordinar',
      titulo: 'Citas por coordinar',
      descripcion: 'Solicitudes sin fecha y hora confirmada.',
      siguiente_accion: 'Confirmar fecha y hora con el paciente',
      icono: '📅',
      prioridad: 'alta',
      link: '/admin/citas',
      total: citasCoordinar.length,
      items: fmt(citasCoordinar, (r: any) => ({
        id: r.id,
        titulo: r.paciente || 'Paciente sin nombre',
        detalle: r.medico ? `con ${r.medico}` : 'médico no especificado',
        accion: 'Coordinar cita',
        link: '/admin/citas',
      })),
    })
  }

  // 2. Citas de hoy
  if (citasHoy.length) {
    grupos.push({
      id: 'citas_hoy',
      titulo: 'Citas de hoy',
      descripcion: 'Agenda del día; conviene recordar la cita al paciente.',
      siguiente_accion: 'Enviar recordatorio por WhatsApp',
      icono: '⏰',
      prioridad: 'alta',
      link: '/admin/citas',
      total: citasHoy.length,
      items: fmt(citasHoy, (r: any) => ({
        id: r.id,
        titulo: `${r.paciente || 'Paciente'} — ${new Date(r.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
        detalle: r.medico ? `con ${r.medico}` : '',
        accion: 'Recordar cita',
        link: '/admin/citas',
      })),
    })
  }

  // 3. Pagos pendientes
  if (pagosPendientes.length) {
    grupos.push({
      id: 'pagos_pendientes',
      titulo: 'Pagos pendientes',
      descripcion: 'Pagos sin completar.',
      siguiente_accion: 'Verificar o registrar el pago',
      icono: '💳',
      prioridad: 'media',
      link: '/admin/pagos',
      total: pagosPendientes.length,
      items: fmt(pagosPendientes, (r: any) => ({
        id: r.id,
        titulo: `${r.paciente || 'Paciente'} — $${Number(r.monto || 0).toLocaleString('es-MX')} ${r.moneda || 'MXN'}`,
        detalle: `registrado ${new Date(r.created_at).toLocaleDateString('es-MX')}`,
        accion: 'Ver pago',
        link: '/admin/pagos',
      })),
    })
  }

  // 4. Médicos sin convenio firmado
  if (medicosConvenio.length) {
    grupos.push({
      id: 'medicos_convenio',
      titulo: 'Convenios sin firmar',
      descripcion: 'Médicos activos sin convenio firmado.',
      siguiente_accion: 'Enviar convenio y dar seguimiento',
      icono: '📝',
      prioridad: 'media',
      link: '/admin/medicos',
      total: medicosConvenio.length,
      items: fmt(medicosConvenio, (r: any) => ({
        id: r.id,
        titulo: nombreM(r),
        detalle: r.email || r.telefono || '',
        accion: 'Firmar convenio',
        link: '/admin/medicos',
      })),
    })
  }

  // 5. Médicos con perfil incompleto
  if (medicosPerfil.length) {
    grupos.push({
      id: 'medicos_perfil',
      titulo: 'Perfiles por completar',
      descripcion: 'Médicos sin foto, teléfono o especialidad.',
      siguiente_accion: 'Completar datos del perfil',
      icono: '🧑‍⚕️',
      prioridad: 'baja',
      link: '/admin/medicos',
      total: medicosPerfil.length,
      items: fmt(medicosPerfil, (r: any) => {
        const faltan: string[] = []
        if (!r.foto_url) faltan.push('foto')
        if (!r.telefono) faltan.push('teléfono')
        if (!r.id_especialidad) faltan.push('especialidad')
        return {
          id: r.id,
          titulo: nombreM(r),
          detalle: `Falta: ${faltan.join(', ')}`,
          accion: 'Completar perfil',
          link: '/admin/medicos',
        }
      }),
    })
  }

  // 6. Pacientes sin teléfono
  if (pacientesSinTel.length) {
    grupos.push({
      id: 'pacientes_sin_telefono',
      titulo: 'Pacientes sin teléfono',
      descripcion: 'Sin teléfono no se les puede contactar por WhatsApp.',
      siguiente_accion: 'Pedir teléfono al paciente',
      icono: '📱',
      prioridad: 'baja',
      link: '/admin/pacientes',
      total: pacientesSinTel.length,
      items: fmt(pacientesSinTel, (r: any) => ({
        id: r.id,
        titulo: [r.nombre, r.apellido].filter(Boolean).join(' '),
        detalle: r.email || '',
        accion: 'Pedir teléfono',
        link: '/admin/pacientes',
      })),
    })
  }

  // 7. Importaciones recientes con errores
  if (importConErrores.length) {
    grupos.push({
      id: 'import_errores',
      titulo: 'Importaciones con errores',
      descripcion: 'Archivos importados en los últimos 7 días con filas rechazadas.',
      siguiente_accion: 'Revisar y corregir las filas con error',
      icono: '⚠️',
      prioridad: 'media',
      link: '/admin/medicos',
      total: importConErrores.reduce((a: number, r: any) => a + (r.errores || 0), 0),
      items: fmt(importConErrores, (r: any) => ({
        id: r.id,
        titulo: r.archivo || 'Archivo importado',
        detalle: `${r.errores} con error de ${r.total} · ${new Date(r.creado_en).toLocaleDateString('es-MX')}`,
        accion: 'Revisar importación',
        link: '/admin/medicos',
      })),
    })
  }

  const orden: Record<string, number> = { alta: 0, media: 1, baja: 2 }
  grupos.sort((a, b) => (orden[a.prioridad] ?? 9) - (orden[b.prioridad] ?? 9))

  const resumen = {
    total: grupos.reduce((a, g) => a + g.total, 0),
    alta: grupos.filter(g => g.prioridad === 'alta').length,
    media: grupos.filter(g => g.prioridad === 'media').length,
    baja: grupos.filter(g => g.prioridad === 'baja').length,
    grupos: grupos.length,
  }

  return { resumen, grupos, generado_en: new Date().toISOString() }
})
