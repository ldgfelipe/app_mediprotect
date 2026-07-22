import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

// Doctors from CSV with profile data
const csvDoctors = [
  { nombre: 'Linda Edith', apellido: 'Flores Rodríguez', cedula: '8579941', especialidad: 'Medicina Física y Rehabilitación', slug: 'perfil-linda-edith-flores-rodriguez', bio: 'Médico Cirujano UPAEP. Especialista en Medicina Física y Rehabilitación. Enfoque integral en recuperación funcional: ortopédicas fracturas/ligamentos/columna neurológicas EVC/lesiones medulares/neuropatías reumatológicas artritis/lupus/fibromialgia y trastornos de piso pélvico.', universidad: 'UPAEP', servicios: 'Rehabilitación ortopédica | Rehabilitación neurológica | Terapia física y ocupacional | Manejo del dolor crónico | Rehabilitación de piso pélvico | Valoración y certificados de discapacidad' },
  { nombre: 'Oscar de los', apellido: 'Santos García', cedula: '9781846', especialidad: 'Cardiología', slug: 'perfil-dr-oscar-de-los-santos', bio: 'Cardiólogo certificado Universidad La Salle CDMX. Evaluaciones cardiológicas completas ECG/ecocardiogramas/pruebas de esfuerzo. Manejo de hipertensión arritmias insuficiencia cardíaca y cardiopatía isquémica.', universidad: 'Universidad La Salle CDMX', servicios: 'Electrocardiograma | Ecocardiograma | Prueba de esfuerzo | Monitoreo Holter | Manejo de hipertensión arterial | Valoración preoperatoria cardiológica' },
  { nombre: 'Daniel Dietter', apellido: 'Ezquerra Mendizabal', cedula: '10705999', especialidad: 'Cirugía Maxilofacial', slug: 'daniel-dietter-ezquerra-mendizabal', bio: 'Egresado del IPN Licenciatura en Odontología. Dedicado a cirugía maxilofacial y medicina bucofacial.', universidad: 'IPN', servicios: 'Cirugía maxilofacial | Medicina bucofacial | Extracciones quirúrgicas | Implantes dentales | Cirugía ortognática' },
  { nombre: 'Esmeralda', apellido: 'Alonso Guerrero', cedula: '7241548', especialidad: 'Medicina General', slug: 'perfil-esmeralda-alonso-guerrero', bio: 'Médico Cirujano BUAP. Medicina general con trato humanista y cercano.', universidad: 'BUAP', servicios: 'Consulta de medicina general | Chequeos preventivos | Atención de infecciones comunes | Curaciones y suturas | Certificados de salud' },
  { nombre: 'Miguel Ángel', apellido: 'Rojas Santiago', cedula: '11272805 / 13355589', especialidad: 'Nefrología', slug: 'perfil-miguel-angel-rojas-santiago', bio: 'Médico Cirujano BUAP y Nefrólogo UNAM. Visión integral de salud renal.', universidad: 'UNAM', servicios: 'Enfermedad renal crónica | Hipertensión arterial | Lesión renal aguda | Litiasis renal | Hemodiálisis y diálisis peritoneal' },
  { nombre: 'Yesica', apellido: 'Robles Herrera', cedula: '09312906 / 12938866', especialidad: 'Nefrología', slug: 'perfil-yesica-robles-herrera', bio: 'Médico Cirujano BUAP y Nefróloga UPAEP. Detección temprana de alteraciones renales.', universidad: 'UPAEP', servicios: 'Enfermedad renal crónica | Hipertensión arterial | Alteraciones hidroelectrolíticas | Litiasis renal | Nefroprevención' },
  { nombre: 'María del Pilar', apellido: 'Osorio Bretón', cedula: '0946313 / 0029158', especialidad: 'Nefrología', slug: 'perfil-maria-del-pilar-osorio-breton', bio: 'Médica Cirujano BUAP. Especialista en Nefrología IMSS-UNAM desde 1989. Research Fellowship en UCLA. 30+ años de experiencia.', universidad: 'BUAP', servicios: 'Nefroprevención consciente | Nefrología de Alta Complejidad | Segundas Opiniones | Enfermedad renal crónica' },
  { nombre: 'Alfonso', apellido: 'Rodríguez Ojeda', cedula: '10265613 / 14051736', especialidad: 'Nefrología', slug: 'perfil-alfonso-rodriguez-ojeda', bio: 'Médico Cirujano BUAP y Nefrólogo UNAM.', universidad: 'BUAP', servicios: 'Enfermedad renal crónica | Hipertensión arterial | Hemodiálisis | Trasplante renal' },
  { nombre: 'Michelle Patricia', apellido: 'Loeza Uribe', cedula: '10974202 / 12939958', especialidad: 'Medicina Interna', slug: 'perfil-michelle-patricia-loeza-uribe', bio: 'Médico Cirujano UPAEP y especialista en Medicina Interna UNAM.', universidad: 'UPAEP', servicios: 'Enfermedades autoinmunes sistémicas | Artritis reumatoide | Lupus eritematoso sistémico' },
  { nombre: 'Héctor Manuel', apellido: 'Herrera Martínez', cedula: '10248096', especialidad: 'Medicina General', slug: 'perfil-hector-manuel-herrera-martinez', bio: 'Médico Cirujano BUAP con alta especialidad en trastornos funcionales y de motilidad digestiva.', universidad: 'BUAP', servicios: 'Trastornos Funcionales Digestivos | Motilidad Digestiva | Reflujo Gastroesofágico | Consulta General Digestiva' },
  { nombre: 'Fernando', apellido: 'Morales Sánchez', cedula: '16018048', especialidad: 'Medicina General', slug: 'perfil-fernando-morales-sanchez', bio: 'Médico Cirujano BUAP. Atención médica general de calidad.', universidad: 'BUAP', servicios: '' },
  { nombre: 'Erasmo Aaron', apellido: 'Vega Osorio', cedula: '9327924', especialidad: 'Medicina General', slug: 'perfil-erasmo-aaron-vega-osorio', bio: 'Médico Cirujano UAEH.', universidad: 'UAEH', servicios: 'Consulta médica general | Valoración clínica integral | Chequeos preventivos' },
  { nombre: 'Mario', apellido: 'Vargas Rodríguez', cedula: '1010637', especialidad: 'Medicina General', slug: 'perfil-mario-vargas-rodriguez', bio: 'Médico Cirujano UAEM.', universidad: 'UAEM', servicios: 'Consulta médica general | Valoración clínica integral | Chequeos preventivos' },
  { nombre: 'Andrés', apellido: 'Ramírez Sánchez', cedula: '14839882', especialidad: 'Medicina General', slug: 'perfil-andres-ramirez-sanchez', bio: 'Médico Cirujano BUAP.', universidad: 'BUAP', servicios: 'Consulta médica general | Valoración clínica integral | Chequeos preventivos' },
  { nombre: 'Oscar Genaro', apellido: 'Olmos García', cedula: '96221354', especialidad: 'Cirugía General', slug: 'red-medica/oscar-genaro-olmos-garcia', bio: 'Cirujano general certificado con especialización en cirugía laparoscópica.', universidad: 'BUAP', servicios: 'Colecistectomía laparoscópica | Hernioplastía | Apendicectomía | Cirugía de pared abdominal' },
  { nombre: 'Pedro', apellido: 'Díaz García', cedula: '12517026', especialidad: 'Cardiología', slug: 'perfil-dr-pedro-diaz-garcia', bio: 'Cardiólogo certificado Universidad Autónoma de México.', universidad: 'Universidad Autónoma de México', servicios: 'Electrocardiograma | Ecocardiograma | Prueba de esfuerzo | Monitoreo Holter' },
  { nombre: 'Jésica', apellido: 'González Martínez', cedula: '11140564 / 15111290', especialidad: 'Neumología', slug: 'perfil-jesica-gonzalez-martinez', bio: 'Médico Cirujano BUAP y Neumóloga Universidad de Guadalajara.', universidad: 'BUAP', servicios: 'Asma y alergias respiratorias | EPOC | Infecciones pulmonares | Secuelas post-COVID' },
  { nombre: 'Sergio', apellido: 'Navarro León', cedula: 'PENDIENTE', especialidad: 'Cirugía General', slug: 'red-medica/sergio-navarro-leon', bio: 'Cirujano general con amplia experiencia.', universidad: '', servicios: 'Cirugía abdominal general | Hernioplastía | Colecistectomía | Apendicectomía' },
  // Directory only (no profile)
  { nombre: 'Milena', apellido: 'Contreras Rueda', cedula: 'PENDIENTE', especialidad: 'Reumatología', slug: null, bio: null },
  { nombre: 'Germán', apellido: 'Soria del Valle', cedula: 'PENDIENTE', especialidad: 'Reumatología', slug: null, bio: null },
  { nombre: 'Natalia', apellido: 'del Río Ponce', cedula: 'PENDIENTE', especialidad: 'Reumatología', slug: null, bio: null },
  { nombre: 'Ricardo', apellido: 'Márquez Gil', cedula: 'PENDIENTE', especialidad: 'Nefrología', slug: null, bio: null },
  { nombre: 'Patricia', apellido: 'Vega Luna', cedula: 'PENDIENTE', especialidad: 'Nefrología', slug: null, bio: null },
  { nombre: 'Fernando', apellido: 'Dávalos Peña', cedula: 'PENDIENTE', especialidad: 'Nefrología', slug: null, bio: null },
  { nombre: 'Ernesto', apellido: 'Salgado Ruiz', cedula: 'PENDIENTE', especialidad: 'Neumología', slug: null, bio: null },
  { nombre: 'Marisol', apellido: 'Ordaz Tapia', cedula: 'PENDIENTE', especialidad: 'Neumología', slug: null, bio: null },
  { nombre: 'Adrián', apellido: 'Meneses Hoyos', cedula: 'PENDIENTE', especialidad: 'Neumología', slug: null, bio: null },
]

function normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

async function main() {
  console.log('=== ANÁLISIS CSV vs BASE DE DATOS ===\n')

  // Get all active doctors
  const dbResult = await pool.query(`
    SELECT m.id, m.nombre, m.apellido, m.titulo, m.cedula_profesional, m.cedula_especialidad,
           m.bio, m.foto_url, m.slug, m.universidad, m.frase_inspiradora,
           m.precio_regular, m.precio_miembro, m.horario_atencion, m.idiomas,
           e.nombre as especialidad_nombre
    FROM medicos m LEFT JOIN especialidades e ON m.id_especialidad = e.id
    WHERE m.activo = true ORDER BY m.nombre, m.apellido
  `)
  const dbDoctors = dbResult.rows

  // Get all specialties
  const espResult = await pool.query('SELECT id, nombre, slug FROM especialidades')
  const especialidades = espResult.rows

  console.log(`Total médicos en DB: ${dbDoctors.length}`)
  console.log(`Total médicos en CSV: ${csvDoctors.length}`)
  console.log(`Total especialidades: ${especialidades.length}\n`)

  // Check which specialties exist
  console.log('=== ESPECIALIDADES EN DB ===')
  especialidades.forEach(e => console.log(`  ${e.nombre} (${e.slug})`))

  // Find CSV doctors in DB
  console.log('\n=== MÉDICOS DEL CSV - ESTADO EN DB ===\n')
  
  const found = []
  const notFound = []
  const missingData = []

  for (const csv of csvDoctors) {
    const match = dbDoctors.find(db => 
      normalizeStr(db.nombre) === normalizeStr(csv.nombre) &&
      normalizeStr(db.apellido) === normalizeStr(csv.apellido)
    ) || dbDoctors.find(db => 
      normalizeStr(db.nombre).includes(normalizeStr(csv.nombre.split(' ')[0])) &&
      normalizeStr(db.apellido).includes(normalizeStr(csv.apellido.split(' ')[0]))
    )

    if (match) {
      found.push({ csv, db: match })
      
      // Check missing fields
      const gaps = []
      if (!match.bio && csv.bio) gaps.push('bio')
      if (!match.slug && csv.slug) gaps.push('slug')
      if (!match.universidad && csv.universidad) gaps.push('universidad')
      if (!match.horario_atencion) gaps.push('horario_atencion')
      if (!match.frase_inspiradora) gaps.push('frase_inspiradora')
      if (!match.idiomas || match.idiomas.length === 0) gaps.push('idiomas')
      if (!match.precio_regular) gaps.push('precio_regular')
      if (!match.precio_miembro) gaps.push('precio_miembro')
      
      if (gaps.length > 0) {
        missingData.push({ csv, db: match, gaps })
      }
    } else {
      notFound.push(csv)
    }
  }

  console.log(`Encontrados en DB: ${found.length}`)
  console.log(`NO encontrados en DB: ${notFound.length}`)
  console.log(`Con datos faltantes: ${missingData.length}\n`)

  if (notFound.length > 0) {
    console.log('--- MÉDICOS QUE FALTAN EN DB ---')
    notFound.forEach(m => {
      console.log(`  ❌ ${m.nombre} ${m.apellido} - ${m.especialidad} - Cédula: ${m.cedula}`)
    })
  }

  if (missingData.length > 0) {
    console.log('\n--- DATOS FALTANTES POR MÉDICO ---')
    missingData.forEach(({ csv, db, gaps }) => {
      console.log(`  ⚠️  ${db.nombre} ${db.apellido} (${db.especialidad_nombre})`)
      console.log(`     Faltan: ${gaps.join(', ')}`)
      console.log(`     DB slug: ${db.slug || 'NULL'} | CSV slug: ${csv.slug || 'N/A'}`)
      console.log(`     DB cédula: ${db.cedula_profesional || 'NULL'} | CSV cédula: ${csv.cedula}`)
    })
  }

  // Check for duplicates
  console.log('\n=== DUPLICADOS EN DB ===')
  const byCedula = {}
  const byNombre = {}
  for (const db of dbDoctors) {
    if (db.cedula_profesional) {
      const key = normalizeStr(db.cedula_profesional)
      if (!byCedula[key]) byCedula[key] = []
      byCedula[key].push(db)
    }
    const nameKey = normalizeStr(db.nombre + ' ' + db.apellido)
    if (!byNombre[nameKey]) byNombre[nameKey] = []
    byNombre[nameKey].push(db)
  }

  let dupCount = 0
  for (const [key, docs] of Object.entries(byNombre)) {
    if (docs.length > 1) {
      dupCount++
      console.log(`  🔁 ${docs[0].nombre} ${docs[0].apellido} (${docs.length} entradas)`)
      docs.forEach(d => {
        console.log(`     - ID: ${d.id} | slug: ${d.slug || 'NULL'} | cédula: ${d.cedula_profesional || 'NULL'} | bio: ${d.bio ? 'SÍ' : 'NULL'}`)
      })
    }
  }
  console.log(`\nTotal grupos duplicados: ${dupCount}`)

  // Summary of what needs to be done
  console.log('\n=== RESUMEN DE ACCIONES NECESARIAS ===')
  console.log(`1. Insertar ${notFound.length} médicos nuevos que están en CSV pero no en DB`)
  console.log(`2. Actualizar datos faltantes en ${missingData.length} médicos existentes`)
  console.log(`3. Limpiar ${dupCount} grupos de duplicados`)
  console.log(`4. Generar slugs para médicos con slug NULL (necesario para perfiles)`)
  console.log(`5. Verificar/crear especialidades: ${[...new Set(notFound.map(m => m.especialidad))].join(', ')}`)

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
