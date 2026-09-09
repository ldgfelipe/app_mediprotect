/**
 * MediProtect Session Bridge v4
 * Uso: <script src="https://app.mediprotect.com.mx/tracker.js"></script>
 *
 * Compatível con el sistema del landing (AppBridge + mp_app_session).
 * SOLO maneja data-attributes en el HTML existente. NO inyecta nada.
 *
 * Data attributes:
 *   data-mp-auth="logged"    → visible solo logueado
 *   data-mp-auth="guest"     → visible solo NO logueado
 *   data-mp-name             → reemplaza con nombre del usuario
 *   data-mp-login-url        → href = URL de login
 *   data-mp-logout           → click = logout
 */
(function() {
  'use strict';

  var API_BASE = 'https://app.mediprotect.com.mx';
  var LOGIN_URL = API_BASE + '/login?returnTo=' + encodeURIComponent(window.location.origin);

  // Claves de localStorage (compatibles con AppBridge del landing)
  var TOKEN_KEY = 'mp_app_session';
  var TOKEN_KEY_FALLBACK = 'mp_token';
  var USUARIO_KEY = 'mp_usuario';

  function captureFromURL() {
    try {
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');
      var usuario = params.get('usuario');
      if (token) {
        // Guardar en ambas claves para compatibilidad
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY_FALLBACK, token);
        if (usuario) localStorage.setItem(USUARIO_KEY, decodeURIComponent(usuario));
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY_FALLBACK);
  }

  function getUsuario() {
    try {
      var raw = localStorage.getItem(USUARIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function isLogged() { return !!getToken(); }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY_FALLBACK);
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
            // Token inválido, limpiar
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(TOKEN_KEY_FALLBACK);
            localStorage.removeItem(USUARIO_KEY);
            updateUI(false, null);
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

  function updateUI(logged, usuario) {
    var nombre = usuario ? (usuario.nombre || '') : '';

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
