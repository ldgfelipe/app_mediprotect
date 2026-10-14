const HEADERS = [
  'NOMBRE(S)',
  'APELLIDO PATERNO',
  'APELLIDO MATERNO',
  'CEDULA PROFESIONAL',
  'ESPECIALIDAD',
  'TELEFONO WHATSAPP (10 DIGITOS)',
  'CORREO',
  'CIUDAD',
  'DIRECCION CONSULTORIO',
  'HOSPITAL O CONSULTORIO',
  'COMISION POR CITA (MXN)',
  'CONVENIO FIRMADO',
  'FECHA FIRMA CONVENIO',
  'FECHA AFILIACION',
  'RFC',
  'CURP',
  'CODIGO POSTAL',
  'COLONIA',
  'ESTADO',
  'USUARIO',
  'NOTAS',
]

const EJEMPLO = [
  'Juan',
  'Perez',
  'Lopez',
  '1234567',
  'Medicina General',
  '2221234567',
  'juan.perez@ejemplo.com',
  'Puebla',
  'Av. Juarez 123, Col. Centro',
  'Hospital Angeles',
  '350',
  'SI',
  '2024-01-15',
  '2024-01-20',
  'PELJ800101ABC',
  'PELJ800101HPLRPN01',
  '72000',
  'Centro',
  'Puebla',
  'juan.perez',
  'Medico de ejemplo',
]

function csvCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)

  const rows = [HEADERS, EJEMPLO]
  const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="plantilla-medicos.csv"')
  return csv
})
