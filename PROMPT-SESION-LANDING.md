# Prompt para landingsite.ia — Detectar Usuario Logueado desde app.mediprotect.com.mx

## Contexto

**www.mediprotect.com.mx** (landing) necesita saber si el usuario está logueado en **app.mediprotect.com.mx** (CRM) para:
- Mostrar el nombre del usuario en el header
- Saltar el paso de login al agendar cita
- Redirigir directo a WhatsApp si ya está autenticado

---

## Endpoint de Sesión

```
GET https://app.mediprotect.com.mx/api/auth/session
Headers: Authorization: Bearer <token>
```

### Respuesta cuando SÍ está logueado:
```json
{
  "autenticado": true,
  "usuario": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@correo.com",
    "telefono": "2221234567",
    "tipo": "paciente"
  }
}
```

### Respuesta cuando NO está logueado:
```json
{
  "autenticado": false
}
```

---

## Flujo de Integración

```
1. Landing carga → lee token de localStorage/cookie
2. Si hay token → llama GET /api/auth/session
3. Si responde autenticado:true → muestra nombre en header
4. Si responde autenticado:false → muestra "Iniciar Sesión"
5. Al hacer click en "Agendar Cita" → si está logueado, directo a WhatsApp
```

---

## JavaScript para Landing Site

### 1. Al cargar la página — Detectar sesión

```javascript
// Función para verificar si el usuario está logueado
async function verificarSesion() {
  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const res = await fetch('https://app.mediprotect.com.mx/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.autenticado) return data.usuario
  } catch (e) {
    console.error('Error verificando sesión:', e)
  }
  return null
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  const usuario = await verificarSesion()
  
  if (usuario) {
    mostrarUsuarioLogueado(usuario)
  } else {
    mostrarInvitado()
  }
})
```

### 2. Mostrar u ocultar elementos según sesión

```javascript
function mostrarUsuarioLogueado(usuario) {
  // Ocultar botones de login
  const loginBtn = document.querySelector('.btn-login')
  const registroBtn = document.querySelector('.btn-registro')
  if (loginBtn) loginBtn.style.display = 'none'
  if (registroBtn) registroBtn.style.display = 'none'

  // Mostrar nombre del usuario
  const userArea = document.querySelector('.user-area')
  if (userArea) {
    userArea.style.display = 'flex'
    userArea.innerHTML = `
      <span class="user-name">Hola, ${usuario.nombre}</span>
      <a href="https://app.mediprotect.com.mx/dashboard/${usuario.tipo}" 
         target="_blank" class="btn-panel">Mi Panel</a>
      <button onclick="cerrarSesion()" class="btn-logout">Salir</button>
    `
  }

  // Actualizar botones de agendar cita
  document.querySelectorAll('.btn-agendar').forEach(btn => {
    btn.dataset.usuarioLogueado = 'true'
    btn.dataset.usuarioNombre = usuario.nombre
    btn.dataset.usuarioApellido = usuario.apellido
    btn.dataset.usuarioId = usuario.id
    btn.dataset.usuarioTipo = usuario.tipo
  })
}

function mostrarInvitado() {
  // Mostrar botones de login
  const loginBtn = document.querySelector('.btn-login')
  const registroBtn = document.querySelector('.btn-registro')
  if (loginBtn) loginBtn.style.display = 'inline-block'
  if (registroBtn) registroBtn.style.display = 'inline-block'

  // Ocultar área de usuario
  const userArea = document.querySelector('.user-area')
  if (userArea) userArea.style.display = 'none'

  // Resetear botones de agendar
  document.querySelectorAll('.btn-agendar').forEach(btn => {
    btn.dataset.usuarioLogueado = 'false'
  })
}

function cerrarSesion() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  mostrarInvitado()
  location.reload()
}
```

### 3. Botón "Agendar Cita" — Comportamiento según sesión

