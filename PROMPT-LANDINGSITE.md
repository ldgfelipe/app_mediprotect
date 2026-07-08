# Prompt para landingsite.ia — Botón "Agendar Cita por WhatsApp"

## Contexto

MediProtect tiene dos sitios:
- **www.mediprotect.com.mx** — Landing site (público, donde landingsite.ia trabaja)
- **app.mediprotect.com.mx** — Sistema CRM (donde se gestionan citas, pacientes, doctores)

El paciente busca doctores en la landing, y cuando quiere agendar cita, debe ser redirigido al sistema CRM para completar el proceso y luego abrir WhatsApp.

---

## Flujo del usuario

```
1. Paciente busca doctor en www.mediprotect.com.mx/red-medica
2. Paciente ve tarjeta del doctor o entra al perfil del doctor
3. Paciente hace click en "Agendar Cita por WhatsApp"
4. Se abre NUEVA VENTANA → app.mediprotect.com.mx/agendar-cita?doctor={nombre-del-medico}
5. Se redirige la ventana actual → app.mediprotect.com.mx/dashboard/paciente
```

---

## Implementación del botón en TARJETA (resultados de búsqueda)

En la tarjeta del doctor que se muestra en `/red-medica`, el botón debe ser un enlace `<a>` que abra en nueva ventana:

```html
<a 
  href="https://app.mediprotect.com.mx/agendar-cita?doctor={nombre_completo_urlencoded}"
  target="_blank"
  class="btn-agendar"
>
  Agendar Cita por WhatsApp
</a>
```

### Donde `{nombre_completo_urlencoded}` es:
- El nombre completo del médico tal como aparece en la base de datos
- Codificado para URL (espacios se convierten en `+` o `%20`)
- Ejemplo: `Dr.+Erasmo+Aaron+Vega+Osorio` o `Dr.+Oscar+de+los+Santos+Garcia`

### Ejemplo completo en la tarjeta:

```html
<div class="card-medico">
  <img src="{foto_url}" alt="{nombre}" />
  <h3>{titulo} {nombre} {apellido}</h3>
  <p>{especialidad}</p>
  <p>{ciudad}</p>
  
  <!-- Botón de Agendar Cita -->
  <a 
    href="https://app.mediprotect.com.mx/agendar-cita?doctor=Dr.+Erasmo+Aaron+Vega+Osorio"
    target="_blank"
    class="btn-agendar"
  >
    Agendar Cita por WhatsApp
  </a>
</div>
```

---

## Implementación del botón en PERFIL DEL DOCTOR

En la página de perfil del médico, el botón debe:

1. Abrir WhatsApp en nueva ventana
2. Redirigir la ventana actual al dashboard del paciente

```html
<button onclick="agendarCita()" class="btn-whatsapp">
  Agendar Cita por WhatsApp
</button>

<script>
function agendarCita() {
  const doctorName = 'Dr. Erasmo Aaron Vega Osorio'; // Nombre del médico actual
  const encodedName = encodeURIComponent(doctorName);
  
  // Abrir WhatsApp en nueva ventana
  window.open(
    `https://app.mediprotect.com.mx/agendar-cita?doctor=${encodedName}`,
    '_blank'
  );
  
  // Redirigir ventana actual al dashboard
  window.location.href = 'https://app.mediprotect.com.mx/dashboard/paciente';
}
</script>
```

---

## Datos del médico que se necesitan

Para generar la URL correctamente, necesitas estos datos del médico:

| Campo | Ejemplo | Descripción |
|---|---|---|
| `titulo` | "Dr." o "Dra." | Título profesional |
| `nombre` | "Erasmo Aaron" | Nombre(s) |
| `apellido` | "Vega Osorio" | Apellido(s) |
| `whatsapp` | "522228021933" | Número de WhatsApp (opcional, el sistema CRM lo usa internamente) |

### Nombre completo para la URL:
```
{titulo} {nombre} {apellido}
```

Ejemplos:
- `Dr. Erasmo Aaron Vega Osorio`
- `Dr. Oscar de los Santos Garcia`
- `Dra. Raquel Najem Gonzalez`

---

## Formatos de URL

### Opción 1: Usar el nombre completo (RECOMENDADO)
```
https://app.mediprotect.com.mx/agendar-cita?doctor=Dr.+Erasmo+Aaron+Vega+Osorio
```

### Opción 2: Usar solo nombre y primer apellido
```
https://app.mediprotect.com.mx/agendar-cita?doctor=Erasmo+Vega
```

**Nota:** La opción 1 es preferida porque permite una búsqueda más precisa en el sistema CRM.

---

## CSS sugerido para los botones

```css
/* Botón en tarjeta */
.btn-agendar {
  display: inline-block;
  background: #25d366;
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-agendar:hover {
  background: #1da851;
}

/* Botón en perfil */
.btn-whatsapp {
  background: #25d366;
  color: white;
  border: none;
  padding: 0.9rem 2rem;
  border-radius: 8px;
  font-size: 1.05rem;
  cursor: pointer;
  font-weight: 600;
}

.btn-whatsapp:hover {
  background: #1da851;
}
```

---

## Checklist de implementación

- [ ] Botón en tarjeta de resultados de `/red-medica`
- [ ] Botón en perfil del médico
- [ ] Ambos abren en `target="_blank"` (nueva ventana)
- [ ] La URL incluye `?doctor={nombre_completo}`
- [ ] El nombre está URL-encoded (espacios como `+` o `%20`)
- [ ] CSS del botón en verde WhatsApp (#25d366)
- [ ] El ícono de WhatsApp es opcional pero recomendado

---

## Notas importantes

1. **No enviar el ID del médico** — El sistema CRM busca el médico por nombre en la base de datos
2. **El flujo de login/registro** es manejado por app.mediprotect.com.mx
3. **WhatsApp se abre después** de que el paciente se registra/inicia sesión en el sistema CRM
4. **El asistente de WhatsApp** es quien finalmente agenda la cita en el sistema
