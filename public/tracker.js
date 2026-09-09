/**
 * MediProtect Session Bridge v6
 * Uso: <script src="https://app.mediprotect.com.mx/tracker.js"></script>
 *
 * Inyecta widget de sesión (ícono + menú desplegable).
 * También maneja data-attributes si el landing los usa.
 */
(function() {
  'use strict';

  // No inyectar nada si estamos en la app (evita duplicados)
  var host = window.location.hostname;
  if (host === 'app.mediprotect.com.mx' || host === 'localhost' || host === '127.0.0.1') {
    // Exponer API para la app pero sin widget
    window.MediProtect = {
      getToken: function() { return localStorage.getItem('mp_app_session') || localStorage.getItem('mp_token'); },
      isLogged: function() { return !!(localStorage.getItem('mp_app_session') || localStorage.getItem('mp_token')); },
      getUsuario: function() { try { var r = localStorage.getItem('mp_usuario'); return r ? JSON.parse(r) : null; } catch(e) { return null; } }
    };
    return;
  }

  var API_BASE = 'https://app.mediprotect.com.mx';
  var LOGIN_URL = API_BASE + '/login?returnTo=' + encodeURIComponent(window.location.origin);
  var TOKEN_KEY = 'mp_app_session';
  var TOKEN_KEY_FALLBACK = 'mp_token';
  var USUARIO_KEY = 'mp_usuario';

  function captureFromURL() {
    try {
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');
      var usuario = params.get('usuario');
      if (token) {
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
    renderWidget(false, null);
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
            renderWidget(true, data.usuario);
            callback(data.usuario, true);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(TOKEN_KEY_FALLBACK);
            localStorage.removeItem(USUARIO_KEY);
            renderWidget(false, null);
            callback(null, false);
          }
        } catch (e) {
          callback(getUsuario(), isLogged());
        }
      }
    };
    xhr.onerror = function() { callback(getUsuario(), isLogged()); };
    xhr.send();
  }

  // Data-attributes del landing
  function applyDataAttrs(logged, nombre) {
    document.querySelectorAll('[data-mp-auth]').forEach(function(el) {
      var v = el.getAttribute('data-mp-auth');
      el.style.display = (v === 'logged' && logged) || (v === 'guest' && !logged) ? '' : 'none';
    });
    document.querySelectorAll('[data-mp-name]').forEach(function(el) { el.textContent = nombre; });
    document.querySelectorAll('[data-mp-login-url]').forEach(function(el) { el.setAttribute('href', LOGIN_URL); });
    document.querySelectorAll('[data-mp-logout]').forEach(function(el) {
      el.onclick = function(e) { e.preventDefault(); logout(); };
    });
  }

  // Renderizar widget inyectado
  function renderWidget(logged, usuario) {
    var nombre = usuario ? (usuario.nombre || '') : '';
    applyDataAttrs(logged, nombre);

    var widget = document.getElementById('mp-session-widget');
    if (!widget) {
      widget = createWidget();
    }
    updateWidget(widget, logged, nombre);
  }

  function createWidget() {
    var widget = document.createElement('div');
    widget.id = 'mp-session-widget';
    widget.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

    var btn = document.createElement('div');
    btn.id = 'mp-session-btn';
    btn.style.cssText = 'width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:all 0.2s;';

    var menu = document.createElement('div');
    menu.id = 'mp-session-menu';
    menu.style.cssText = 'position:absolute;top:48px;right:0;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);min-width:220px;display:none;overflow:hidden;';

    widget.appendChild(btn);
    widget.appendChild(menu);
    document.body.appendChild(widget);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    menu.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    document.addEventListener('click', function() {
      menu.style.display = 'none';
    });

    return widget;
  }

  function updateWidget(widget, logged, nombre) {
    var btn = widget.querySelector('#mp-session-btn');
    var menu = widget.querySelector('#mp-session-menu');
    if (!btn || !menu) return;

    if (logged) {
      btn.style.background = '#00b894';
      btn.innerHTML = '<span style="color:white;font-weight:700;font-size:1.1rem;">' + (nombre ? nombre.charAt(0).toUpperCase() : 'U') + '</span>';

      menu.innerHTML =
        '<div style="padding:0.75rem 1rem;border-bottom:1px solid #f0f0f0;">' +
          '<div style="font-weight:600;color:#2d3436;font-size:0.95rem;">Hola, ' + nombre + '</div>' +
        '</div>' +
        '<a href="' + API_BASE + '/dashboard" class="mp-link" style="display:block;padding:0.75rem 1rem;color:#333;text-decoration:none;font-size:0.9rem;border-bottom:1px solid #f5f5f5;">Mi Panel</a>' +
        '<a href="#" id="mp-logout-btn" class="mp-link" style="display:block;padding:0.75rem 1rem;color:#c62828;text-decoration:none;font-size:0.9rem;">Cerrar Sesión</a>';

      menu.querySelectorAll('.mp-link').forEach(function(l) {
        l.addEventListener('click', function(e) { e.stopPropagation(); });
      });

      var logoutBtn = document.getElementById('mp-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) { e.preventDefault(); logout(); });
      }
    } else {
      btn.style.background = '#0984e3';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

      menu.innerHTML =
        '<div style="padding:0.75rem 1rem;text-align:center;">' +
          '<p style="margin:0 0 0.5rem;color:#636e72;font-size:0.85rem;">Inicia sesión para agendar citas</p>' +
          '<a href="' + LOGIN_URL + '" class="mp-link" style="display:block;background:#00b894;color:white;padding:0.6rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem;">Entrar</a>' +
          '<a href="' + LOGIN_URL + '" class="mp-link" style="display:block;margin-top:0.5rem;color:#0984e3;font-size:0.8rem;text-decoration:none;">Crear cuenta</a>' +
        '</div>';

      menu.querySelectorAll('.mp-link').forEach(function(l) {
        l.addEventListener('click', function(e) { e.stopPropagation(); });
      });
    }
  }

  captureFromURL();

  window.MediProtect = {
    getToken: getToken,
    getUsuario: getUsuario,
    isLogged: isLogged,
    checkSession: checkSession,
    logout: logout,
    getLoginURL: function() { return LOGIN_URL; }
  };

  function init() {
    renderWidget(isLogged(), getUsuario());
    checkSession(function() {});
    var attempts = 0;
    var interval = setInterval(function() {
      renderWidget(isLogged(), getUsuario());
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
