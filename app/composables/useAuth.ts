export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const tipoUsuario = computed(() => {
    if (!user.value) return null
    return (user.value as any)?.user_metadata?.tipo || null
  })

  const esPaciente = computed(() => tipoUsuario.value === 'paciente')
  const esMedico = computed(() => tipoUsuario.value === 'medico')

  const registroPaciente = async (datos: any) => {
    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: { tipo: 'paciente', nombre: datos.nombre, apellido: datos.apellido },
      },
    })
    if (error) throw error

    const { error: dbError } = await supabase.from('pacientes').insert({
      id: data.user!.id,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      telefono: datos.telefono || null,
      fecha_nacimiento: datos.fecha_nacimiento || null,
      genero: datos.genero || null,
      direccion: datos.direccion || null,
    })
    if (dbError) throw dbError

    return data
  }

  const registroMedico = async (datos: any) => {
    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: { tipo: 'medico', nombre: datos.nombre, apellido: datos.apellido },
      },
    })
    if (error) throw error

    const { error: dbError } = await supabase.from('medicos').insert({
      id: data.user!.id,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      telefono: datos.telefono || null,
      cedula_profesional: datos.cedula_profesional || null,
      id_especialidad: datos.id_especialidad || null,
      consultorio_direccion: datos.consultorio_direccion || null,
      consultorio_ciudad: datos.consultorio_ciudad || null,
      consultorio_estado: datos.consultorio_estado || null,
      bio: datos.bio || null,
    })
    if (dbError) throw dbError

    return data
  }

  return { user, tipoUsuario, esPaciente, esMedico, registroPaciente, registroMedico }
}
