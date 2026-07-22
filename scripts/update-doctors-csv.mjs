import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

function normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function makeSlug(nombre, apellido) {
  const full = `${nombre} ${apellido}`
  return full.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function parseServicios(serviciosStr) {
  if (!serviciosStr || serviciosStr === 'No especificados en perfil') return '[]'
  const items = serviciosStr.split('|').map(s => s.trim()).filter(Boolean)
  return JSON.stringify(items.map(nombre => ({ nombre })))
}

function parseIdiomas(idiomasStr) {
  if (!idiomasStr || idiomasStr === 'No disponible') return '[]'
  const items = idiomasStr.split('|').map(s => s.trim()).filter(Boolean)
  return JSON.stringify(items.map(i => {
    const match = i.match(/(.+?)\s*\((.+?)\)/)
    if (match) return { idioma: match[1].trim(), nivel: match[2].trim() }
    return { idioma: i.trim(), nivel: 'Nativo' }
  }))
}

function parseFormacion(formacionStr) {
  if (!formacionStr || formacionStr === 'Sin perfil individual disponible') return '[]'
  const items = formacionStr.split('|').map(s => s.trim()).filter(Boolean)
  return JSON.stringify(items.map(f => {
    const match = f.match(/\d+\)\s*(.+?)\s*-\s*(.+?)(?:\s*-\s*Cédula:\s*(.+))?$/)
    if (match) {
      return { titulo: match[1].trim(), universidad: match[2].trim(), cedula: match[3]?.trim() || null }
    }
    return { titulo: f, universidad: null, cedula: null }
  }))
}

