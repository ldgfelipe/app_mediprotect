/**
 * MediProtect Session Bridge v3
 * Uso: <script src="https://app.mediprotect.com.mx/tracker.js"></script>
 *
 * SOLO maneja data-attributes en el HTML existente del landing.
 * NO inyecta elementos nuevos. NO escanea links por texto.
 *
 * Data attributes soportados:
 *   data-mp-auth="logged"    → se muestra SOLO cuando logueado
 *   data-mp-auth="guest"     → se muestra SOLO cuando NO logueado
 *   data-mp-name             → se reemplaza con el nombre del usuario
 *   data-mp-login-url        → href se setea con URL de login
 *   data-mp-logout           → click ejecuta logout
 */
(function() {
  'use strict';

  var TOKEN_KEY = 'mp_token';
  var USUARIO_KEY = 'mp_usuario';
  var API_BASE = 'https://app.mediprotect.com.mx';
  var LOGIN_URL = API_BASE + '/login?returnTo=' + encodeURIComponent(window.location.origin);

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

  // SOLO maneja data-attributes. NADA mas.
  function updateUI(logged, usuario) {
    var nombre = usuario ? (usuario.nombre || '') : '';

    // Mostrar/ocultar por data-mp-auth
    document.querySelectorAll('[data-mp-auth]').forEach(function(el) {
      var v = el.getAttribute('data-mp-auth');
      el.style.display = (v === 'logged' && logged) || (v === 'guest' && !logged) ? '' : 'none';
    });

    // Rellenar nombre
    document.querySelectorAll('[data-mp-name]').forEach(function(el) {
      el.textContent = nombre;
    });

    // Setear URL de login
    document.querySelectorAll('[data-mp-login-url]').forEach(function(el) {
      el.setAttribute('href', LOGIN_URL);
    });

    // Configurar logout
    document.querySelectorAll('[data-mp-logout]').forEach(function(el) {
      el.onclick = function(e) { e.preventDefault(); logout(); };
    });

    document.dispatchEvent(new CustomEvent('mediaprotect:update', { detail: { logged: logged, usuario: usuario } }));
  }

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
    updateUI(isLogged(), getUsuario());
    checkSession(function() {});
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
