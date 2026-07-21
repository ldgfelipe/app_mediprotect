# Documento Técnico para LandingSite.ai
## Integración API MediProtect → Frontend mediprotect.com.mx

---

## 1. RESUMEN

El CRM de MediProtect (`app.mediprotect.com.mx`) tiene una API que contiene toda la información de médicos y especialidades. El frontend actual de `www.mediprotect.com.mx` renderiza esta información de forma estática. El objetivo es que LandingSite consuma la API para que los datos se actualicen automáticamente cuando se agreguen o modifiquen médicos en el CRM.

---

## 2. ENDPOINTS DISPONIBLES

### 2.1 Categorías/Especialidades
```
GET https://app.mediprotect.com.mx/api/directorio-medico/categorias
```

**Respuesta:**
```json
{
  "categorias": [
    {
      "id": 1,
      "nombre": "Medicina General",
      "slug": "medicina-general",
      "icono": "fa-solid fa-stethoscope",
      "color": "blue",
      "descripcion": "Atención médica primaria",
      "total_medicos": 17
    }
  ],
  "total": 40
}
```

**Campos para LandingSite:**
| Campo API | Uso en LandingSite |
|-----------|-------------------|
| `nombre` | Texto de la tarjeta de categoría |
| `slug` | URL del enlace: `/directorio-medico-{slug}` |
| `icono` | Clase Font Awesome del ícono |
| `color` | Color del ícono (ver mapeo abajo) |
| `total_medicos` | Badge informativo (opcional) |

**Mapeo de colores → classes CSS:**
| Color API | bg-light | text | hover-bg |
|-----------|----------|------|----------|
| `primary` | `bg-[var(--primary-color)]/10` | `text-[var(--primary-color)]` | `group-hover:bg-[var(--primary-color)]` |
| `accent` | `bg-[var(--accent-color)]/10` | `text-[var(--accent-color)]` | `group-hover:bg-[var(--accent-color)]` |
| `accent2` | `bg-[var(--accent2-color)]/10` | `text-[var(--accent2-color)]` | `group-hover:bg-[var(--accent2-color)]` |
| `blue` | `bg-blue-100` | `text-blue-500` | `group-hover:bg-blue-500` |
| `red` | `bg-red-100` | `text-red-500` | `group-hover:bg-red-500` |
| `green` | `bg-green-100` | `text-green-600` | `group-hover:bg-green-500` |
| `amber` | `bg-amber-100` | `text-amber-500` | `group-hover:bg-amber-500` |
| `pink` | `bg-pink-100` | `text-pink-500` | `group-hover:bg-pink-500` |
| `purple` | `bg-purple-100` | `text-purple-500` | `group-hover:bg-purple-500` |
| `orange` | `bg-orange-100` | `text-orange-500` | `group-hover:bg-orange-500` |
| `teal` | `bg-teal-100` | `text-teal-500` | `group-hover:bg-teal-500` |
| `sky` | `bg-sky-100` | `text-sky-500` | `group-hover:bg-sky-500` |
| `rose` | `bg-rose-100` | `text-rose-500` | `group-hover:bg-rose-500` |
| `cyan` | `bg-cyan-100` | `text-cyan-500` | `group-hover:bg-cyan-500` |
| `fuchsia` | `bg-fuchsia-100` | `text-fuchsia-500` | `group-hover:bg-fuchsia-500` |
| `emerald` | `bg-emerald-100` | `text-emerald-500` | `group-hover:bg-emerald-500` |
| `indigo` | `bg-indigo-100` | `text-indigo-500` | `group-hover:bg-indigo-500` |
| `lime` | `bg-lime-100` | `text-lime-500` | `group-hover:bg-lime-500` |
| `violet` | `bg-violet-100` | `text-violet-500` | `group-hover:bg-violet-500` |
| `yellow` | `bg-yellow-100` | `text-yellow-500` | `group-hover:bg-yellow-500` |
| `slate` | `bg-slate-100` | `text-slate-500` | `group-hover:bg-slate-500` |
| `red-600` | `bg-red-200` | `text-red-600` | `group-hover:bg-red-600` |
| `amber-600` | `bg-amber-200` | `text-amber-600` | `group-hover:bg-amber-600` |
| `cyan-600` | `bg-cyan-200` | `text-cyan-600` | `group-hover:bg-cyan-600` |
| `indigo-600` | `bg-indigo-200` | `text-indigo-600` | `group-hover:bg-indigo-600` |
| `lime-600` | `bg-lime-200` | `text-lime-600` | `group-hover:bg-lime-600` |
| `green-600` | `bg-green-200` | `text-green-600` | `group-hover:bg-green-600` |
| `orange-600` | `bg-orange-200` | `text-orange-600` | `group-hover:bg-orange-600` |
| `fuchsia-600` | `bg-fuchsia-200` | `text-fuchsia-600` | `group-hover:bg-fuchsia-600` |
| `purple-600` | `bg-purple-200` | `text-purple-600` | `group-hover:bg-purple-600` |

