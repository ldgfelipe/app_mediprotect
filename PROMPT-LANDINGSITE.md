# Prompt para landingsite.ia — Botón "Agendar Cita por WhatsApp"

## Contexto

MediProtect tiene dos sitios:
- **www.mediprotect.com.mx** — Landing site (público, donde landingsite.ia trabaja)
- **app.mediprotect.com.mx** — Sistema CRM (donde se gestionan citas)

El paciente busca doctores en la landing, y cuando quiere agendar cita, se le redirige al sistema CRM donde hace login/registro y se abre WhatsApp automáticamente con los datos del médico y del paciente.

---

## Flujo del usuario

```
1. Paciente busca doctor en www.mediprotect.com.mx/red-medica
2. Paciente hace click en "Agendar Cita por WhatsApp" (tarjeta o perfil)
3. Se abre NUEVA VENTANA → app.mediprotect.com.mx/agendar-cita?doctor={nombre_del_medico}
4. Si NO está logeado → form de login/registro
5. Al hacer login/registro → se abre WhatsApp en nueva ventana con el mensaje
6. Se redirige al dashboard del paciente
```

---

## Implementación del botón en TARJETA (resultados de búsqueda)

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
- Título + nombre(s) + apellido(s) del médico
- Espacios reemplazados por `+`
- Ejemplo: `Dr.+Erasmo+Aaron+Vega+Osorio`

### Ejemplo completo:

```html
<div class="card-medico">
  <img src="{foto_url}" alt="{nombre}" />
  <h3>Dr. Erasmo Aaron Vega Osorio</h3>
  <p>Médico Cirujano</p>
  <p>Puebla, Puebla</p>
  
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

```html
<a 
  href="https://app.mediprotect.com.mx/agendar-cita?doctor={nombre_completo_urlencoded}"
  target="_blank"
  class="btn-whatsapp"
>
  Agendar Cita por WhatsApp
</a>
```

---

## Mensaje que se envía por WhatsApp

Cuando el paciente hace login, se envía automáticamente este mensaje:

```
Hola, quiero una cita con el médico Dr. Erasmo Aaron Vega Osorio.

Mi nombre es: Juan Pérez
Mi ID de usuario es: abc-123-def
```

Este mensaje llega al WhatsApp de MediProtect (522228021933) y el asistente comienza a trabajar en la cita.

---

## Datos del médico para la URL

| Campo | Ejemplo |
|---|---|
| `titulo` | "Dr." o "Dra." |
| `nombre` | "Erasmo Aaron" |
| `apellido` | "Vega Osorio" |
| **URL completa** | `Dr.+Erasmo+Aaron+Vega+Osorio` |

---

## CSS sugerido

```css
/* Botón en tarjeta y perfil */
.btn-agendar, .btn-whatsapp {
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

.btn-agendar:hover, .btn-whatsapp:hover {
  background: #1da851;
}
```

---

## Checklist de implementación

- [ ] Botón en tarjeta de resultados de `/red-medica`
- [ ] Botón en perfil del médico
- [ ] Ambos abren en `target="_blank"` (nueva ventana)
- [ ] La URL incluye `?doctor={nombre_completo}`
- [ ] El nombre está URL-encoded (espacios como `+`)
- [ ] CSS del botón en verde WhatsApp (#25d366)

---

## Notas importantes

1. **No enviar el ID del médico** — El sistema CRM busca el médico por nombre
2. **El login/registro** es manejado por app.mediprotect.com.mx
3. **WhatsApp se abre automáticamente** después del login/registro
4. **El asistente** recibe el mensaje y comienza a gestionar la cita
5. **El número de WhatsApp** es el de MediProtect: 522228021933
