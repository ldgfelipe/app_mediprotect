/**
 * MediProtect Session Bridge
 * Uso: <script src="https://app.mediprotect.com.mx/tracker.js"></script>
 *
 * El script:
 * - Detecta token en la URL (?token=...&usuario=...) y lo guarda en localStorage
 * - Actualiza el menú del landing según estado de sesión
 * - Expone window.MediProtect con métodos para verificar sesión
 *
 * Elementos en el HTML del landing (data attributes):
 *   data-mp-auth="logged"    → se muestra SOLO cuando está logueado
 *   data-mp-auth="guest"     → se muestra SOLO cuando NO está logueado
 *   data-mp-name             → se reemplaza con el nombre del usuario
 *   data-mp-logout           → click ejecuta logout
 *   data-mp-login-url        → href se reemplaza con URL de login
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
    applyMenu(false, null);
    document.dispatchEvent(new Event('mediaprotect:logout'));
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
            applyMenu(true, data.usuario);
            callback(data.usuario, true);
          } else {
            logout();
            callback(null, false);
          }
        } catch (e) { callback(null, false); }
      }
    };
    xhr.onerror = function() {
      var u = getUsuario();
      applyMenu(isLogged(), u);
      callback(u, isLogged());
    };
    xhr.send();
  }

  // Actualizar menú según estado de sesión
  function applyMenu(logged, usuario) {
    // Mostrar/ocultar elementos por data-mp-auth
    var authElements = document.querySelectorAll('[data-mp-auth]');
    for (var i = 0; i < authElements.length; i++) {
      var el = authElements[i];
      var requirement = el.getAttribute('data-mp-auth');
      if (requirement === 'logged') {
        el.style.display = logged ? '' : 'none';
      } else if (requirement === 'guest') {
        el.style.display = logged ? 'none' : '';
      }
    }

    // Reemplazar nombre de usuario
    var nameElements = document.querySelectorAll('[data-mp-name]');
    var displayName = usuario ? (usuario.nombre || '') : '';
    for (var j = 0; j < nameElements.length; j++) {
      nameElements[j].textContent = displayName;
    }

    // Configurar URLs de login
    var loginLinks = document.querySelectorAll('[data-mp-login-url]');
    for (var k = 0; k < loginLinks.length; k++) {
      loginLinks[k].setAttribute('href', LOGIN_URL);
    }

    // Configurar botones de logout
    var logoutBtns = document.querySelectorAll('[data-mp-logout]');
    for (var l = 0; l < logoutBtns.length; l++) {
      logoutBtns[l].onclick = function(e) {
        e.preventDefault();
        logout();
        window.location.reload();
      };
    }
  }

  // Init
  captureFromURL();

  window.MediProtect = {
    getToken: getToken,
    getUsuario: getUsuario,
    isLogged: isLogged,
    checkSession: checkSession,
    logout: logout,
    applyMenu: applyMenu,
    getLoginURL: function() { return LOGIN_URL; }
  };

  // Cuando el DOM esté listo, aplicar menú y disparar evento
  function init() {
    applyMenu(isLogged(), getUsuario());
    document.dispatchEvent(new Event('mediaprotect:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
