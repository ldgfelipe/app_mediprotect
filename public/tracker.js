/**
 * MediProtect Session Bridge v2
 * Uso: <script src="https://app.mediprotect.com.mx/tracker.js"></script>
 *
 * Detecta sesión y modifica el menú automáticamente.
 * Sin data-attributes necesarios - busca patrones comunes de menú.
 */
(function() {
  'use strict';

  var TOKEN_KEY = 'mp_token';
  var USUARIO_KEY = 'mp_usuario';
  var API_BASE = 'https://app.mediprotect.com.mx';
  var LOGIN_URL = API_BASE + '/login?returnTo=' + encodeURIComponent(window.location.origin);

  // Guardar token de la URL
  function captureFromURL() {
    try {
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');
      var usuario = params.get('usuario');
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        if (usuario) localStorage.setItem(USUARIO_KEY, decodeURIComponent(usuario));
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY); }

  function getUsuario() {
    try {
      var raw = localStorage.getItem(USUARIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function isLogged() { return !!getToken(); }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    updateUI(false, null);
    document.dispatchEvent(new Event('mediaprotect:logout'));
    window.location.reload();
  }

  function checkSession(callback) {
    var token = getToken();
    if (!token) { callback(null, false); return; }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/api/auth/session', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.autenticado) {
            localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
            updateUI(true, data.usuario);
            callback(data.usuario, true);
          } else {
            logout();
            callback(null, false);
          }
        } catch (e) {
          callback(getUsuario(), isLogged());
        }
      }
    };
    xhr.onerror = function() {
      callback(getUsuario(), isLogged());
    };
    xhr.send();
  }

  // Buscar y modificar el menú
  function updateUI(logged, usuario) {
    var nombre = usuario ? (usuario.nombre || '') : '';

    // 1. Data attributes (si los usa)
    document.querySelectorAll('[data-mp-auth]').forEach(function(el) {
      var v = el.getAttribute('data-mp-auth');
      el.style.display = (v === 'logged' && logged) || (v === 'guest' && !logged) ? '' : 'none';
    });
    document.querySelectorAll('[data-mp-name]').forEach(function(el) {
      el.textContent = nombre;
    });
    document.querySelectorAll('[data-mp-login-url]').forEach(function(el) {
      el.setAttribute('href', LOGIN_URL);
    });
    document.querySelectorAll('[data-mp-logout]').forEach(function(el) {
      el.onclick = function(e) { e.preventDefault(); logout(); };
    });

    // 2. Detectar links de login/registro por texto
    var allLinks = document.querySelectorAll('a, button');
    allLinks.forEach(function(el) {
      var text = (el.textContent || '').toLowerCase().trim();
      var href = (el.getAttribute('href') || '').toLowerCase();

      // Links de login
      if ((text === 'iniciar sesión' || text === 'iniciar sesion' || text === 'login' || text === 'acceder')
          && !el.hasAttribute('data-mp-handled')) {
        el.setAttribute('data-mp-handled', '1');
        if (logged) {
          el.style.display = 'none';
        } else {
          el.setAttribute('href', LOGIN_URL);
          el.style.display = '';
        }
      }

      // Links de registro
      if ((text === 'registrarse' || text === 'registro' || text === 'regístrate')
          && !el.hasAttribute('data-mp-handled')) {
        el.setAttribute('data-mp-handled', '1');
        el.style.display = logged ? 'none' : '';
      }

      // Botón/links de cerrar sesión
      if ((text === 'cerrar sesión' || text === 'cerrar sesion' || text === 'logout' || text === 'salir')
          && !el.hasAttribute('data-mp-handled')) {
        el.setAttribute('data-mp-handled', '1');
        if (logged) {
          el.style.display = '';
          el.onclick = function(e) { e.preventDefault(); logout(); };
        } else {
          el.style.display = 'none';
        }
      }
    });

    // 3. Buscar elemento con "Hola, " y reemplazar nombre
    document.querySelectorAll('span, p, div, a').forEach(function(el) {
      var text = el.textContent || '';
      if (text.match(/hola,?\s/i) && el.children.length === 0 && !el.hasAttribute('data-mp-handled')) {
        el.setAttribute('data-mp-handled', '1');
        if (logged) {
          el.textContent = 'Hola, ' + nombre;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      }
    });

    // 4. Inyectar menú si no existe ninguno detectado
    if (!document.querySelector('[data-mp-injected]')) {
      var nav = document.querySelector('nav, .nav, .menu, .navbar, header');
      if (nav) {
        var div = document.createElement('div');
        div.setAttribute('data-mp-injected', '1');
        div.style.cssText = 'display:flex;align-items:center;gap:1rem;font-family:sans-serif;font-size:0.9rem;';

        if (logged) {
          div.innerHTML =
            '<span style="color:#00b894;font-weight:600">Hola, ' + nombre + '</span>' +
            '<a href="' + API_BASE + '/dashboard" style="color:#333;text-decoration:none">Mi Panel</a>' +
            '<a href="#" onclick="MediProtect.logout();return false" style="color:#c62828;text-decoration:none;cursor:pointer">Salir</a>';
        } else {
          div.innerHTML =
            '<a href="' + LOGIN_URL + '" style="background:#00b894;color:white;padding:0.4rem 1rem;border-radius:6px;text-decoration:none">Iniciar Sesión</a>';
        }

        nav.appendChild(div);
      }
    }

    document.dispatchEvent(new CustomEvent('mediaprotect:update', { detail: { logged: logged, usuario: usuario } }));
  }

  // Init
  captureFromURL();

  window.MediProtect = {
    getToken: getToken,
    getUsuario: getUsuario,
    isLogged: isLogged,
    checkSession: checkSession,
    logout: logout,
    updateUI: updateUI,
    getLoginURL: function() { return LOGIN_URL; }
  };

  function init() {
    // Aplicar inmediatamente con datos locales
    updateUI(isLogged(), getUsuario());
    // Verificar contra API en background
    checkSession(function() {});
    // Revisar periódicamente por si el DOM cambia
    var attempts = 0;
    var interval = setInterval(function() {
      updateUI(isLogged(), getUsuario());
      attempts++;
      if (attempts >= 10) clearInterval(interval);
    }, 500);
    document.dispatchEvent(new Event('mediaprotect:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