---

### 2.2 Médicos por Especialidad
```
GET https://app.mediprotect.com.mx/api/directorio-medico?especialidad={slug}
```

**Parámetros query opcionales:**
| Param | Descripción | Ejemplo |
|-------|-------------|---------|
| `especialidad` | Slug de la especialidad | `medicina-general` |
| `ciudad` | Filtrar por ciudad (búsqueda parcial) | `Puebla` |
| `estado` | Filtrar por estado | `Puebla` |
| `search` | Buscar por nombre o bio | `López` |
| `destacado` | Solo destacados | `true` |
| `limite` | Límite de resultados | `50` |

**Respuesta:**
```json
{
  "medicos": [
    {
      "id": 42,
      "slug": "dra-patricia-lopez-ruiz",
      "titulo": "Dra.",
      "nombre": "Patricia",
      "apellido": "Ruiz López",
      "nombre_completo": "Dra. Patricia Ruiz López",
      "foto_url": null,
      "descripcion": "Médica cirujana con 15 años de experiencia...",
      "subespecialidad": "Medicina General - Estética y Alopecia",
      "frase_inspiradora": "Tu salud es mi prioridad",
      "cedula_profesional": "1234567",
      "universidad": "Universidad Autónoma de Puebla",
      "whatsapp": "522221234567",
      "precio_regular": 800,
      "precio_miembro": 500,
      "score_confianza": 4.8,
      "destacado": true,
      "direccion": "Av. 5 de Mayo 123, Centro",
      "ciudad": "Puebla",
      "estado": "Puebla",
      "especialidad": {
        "id": 1,
        "slug": "medicina-general",
        "nombre": "Medicina General",
        "icono": "fa-solid fa-stethoscope",
        "color": "blue"
      },
      "centro": {
        "id": 5,
        "nombre": "Mediwork Centro Médico",
        "direccion": "Boulevard 5 de Mayo 2307",
        "ciudad": "Puebla",
        "estado": "Puebla",
        "telefono": "2221234567"
      },
      "servicios": [],
      "especialidades_adicionales": []
    }
  ],
  "total": 17
}
```

**Campos para LandingSite (tarjeta de médico):**
| Campo API | Uso en LandingSite |
|-----------|-------------------|
| `nombre_completo` | Nombre visible del médico |
| `subespecialidad` | Subtítulo bajo el nombre |
| `cedula_profesional` | Texto "Cédula: XXXXXX" |
| `ciudad` + `estado` | Texto "Puebla, Pue." |
| `centro.nombre` | Nombre de la clínica |
| `destacado` | Badge "Destacado" |
| `id` | Link a perfil: `/perfil-dr-{slug}` o `/medicos/{id}` |
| `foto_url` | Foto del médico (si existe) |
| `score_confianza` | Rating (opcional) |

---

### 2.3 Buscar Médico por ID
```
GET https://app.mediprotect.com.mx/api/directorio-medico?search={nombre}
```

O directamente:
```
GET https://app.mediprotect.com.mx/api/medicos?id={uuid}
```

---

## 3. CONFIGURACIÓN CORS (REQUERIDA)

**IMPORTANTE:** Para que `www.mediprotect.com.mx` pueda hacer fetch a `app.mediprotect.com.mx`, necesitamos configurar CORS en el backend.

Agregar en `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': 'https://www.mediprotect.com.mx',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    }
  }
})
```

O crear un middleware server `/server/middleware/cors.ts`:

```typescript
export default defineEventHandler((event) => {
  if (event.path?.startsWith('/api/')) {
    setHeader(event, 'Access-Control-Allow-Origin', 'https://www.mediprotect.com.mx')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    if (getMethod(event) === 'OPTIONS') {
      setResponseStatus(event, 204)
      return ''
    }
  }
})
```

---

## 4. CÓMO FUNCIONA ACTUALMENTE (LandingSite)

### 4.1 Página `/red-medica`
- 35 tarjetas de categorías con íconos y colores **hardcodeados en HTML**
- Cada tarjeta enlaza a `/directorio-medico-{slug}`
- **Cambiar a:** Cargar categorías desde API y renderizar dinámicamente

### 4.2 Página `/directorio-medico-{slug}`
- Header con nombre de especialidad + badges
- Filtro de ciudad (Puebla, CDMX, Guadalajara, Monterrey)
- Lista de tarjetas de médicos con: foto, nombre, subespecialidad, cédula, ciudad, clínica
- Botones "Perfil" y "Cita"
- Sección "Información de Servicio" (hardcodeada por especialidad)
- CTA con botones "Llamar Ahora" y "Enviar Mensaje"
- **Cambiar a:** Cargar médicos desde API, mantener estructura HTML

### 4.3 Página `/perfil-dr-{slug}`
- Solo ~11 doctores tienen perfil real
- **Opción A:** LandingSite mantiene los perfiles hardcodeados (más trabajo)
- **Opción B:** Crear endpoint de perfil completo en la API y que LandingSite lo renderice

