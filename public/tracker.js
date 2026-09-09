/**
 * MediProtect Session Bridge
 * Uso: <script src="https://app.mediprotect.com.mx/tracker.js"></script>
 *
 * El script:
 * - Detecta token en la URL (?token=...&usuario=...) y lo guarda en localStorage
 * - Expone window.MediProtect con métodos para verificar sesión
 */
(function() {
  'use strict';

  var TOKEN_KEY = 'mp_token';
  var USUARIO_KEY = 'mp_usuario';
  var API_BASE = 'https://app.mediprotect.com.mx';

  // Si hay token en la URL, guardarlo
  function captureFromURL() {
    try {
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');
      var usuario = params.get('usuario');

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        if (usuario) {
          localStorage.setItem(USUARIO_KEY, decodeURIComponent(usuario));
        }
        // Limpiar URL sin recargar
        var cleanURL = window.location.pathname;
        window.history.replaceState({}, document.title, cleanURL);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUsuario() {
    try {
      var raw = localStorage.getItem(USUARIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isLogged() {
    return !!getToken();
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  }

  // Verificar sesión contra el API
  function checkSession(callback) {
    var token = getToken();
    if (!token) {
      callback(null, false);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/api/auth/session', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.autenticado) {
            // Actualizar datos locales por si cambiaron
            localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
            callback(data.usuario, true);
          } else {
            logout();
            callback(null, false);
          }
        } catch (e) {
          callback(null, false);
        }
      }
    };
    xhr.onerror = function() {
      // Sin conexión, usar datos locales
      callback(getUsuario(), isLogged());
    };
    xhr.send();
  }

  // Detectar token al cargar
  captureFromURL();

  // Exponer API pública
  window.MediProtect = {
    getToken: getToken,
    getUsuario: getUsuario,
    isLogged: isLogged,
    checkSession: checkSession,
    logout: logout
  };

  // Disparar evento cuando la sesión esté lista
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      document.dispatchEvent(new Event('mediaprotect:ready'));
    });
  } else {
    document.dispatchEvent(new Event('mediaprotect:ready'));
  }
})();
