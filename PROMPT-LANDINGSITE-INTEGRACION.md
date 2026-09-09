# Integración MediProtect - Landing Site

## 1. Agregar el script

```html
<head>
  <script src="https://app.mediprotect.com.mx/tracker.js"></script>
</head>
```

## 2. Menú del landing

Usar estos `data-attributes` en el HTML del menú:

```html
<nav>
  <!-- Siempre visible -->
  <a href="/">Inicio</a>
  <a href="/medicos">Directorio Médico</a>

  <!-- Solo cuando NO está logueado -->
  <a href="/registro" data-mp-auth="guest">Registrarse</a>
  <a data-mp-login-url data-mp-auth="guest">Iniciar Sesión</a>

  <!-- Solo cuando SÍ está logueado -->
  <span data-mp-auth="logged">Hola, <span data-mp-name></span></span>
  <a href="/mi-panel" data-mp-auth="logged">Mi Panel</a>
  <a href="#" data-mp-logout data-mp-auth="logged">Cerrar Sesión</a>
</nav>
```

## 3. Data attributes disponibles

| Atributo | Función |
|---|---|
| `data-mp-auth="logged"` | Se muestra solo cuando está logueado |
| `data-mp-auth="guest"` | Se muestra solo cuando NO está logueado |
| `data-mp-name` | Se reemplaza con el nombre del usuario |
| `data-mp-login-url` | El href se setea a la URL de login automáticamente |
| `data-mp-logout"` | Click cierra sesión y recarga la página |

## 4. JavaScript (opcional)

```javascript
document.addEventListener('mediaprotect:ready', function() {
  // Verificar sesión al cargar
  MediProtect.checkSession(function(usuario, logueado) {
    if (logueado) {
      console.log('Bienvenido:', usuario.nombre);
    }
  });
});

// Métodos disponibles
MediProtect.isLogged();      // true/false
MediProtect.getUsuario();    // {id, nombre, apellido, email, tipo}
MediProtect.getToken();      // "mp_xxx..."
MediProtect.logout();        // cerrar sesión

// Escuchar evento de logout
document.addEventListener('mediaprotect:logout', function() {
  console.log('Sesión cerrada');
});
```

## 5. Flujo completo

1. Usuario hace clic en "Iniciar Sesión"
2. Se redirige a `https://app.mediprotect.com.mx/login?returnTo=https://www.mediprotect.com.mx`
3. Después del login, regresa a `https://www.mediprotect.com.mx/?token=mp_xxx...&usuario=...`
4. `tracker.js` guarda el token en localStorage y actualiza el menú automáticamente
5. El landing solo necesita leer `MediProtect.isLogged()` o usar los data-attributes

## 6. Prueba rápida

1. Abre consola del navegador en el landing
2. Ejecuta: `MediProtect.isLogged()` → debe retornar `false`
3. Inicia sesión desde el landing
4. Al regresar: `MediProtect.isLogged()` → debe retornar `true`
5. El menú debería cambiar automáticamente