---

## 5. CAMBIOS NECESARIOS EN LANDINGSITE

### 5.1 `/red-medica` (Categorías)
```javascript
// ANTES: HTML hardcodeado
// DESPUÉS: Fetch desde API
const res = await fetch('https://app.mediprotect.com.mx/api/directorio-medico/categorias')
const { categorias } = await res.json()

// Renderizar cada categoría usando los colores del mapeo
categorias.forEach(cat => {
  const colors = colorMap[cat.color]
  // Crear tarjeta con: cat.icono, colors.bg, colors.text, cat.nombre
  // Link a: /directorio-medico-${cat.slug}
})
```

### 5.2 `/directorio-medico-{slug}` (Médicos)
```javascript
// ANTES: HTML hardcodeado
// DESPUÉS: Fetch desde API
const slug = window.location.pathname.replace('/directorio-medico-', '')
const res = await fetch(`https://app.mediprotect.com.mx/api/directorio-medico?especialidad=${slug}`)
const { medicos } = await res.json()

// Renderizar cada médico manteniendo la estructura actual:
// - Badge "Destacado" si m.destacado === true
// - Avatar con iniciales o foto
// - m.nombre_completo
// - m.subespecialidad
// - "Cédula: " + m.cedula_profesional
// - m.ciudad + ", " + m.estado
// - m.centro?.nombre
// - Botón "Perfil" → /medicos/${m.id}
// - Botón "Cita" → /agendar-cita?doctor=${m.nombre_completo}
```

### 5.3 Filtro de Ciudad
```javascript
// Actualmente: dropdown hardcodeado (Puebla, CDMX, etc.)
// Opción 1: Mantener el dropdown hardcodeado (más simple)
// Opción 2: Obtener ciudades únicas de los médicos:
const ciudades = [...new Set(medicos.map(m => m.ciudad).filter(Boolean))]
```

---

## 6. INFORMACIÓN DE SERVICIO (SECCIÓN ESTÁTICA)

La sección "Información de Servicio" que aparece al final de cada página de categoría contiene texto hardcodeado por especialidad (ej: "¿Qué tratamos?" con lista de tratamientos). 

**Opciones:**
1. **Mantener hardcodeado en LandingSite** (recomendado por ahora) — es contenido estático que no cambia
2. **Mover a la API** — agregar campo `info_servicio` a la tabla `especialidades` con JSON { que_tratamos: [{icono, titulo, descripcion}], cta_texto, cta_boton1, cta_boton2 }

---

## 7. ENLACES IMPORTANTES

| URL actual | Destino |
|-----------|---------|
| `/directorio-medico-{slug}` | Lista de médicos de la especialidad |
| `/perfil-dr-{slug}` | Perfil del médico (solo ~11 existen) |
| Botón "Cita" | `/agendar-cita?doctor={nombre_completo}` |
| Botón "Perfil" | `/medicos/{id}` (CRM) o `/perfil-dr-{slug}` (LandingSite) |

---

## 8. DATOS FALTANTES EN LA API (GAPS)

| Campo | Estado | Notas |
|-------|--------|-------|
| Foto del médico | `foto_url` existe pero vacío | Necesita populate desde LandingSite o subir fotos |
| Descripción/bio | Disponible | Viene de `m.bio` |
| Horarios/disponibilidad | **No disponible** | Necesita endpoint nuevo o campo en tabla |
| Precio regular/miembro | Disponible | `precio_regular`, `precio_miembro` |
| Reseñas de pacientes | **No disponible** | Tabla `resenas` no existe aún |
| Galería de fotos | **No disponible** | Campo nuevo necesario |

---

## 9. ORDEN DE INTEGRACIÓN RECOMENDADO

1. **Configurar CORS** en `app.mediprotect.com.mx` (nosotros)
2. **Probar API** desde consola del navegador en `www.mediprotect.com.mx`:
   ```javascript
   fetch('https://app.mediprotect.com.mx/api/directorio-medico/categorias')
     .then(r => r.json())
     .then(d => console.log(d))
   ```
3. **Modificar `/red-medica`** — cargar categorías desde API
4. **Modificar `/directorio-medico-{slug}`** — cargar médicos desde API
5. **Mantener secciones estáticas** (footer, CTA, info de servicio) como están
6. **Probar** que no se rompa nada del diseño actual

---

## 10. CREDENCIALES DE PRUEBA

Para probar la API localmente:
```
Base URL: https://app.mediprotect.com.mx/api/
Auth: No requerida para endpoints públicos (directorio-medico, categorías, especialidades)
```

---

## 11. CONTACTO TÉCNICO

- **Backend:** Nuxt 4 + Nitro en `app.mediprotect.com.mx`
- **Base de datos:** Supabase PostgreSQL
- **Deploy:** PM2 en VPS, nginx reverse proxy
- **Git:** `git@github.com:ldgfelipe/app_mediprotect.git`