```javascript
// Agregar event listener a todos los botones de agendar
document.querySelectorAll('.btn-agendar').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault()

    const doctorName = btn.dataset.doctor
    const usuarioLogueado = btn.dataset.usuarioLogueado === 'true'

    if (usuarioLogueado) {
      // Ya está logueado → abrir WhatsApp directamente
      const nombre = btn.dataset.usuarioNombre
      const apellido = btn.dataset.usuarioApellido
      const userId = btn.dataset.usuarioId
      const tipo = btn.dataset.usuarioTipo

      if (tipo === 'paciente') {
        // Crear cita y abrir WhatsApp
        abrirWhatsAppConCita(doctorName, nombre, apellido, userId)
      } else {
        // Si es médico u otro, solo abrir WhatsApp
        abrirWhatsApp(doctorName, nombre, apellido, userId)
      }
    } else {
      // No está logueado → abrir enlace normal (login/registro)
      window.open(btn.href, '_blank')
    }
  })
})

function abrirWhatsAppConCita(doctorName, nombre, apellido, userId) {
  const msg = `Hola, quiero una cita con el médico ${doctorName}.\n\nMi nombre es: ${nombre} ${apellido}\nMi ID de usuario es: ${userId}`
  const whatsappNum = '522228021933'
  window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank')
}

function abrirWhatsApp(doctorName, nombre, apellido, userId) {
  const msg = `Hola, quiero una cita con el médico ${doctorName}.\n\nMi nombre es: ${nombre} ${apellido}\nMi ID de usuario es: ${userId}`
  const whatsappNum = '522228021933'
  window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank')
}
```

### 4. HTML del Header — Estructura sugerida

```html
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="logo">
      <img src="logo.png" alt="MediProtect" />
    </a>
    
    <nav class="nav-links">
      <a href="/red-medica">Red Médica</a>
      <a href="/planes">Planes</a>
      <a href="/empresas">Empresas</a>
    </nav>

    <div class="header-actions">
      <!-- Mostrar cuando NO está logueado -->
      <a href="https://app.mediprotect.com.mx/login" class="btn-login" target="_blank">
        Iniciar Sesión
      </a>
      <a href="https://app.mediprotect.com.mx/registro-curp" class="btn-registro" target="_blank">
        Crear Cuenta
      </a>

      <!-- Mostrar cuando SÍ está logueado -->
      <div class="user-area" style="display:none">
        <!-- Se llena con JavaScript -->
      </div>
    </div>
  </div>
</header>
```

### 5. HTML de Tarjeta de Médico — Botón de Agendar

```html
<div class="card-medico">
  <img src="{foto_url}" alt="{nombre}" />
  <h3>Dr. Erasmo Aaron Vega Osorio</h3>
  <p>Médico Cirujano</p>
  <p>Puebla, Puebla</p>
  
  <!-- Botón de agendar con data attributes -->
  <a 
    href="https://app.mediprotect.com.mx/agendar-cita?doctor=Dr.+Erasmo+Aaron+Vega+Osorio"
    target="_blank"
    class="btn-agendar"
    data-doctor="Dr. Erasmo Aaron Vega Osorio"
  >
    Agendar Cita por WhatsApp
  </a>
</div>
```

---

## CSS Sugerido

```css
/* Header */
.site-header {
  background: white;
  border-bottom: 1px solid #eaeaea;
  padding: 0.8rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Botones de login/registro */
.btn-login {
  color: #2d3436;
  font-weight: 500;
  text-decoration: none;
  padding: 0.5rem 1rem;
}

.btn-registro {
  background: #00b894;
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
}

/* Área de usuario logueado */
.user-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  color: #2d3436;
  font-weight: 500;
}

.btn-panel {
  background: #0984e3;
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-logout {
  background: none;
  border: 1px solid #dfe6e9;
  color: #636e72;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-logout:hover {
  border-color: #d63031;
  color: #d63031;
}

/* Botón de agendar */
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
```

---

## Checklist de Implementación

- [ ] Función `verificarSesion()` que llama al endpoint
- [ ] Ejecutar al cargar la página (DOMContentLoaded)
- [ ] Guardar datos del usuario en variables/data attributes
- [ ] Actualizar header según sesión (logueado/invitado)
- [ ] Botón "Agendar Cita" comportamiento según sesión
- [ ] Función `cerrarSesion()` que limpia token
- [ ] CSS para header, botones y área de usuario
- [ ] Probar con usuario logueado y sin loguear

---

## Notas Importantes

1. **Token storage**: El token se guarda en `localStorage` con key `token`
2. **CORS**: El endpoint acepta requests desde `www.mediprotect.com.mx` y `mediprotect.com.mx`
3. **Sin token**: Si no hay token en localStorage, el usuario no está logueado
4. **Token expirado**: Si el token expiró, el endpoint devuelve `autenticado: false`
5. **Tipos de usuario**: El endpoint retorna `tipo: "paciente"` o `tipo: "medico"`
6. **WhatsApp**: El número de WhatsApp de MediProtect es `522228021933`