// CSV data with all fields
const csvData = [
  { nombre: 'Linda Edith', apellido: 'Flores Rodríguez', cedula: '8579941', espNombre: 'Medicina de Rehabilitación', slug: 'linda-edith-flores-rodriguez', bio: 'Médico Cirujano UPAEP. Especialista en Medicina Física y Rehabilitación. Enfoque integral en recuperación funcional: ortopédicas fracturas/ligamentos/columna neurológicas EVC/lesiones medulares/neuropatías reumatológicas artritis/lupus/fibromialgia y trastornos de piso pélvico.', universidad: 'UPAEP', servicios: 'Rehabilitación ortopédica | Rehabilitación neurológica | Terapia física y ocupacional | Manejo del dolor crónico | Rehabilitación de piso pélvico | Valoración y certificados de discapacidad', idiomas: 'Español (Nativo)', formacion: '1) Médico Cirujano - UPAEP - Cédula: 8579941', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Oscar de los', apellido: 'Santos García', cedula: '9781846', espNombre: 'Cardiología', slug: 'oscar-de-los-santos-garcia', bio: 'Cardiólogo certificado Universidad La Salle CDMX. Evaluaciones cardiológicas completas ECG/ecocardiogramas/pruebas de esfuerzo. Manejo de hipertensión arritmias insuficiencia cardíaca y cardiopatía isquémica. Comunicación clara y empática.', universidad: 'Universidad La Salle CDMX', servicios: 'Electrocardiograma | Ecocardiograma | Prueba de esfuerzo | Monitoreo Holter | Manejo de hipertensión arterial | Valoración preoperatoria cardiológica', idiomas: 'Español (Nativo)', formacion: '1) Médico Cirujano - Universidad La Salle CDMX | 2) Especialidad en Cardiología - Cédula: 9781846', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Daniel Dietter', apellido: 'Ezquerra Mendizabal', cedula: '10705999', espNombre: 'Odontología', slug: 'daniel-dietter-ezquerra-mendizabal', bio: 'Egresado del IPN Licenciatura en Odontología. Dedicado a cirugía maxilofacial y medicina bucofacial. Atención integral con técnicas quirúrgicas de vanguardia y trato humano.', universidad: 'IPN', servicios: 'Cirugía maxilofacial | Medicina bucofacial | Extracciones quirúrgicas | Implantes dentales | Cirugía ortognática | Patologías orofaciales', idiomas: null, formacion: '1) Licenciatura en Odontología - IPN - Cédula: 10705999 | 2) Especialidad en Cirugía Maxilofacial', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Esmeralda', apellido: 'Alonso Guerrero', cedula: '7241548', espNombre: 'Medicina General', slug: 'esmeralda-alonso-guerrero', bio: 'Médico Cirujano BUAP. Medicina general con trato humanista y cercano. Diagnóstico clínico oportuno prevención de enfermedades y orientación personalizada para el cuidado de la salud familiar.', universidad: 'BUAP', servicios: 'Consulta de medicina general | Chequeos preventivos | Atención de infecciones comunes | Curaciones y suturas | Certificados de salud | Referencia a especialistas', idiomas: null, formacion: '1) Médico Cirujano - BUAP - Cédula: 7241548', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Miguel Ángel', apellido: 'Rojas Santiago', cedula: '11272805 / 13355589', espNombre: 'Nefrología', slug: 'miguel-angel-rojas-santiago', bio: 'Médico Cirujano BUAP y Nefrólogo UNAM. Visión integral de salud renal: ERC en todas sus fases hipertensión alteraciones hidroelectrolíticas litiasis renal lesión renal aguda y terapias de reemplazo renal.', universidad: 'BUAP', servicios: 'Enfermedad renal crónica | Hipertensión arterial | Lesión renal aguda | Alteraciones hidroelectrolíticas | Litiasis renal | Hemodiálisis y diálisis peritoneal | Seguimiento post-trasplante renal', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Nefrología - UNAM - Cédula: 13355589 | 2) Licenciatura en Médico Cirujano - BUAP - Cédula: 11272805', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Yesica', apellido: 'Robles Herrera', cedula: '09312906 / 12938866', espNombre: 'Nefrología', slug: 'yesica-robles-herrera', bio: 'Médico Cirujano BUAP y Nefróloga UPAEP. Detección temprana de alteraciones renales manejo ERC en todas sus etapas y estrategias de nefroprevención. Trato cálido y humano con rigor científico.', universidad: 'UPAEP', servicios: 'Enfermedad renal crónica | Hipertensión arterial | Alteraciones hidroelectrolíticas | Litiasis renal | Nefroprevención | Diagnóstico oportuno de enfermedades renales', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Nefrología - UPAEP - Cédula: 12938866 | 2) Licenciatura en Médico Cirujano - BUAP - Cédula: 09312906', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null, isNew: true },
  { nombre: 'María del Pilar', apellido: 'Osorio Bretón', cedula: '0946313 / 0029158', espNombre: 'Nefrología', slug: 'maria-del-pilar-osorio-breton', bio: 'Médica Cirujano BUAP. Especialista en Nefrología IMSS-UNAM desde 1989. Research Fellowship en UCLA (1991-1992). Maestría en Ciencias Médicas UNAM-IMSS. Miembro SLANH. 30+ años de experiencia.', universidad: 'BUAP', servicios: 'Nefroprevención consciente (4 niveles) | Nefrología de Alta Complejidad | Diagnóstico de Casos Difíciles | Segundas Opiniones | Enfermedad renal crónica', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Nefrología - IMSS-UNAM - Cédula: 0029158 | 2) Maestría en Ciencias Médicas - UNAM - Cédula: 3547734 | 3) Licenciatura en Médico Cirujano - BUAP - Cédula: 0946313', certificaciones: 'SLANH (Sociedad Latinoamericana de Nefrología e Hipertensión) | Diplomados en Ética Médica y manejo del estrés | 6 libros publicados', horario: 'Lunes a Viernes: 9:00 AM - 11:00 AM y 5:00 PM - 7:00 PM', precioRegular: 1500, precioMiembro: 1350 },
  { nombre: 'Alfonso', apellido: 'Rodríguez Ojeda', cedula: '10265613 / 14051736', espNombre: 'Nefrología', slug: 'alfonso-rodriguez-ojeda', bio: 'Médico Cirujano BUAP y Nefrólogo UNAM. Formación dual con perspectiva integral para enfermedades renales. Atención personalizada y humanista.', universidad: 'BUAP', servicios: 'Enfermedad renal crónica | Hipertensión arterial | Lesión renal aguda | Hemodiálisis | Diálisis peritoneal | Trasplante renal | Alteraciones hidroelectrolíticas', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Nefrología - UNAM - Cédula: 14051736 | 2) Licenciatura en Médico Cirujano - BUAP - Cédula: 10265613', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null, isNew: true },
  { nombre: 'Michelle Patricia', apellido: 'Loeza Uribe', cedula: '10974202 / 12939958', espNombre: 'Medicina Interna', slug: 'michelle-patricia-loeza-uribe', bio: 'Médico Cirujano UPAEP y especialista en Medicina Interna UNAM. Subespecialización práctica en reumatología. Referente en diagnóstico y manejo de enfermedades autoinmunes sistémicas.', universidad: 'UPAEP', servicios: 'Enfermedades autoinmunes sistémicas | Artritis reumatoide y espondiloartritis | Lupus eritematoso sistémico | Padecimientos musculoesqueléticos crónicos | Diagnóstico y manejo integral en medicina interna', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Medicina Interna - UNAM - Cédula: 12939958 | 2) Licenciatura en Médico Cirujano - UPAEP - Cédula: 10974202', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Héctor Manuel', apellido: 'Herrera Martínez', cedula: '10248096', espNombre: 'Medicina General', slug: 'hector-manuel-herrera-martinez', bio: 'Médico Cirujano BUAP con alta especialidad en trastornos funcionales y de motilidad digestiva (SII dispepsia funcional ERGE alteraciones de motilidad esofágica e intestinal).', universidad: 'BUAP', servicios: 'Trastornos Funcionales Digestivos (SII dispepsia estreñimiento crónico) | Motilidad Digestiva | Reflujo Gastroesofágico (ERGE) | Consulta General Digestiva', idiomas: null, formacion: '1) Licenciatura como Médico Cirujano - BUAP - Cédula: 10248096 | 2) Alta Especialidad en Trastornos funcionales y de motilidad digestiva', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Fernando', apellido: 'Morales Sánchez', cedula: '16018048', espNombre: 'Medicina General', slug: 'fernando-morales-sanchez', bio: 'Médico Cirujano BUAP. Atención médica general de calidad en Mediwork Centro Médico Puebla.', universidad: 'BUAP', servicios: null, idiomas: null, formacion: '1) Médico Cirujano - BUAP - Cédula: 16018048', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Erasmo Aaron', apellido: 'Vega Osorio', cedula: '9327924', espNombre: 'Medicina General', slug: 'erasmo-aaron-vega-osorio', bio: 'Médico Cirujano UAEH (Universidad Autónoma del Estado de Hidalgo). Enfoque clínico integral para diagnosticar y tratar patologías comunes de primer contacto.', universidad: 'UAEH', servicios: 'Consulta médica general | Valoración clínica integral | Diagnóstico y tratamiento de enfermedades comunes | Chequeos preventivos de rutina | Canalización a especialistas | Seguimiento de tratamientos', idiomas: 'Español (Nativo)', formacion: '1) Licenciatura en Médico Cirujano - UAEH - Cédula: 9327924', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Mario', apellido: 'Vargas Rodríguez', cedula: '1010637', espNombre: 'Medicina General', slug: 'mario-vargas-rodriguez', bio: 'Médico Cirujano UAEM (Universidad Autónoma del Estado de México). Sólida experiencia clínica en padecimientos frecuentes de medicina general.', universidad: 'UAEM', servicios: 'Consulta médica general | Valoración clínica integral | Diagnóstico y tratamiento de enfermedades comunes | Chequeos preventivos de rutina | Canalización a especialistas | Seguimiento de tratamientos', idiomas: 'Español (Nativo)', formacion: '1) Licenciatura en Médico Cirujano - UAEM - Cédula: 1010637', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Andrés', apellido: 'Ramírez Sánchez', cedula: '14839882', espNombre: 'Medicina General', slug: 'andres-ramirez-sanchez', bio: 'Médico Cirujano BUAP. Enfoque integral: no solo diagnóstico y tratamiento sino también prevención y educación en salud.', universidad: 'BUAP', servicios: 'Consulta médica general | Valoración clínica integral | Diagnóstico y tratamiento de enfermedades comunes | Chequeos preventivos de rutina | Canalización a especialistas | Seguimiento de tratamientos', idiomas: 'Español (Nativo)', formacion: '1) Médico Cirujano y Partero - BUAP - Cédula: 14839882', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Oscar Genaro', apellido: 'Olmos García', cedula: '96221354', espNombre: 'Cirugía General', slug: 'oscar-genaro-olmos-garcia', bio: 'Cirujano general certificado con especialización en cirugía laparoscópica de mínima invasión. Egresado BUAP.', universidad: 'BUAP', servicios: 'Colecistectomía laparoscópica (vesícula) | Hernioplastía (hernias inguinales umbilicales) | Apendicectomía laparoscópica | Cirugía de pared abdominal | Biopsias y resección de tumores | Valoración prequirúrgica integral', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Cirugía General - BUAP | 2) Subespecialidad en Cirugía Laparoscópica - BUAP | 3) Médico Cirujano y Partero - BUAP - Cédula: 96221354', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Pedro', apellido: 'Díaz García', cedula: '12517026', espNombre: 'Cardiología', slug: 'pedro-diaz-garcia', bio: 'Cardiólogo certificado Universidad Autónoma de México. Evaluaciones cardiológicas completas ECG/ecocardiogramas/pruebas de esfuerzo.', universidad: 'Universidad Autónoma de México', servicios: 'Electrocardiograma | Ecocardiograma | Prueba de esfuerzo | Monitoreo Holter | Manejo de hipertensión arterial | Valoración preoperatoria cardiológica', idiomas: 'Español (Nativo)', formacion: '1) Médico Cirujano - Universidad Autónoma de México | 2) Especialidad en Cardiología - Cédula: 12517026', certificaciones: null, horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  { nombre: 'Jésica', apellido: 'González Martínez', cedula: '11140564 / 15111290', espNombre: 'Neumología', slug: 'jesica-gonzalez-martinez', bio: 'Médico Cirujano BUAP y Neumóloga Universidad de Guadalajara. Abordaje completo de enfermedades respiratorias: asma EPOC alergias respiratorias infecciones pulmonares neumonías secuelas post-COVID.', universidad: 'BUAP', servicios: 'Asma y alergias respiratorias | EPOC | Infecciones pulmonares y neumonías | Secuelas respiratorias post-COVID | Trastornos respiratorios del sueño | Pruebas de función pulmonar | Tabaquismo y cesación tabáquica', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Neumología - UDG - Cédula: 15111290 | 2) Licenciatura en Médico Cirujano - BUAP - Cédula: 11140564', certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Sergio', apellido: 'Navarro León', cedula: null, espNombre: 'Cirugía General', slug: 'sergio-navarro-leon', bio: 'Cirujano general con amplia experiencia en patologías quirúrgicas de urgencia y electivas. Enfoque integral priorizando seguridad del paciente.', universidad: null, servicios: 'Cirugía abdominal general | Hernioplastía | Colecistectomía | Apendicectomía | Manejo de heridas complejas | Valoración prequirúrgica', idiomas: 'Español (Nativo)', formacion: '1) Especialidad en Cirugía General - Información próximamente', certificaciones: 'Información próximamente', horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM | Sábados: 9:00 AM - 1:00 PM', precioRegular: null, precioMiembro: null },
  // Directory only - no profile data
  { nombre: 'Milena', apellido: 'Contreras Rueda', cedula: null, espNombre: 'Reumatología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Germán', apellido: 'Soria del Valle', cedula: null, espNombre: 'Reumatología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Natalia', apellido: 'del Río Ponce', cedula: null, espNombre: 'Reumatología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Ricardo', apellido: 'Márquez Gil', cedula: null, espNombre: 'Nefrología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Patricia', apellido: 'Vega Luna', cedula: null, espNombre: 'Nefrología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Fernando', apellido: 'Dávalos Peña', cedula: null, espNombre: 'Nefrología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Ernesto', apellido: 'Salgado Ruiz', cedula: null, espNombre: 'Neumología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
  { nombre: 'Adrián', apellido: 'Meneses Hoyos', cedula: null, espNombre: 'Neumología', slug: null, bio: null, universidad: null, servicios: null, idiomas: null, formacion: null, certificaciones: null, horario: null, precioRegular: null, precioMiembro: null },
]

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // === PASO 1: Limpiar duplicados ===
    console.log('=== PASO 1: Limpiando duplicados ===')
    const dupResult = await client.query(`
      DELETE FROM medicos 
      WHERE slug IS NULL 
        AND cedula_profesional IS NULL 
        AND activo = true
        AND id IN (
          SELECT m2.id FROM medicos m2
          INNER JOIN medicos m1 ON LOWER(m1.nombre || ' ' || m1.apellido) = LOWER(m2.nombre || ' ' || m2.apellido)
          WHERE m1.slug IS NOT NULL AND m2.slug IS NULL AND m1.id != m2.id
        )
      RETURNING id, nombre, apellido
    `)
    console.log(`  Eliminados: ${dupResult.rowCount} registros basura`)

    // Also delete the broken "Raul Payan" with bad slug
    const brokenSlug = await client.query(`DELETE FROM medicos WHERE slug = '-aul--ayan' RETURNING id, nombre, apellido`)
    if (brokenSlug.rowCount > 0) console.log(`  Eliminados: ${brokenSlug.rowCount} registros con slug roto`)

    // === PASO 2: Agregar columna certificaciones ===
    console.log('\n=== PASO 2: Agregando columna certificaciones ===')
    await client.query('ALTER TABLE medicos ADD COLUMN IF NOT EXISTS certificaciones TEXT')
    console.log('  Columna certificaciones agregada/verificada')

    // === PASO 3: Buscar especialidades ===
    console.log('\n=== PASO 3: Buscando IDs de especialidades ===')
    const espResult = await client.query('SELECT id, nombre FROM especialidades')
    const espMap = {}
    for (const e of espResult.rows) espMap[normalizeStr(e.nombre)] = e.id
    console.log(`  ${espResult.rows.length} especialidades cargadas`)

    // === PASO 4: Actualizar e insertar médicos ===
    console.log('\n=== PASO 4: Actualizando médicos del CSV ===')
    
    let actualizados = 0, insertados = 0, sinCambio = 0, errores = 0

    for (const csv of csvData) {
      const espId = espMap[normalizeStr(csv.espNombre)]
      if (!espId) {
        console.log(`  ❌ ${csv.nombre} ${csv.apellido}: especialidad "${csv.espNombre}" no encontrada`)
        errores++
        continue
      }

      // Find existing doctor
      const existing = await client.query(
        `SELECT id, nombre, apellido, bio, slug, universidad, horario_atencion, 
                frase_inspiradora, idiomas, precio_regular, precio_miembro, servicios,
                cedula_profesional, consultorio_direccion
         FROM medicos 
         WHERE LOWER(nombre) = LOWER($1) 
           AND LOWER(apellido) = LOWER($2)
           AND activo = true
         LIMIT 1`,
        [csv.nombre, csv.apellido]
      )

      if (existing.rows.length > 0) {
        // UPDATE existing
        const doc = existing.rows[0]
        const updates = []
        const values = []
        let idx = 1

        if (csv.bio && !doc.bio) { updates.push(`bio = $${idx++}`); values.push(csv.bio) }
        if (csv.slug && !doc.slug) { updates.push(`slug = $${idx++}`); values.push(csv.slug) }
        if (csv.universidad && !doc.universidad) { updates.push(`universidad = $${idx++}`); values.push(csv.universidad) }
        if (csv.horario && !doc.horario_atencion) { updates.push(`horario_atencion = $${idx++}`); values.push(csv.horario) }
        if (csv.certificaciones) { updates.push(`certificaciones = $${idx++}`); values.push(csv.certificaciones) }
        
        if (csv.precioRegular) { updates.push(`precio_regular = $${idx++}`); values.push(csv.precioRegular) }
        if (csv.precioMiembro) { updates.push(`precio_miembro = $${idx++}`); values.push(csv.precioMiembro) }

        const servicios = parseServicios(csv.servicios)
        if (servicios !== '[]' && (!doc.servicios || JSON.stringify(doc.servicios) === '[]')) {
          updates.push(`servicios = $${idx++}::jsonb`)
          values.push(servicios)
        }

        const idiomas = parseIdiomas(csv.idiomas)
        if (idiomas !== '[]' && (!doc.idiomas || doc.idiomas.length === 0)) {
          updates.push(`idiomas = $${idx++}::jsonb`)
          values.push(idiomas)
        }

        const formacion = parseFormacion(csv.formacion)
        if (formacion !== '[]') {
          updates.push(`formacion_academica = $${idx++}::jsonb`)
          values.push(formacion)
        }

        if (updates.length > 0) {
          values.push(doc.id)
          await client.query(`UPDATE medicos SET ${updates.join(', ')} WHERE id = $${idx}`, values)
          console.log(`  ✏️  ${csv.nombre} ${csv.apellido}: ${updates.length} campos actualizados`)
          actualizados++
        } else {
          sinCambio++
        }
      } else {
        // INSERT new - ensure unique slug
        let slug = csv.slug || makeSlug(csv.nombre, csv.apellido)
        const slugCheck = await client.query('SELECT id FROM medicos WHERE slug = $1', [slug])
        if (slugCheck.rows.length > 0) {
          slug = slug + '-' + Date.now().toString(36)
        }
        const servicios = parseServicios(csv.servicios)
        const idiomas = parseIdiomas(csv.idiomas)
        const formacion = parseFormacion(csv.formacion)

        await client.query(
          `INSERT INTO medicos (nombre, apellido, titulo, cedula_profesional, id_especialidad, 
           bio, slug, universidad, frase_inspiradora, horario_atencion, idiomas, 
           formacion_academica, servicios, certificaciones, precio_regular, precio_miembro,
           whatsapp, consultorio_direccion, consultorio_ciudad, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16, $17, $18, $19, true)`,
          [
            csv.nombre, csv.apellido,
            csv.nombre.includes('Dra') || csv.nombre.includes('Linda') ? 'Dra.' : 'Dr.',
            csv.cedula, espId, csv.bio, slug, csv.universidad,
            null, // frase_inspiradora
            csv.horario, idiomas, formacion, servicios,
            csv.certificaciones, csv.precioRegular, csv.precioMiembro,
            '522228021933', 'Mediwork Centro Médico', 'Puebla'
          ]
        )
        console.log(`  + ${csv.nombre} ${csv.apellido} → ${csv.espNombre} (nuevo)`)
        insertados++
      }
    }

    // === PASO 5: Generar slugs faltantes ===
    console.log('\n=== PASO 5: Generando slugs faltantes ===')
    const slugResult = await client.query(`
      SELECT id, nombre, apellido FROM medicos 
      WHERE slug IS NULL AND activo = true
    `)
    for (const doc of slugResult.rows) {
      let slug = makeSlug(doc.nombre, doc.apellido)
      // Check uniqueness
      const slugCheck = await client.query('SELECT id FROM medicos WHERE slug = $1 AND id != $2', [slug, doc.id])
      if (slugCheck.rows.length > 0) {
        slug = slug + '-' + Date.now().toString(36)
      }
      await client.query('UPDATE medicos SET slug = $1 WHERE id = $2', [slug, doc.id])
      console.log(`  🔗 ${doc.nombre} ${doc.apellido} → ${slug}`)
    }
    console.log(`  ${slugResult.rowCount} slugs generados`)

    await client.query('COMMIT')

    // === RESUMEN FINAL ===
    console.log('\n=== RESUMEN FINAL ===')
    console.log(`Duplicados eliminados: ${dupResult.rowCount + brokenSlug.rowCount}`)
    console.log(`Médicos actualizados: ${actualizados}`)
    console.log(`Médicos insertados: ${insertados}`)
    console.log(`Sin cambios necesarios: ${sinCambio}`)
    console.log(`Errores: ${errores}`)
    console.log(`Slugs generados: ${slugResult.rowCount}`)

    const total = await pool.query('SELECT COUNT(*) as t FROM medicos WHERE activo = true')
    console.log(`\nTotal médicos en DB: ${total.rows[0].t}`)

  } catch (e) {
    await client.query('ROLLBACK')
    console.error('ERROR:', e.message)
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
