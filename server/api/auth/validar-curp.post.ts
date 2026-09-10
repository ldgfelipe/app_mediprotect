export default defineEventHandler(async (event) => {
  const b = await readBody(event)
  const { curp } = b

  if (!curp || curp.length !== 18) {
    return { valido: false, mensaje: 'La CURP debe tener 18 caracteres' }
  }

  const curpUpper = curp.toUpperCase()
  const regex = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[BCDHJLMNPQRSTVWXYZ]{3}[A-Z0-9]\d$/
  if (!regex.test(curpUpper)) {
    return { valido: false, mensaje: 'El formato de CURP no es válido' }
  }

  const pool = useDbPool()

  const existing = await pool.query('SELECT id FROM pacientes WHERE curp = $1', [curpUpper])
  if (existing.rows.length > 0) {
    return { valido: false, existe: true, mensaje: 'Esta CURP ya está registrada en el sistema' }
  }

  const anioNacimiento = parseInt(curpUpper.substring(4, 6))
  const mesNacimiento = parseInt(curpUpper.substring(6, 8))
  const diaNacimiento = parseInt(curpUpper.substring(8, 10))
  const siglo = curpUpper.charAt(16) >= 'A' ? 20 : 19
  const anioCompleto = siglo * 100 + anioNacimiento
  const fechaNacimiento = `${anioCompleto}-${String(mesNacimiento).padStart(2, '0')}-${String(diaNacimiento).padStart(2, '0')}`

  const genero = curpUpper.charAt(10) === 'H' ? 'masculino' : 'femenino'

  const estados: Record<string, string> = {
    'AG': 'Aguascalientes', 'BC': 'Baja California', 'BS': 'Baja California Sur',
    'CC': 'Campeche', 'CL': 'Coahuila', 'CM': 'Colima', 'CS': 'Chiapas',
    'CH': 'Chihuahua', 'DF': 'Ciudad de México', 'DG': 'Durango',
    'GT': 'Guanajuato', 'GR': 'Guerrero', 'HG': 'Hidalgo', 'JC': 'Jalisco',
    'MC': 'Estado de México', 'MN': 'Michoacán', 'MS': 'Morelos',
    'NT': 'Nayarit', 'NL': 'Nuevo León', 'OC': 'Oaxaca', 'PL': 'Puebla',
    'QT': 'Quintana Roo', 'SP': 'San Luis Potosí', 'SL': 'Sinaloa',
    'SR': 'Sonora', 'TC': 'Tabasco', 'TS': 'Tamaulipas', 'TL': 'Tlaxcala',
    'VZ': 'Veracruz', 'YN': 'Yucatán', 'ZS': 'Zacatecas'
  }

  const estadoClave = curpUpper.substring(11, 13)
  const nacionalidad = 'Mexicana'

  return {
    valido: true,
    nombre: '',
    apellido: '',
    fecha_nacimiento: fechaNacimiento,
    genero,
    nacionalidad,
    estado: estados[estadoClave] || estadoClave,
    rfc: curpUpper.substring(0, 10) + curpUpper.substring(15, 18)
  }
})
