/**
 * MediProtect - Capturador de clics (tarjeta de médico / botón WhatsApp del perfil)
 *
 * Registra en `medico_clics`:
 *  - tarjeta_medico    : click en la tarjeta del grid de /red-medica/{slug}
 *  - perfil_whatsapp   : click en "Agendar Cita por WhatsApp" (abrir modal) del perfil
 *  - whatsapp_abrir    : click en "Abrir WhatsApp" / "haz clic aquí" (ya se generó folio)
 *  - ver_perfil        : click en "Agendar Cita" de listados legacy (/medicos)
 *
 * Pruebas:
 *  1) Panel flotante  -> muestra cada evento en vivo (activar con ?mp_debug=1)
 *  2) Consola         -> window.MPClics.eventos   (array)
 *  3) localStorage    -> clave "mp_clics"          (historial en el navegador)
 *  4) Red             -> POST /api/tracking/clic
 *  5) BD              -> SELECT * FROM medico_clics ORDER BY created_at DESC;
 */
(function () {
  'use strict';

  if (window.__MP_CLICS__) return;
  window.__MP_CLICS__ = true;

  var API = '/api/tracking/clic';
  var LS_KEY = 'mp_clics';
  var UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  window.MPClics = {
    eventos: [],
    debug: /[?&]mp_debug=1/.test(location.search),
    reset: function () {
      window.MPClics.eventos = [];
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      if (window.MPClics._panel) window.MPClics._panel.querySelector('.mp-clics-body').innerHTML = '';
      console.log('[MP-CLICS] historial reiniciado');
    }
  };

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  function txt(el, sel) {
    if (!el) return null;
    var n = sel ? el.querySelector(sel) : el;
    if (!n) return null;
    var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    return t || null;
  }

  function perfilActual() {
    var m = location.pathname.match(/^\/medicos\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function idMedicoDeTarjeta(el) {
    var a = el.closest('a[href*="/medicos/"]');
    if (!a) return null;
    var m = (a.getAttribute('href') || '').match(UUID_RE);
    if (m) return m[0];
    var slug = (a.getAttribute('href') || '').split('/').pop();
    return slug || null;
  }

  function medicoDePagina() {
    var h1 = document.querySelector('h1');
    var esp = document.querySelector('.medico-especialidad');
    return {
      id_medico: perfilActual(),
      nombre: txt(h1),
      especialidad: txt(esp)
    };
  }

  function medicoDeTarjeta(el) {
    var card = el.closest('a[href*="/medicos/"]');
    if (!card) return null;
    var h3 = card.querySelector('h3');
    var esp = card.querySelector('p.text-sm');
    var iconos = card.querySelectorAll('i.fa-location-dot, i.fa-graduation-cap, i.fa-star');
    var ubicacion = null;
    iconos.forEach(function (i) {
      if (i.classList.contains('fa-location-dot') && i.parentElement) {
        ubicacion = (i.parentElement.textContent || '').replace(/\s+/g, ' ').trim();
      }
    });
    return {
      id_medico: idMedicoDeTarjeta(el),
      nombre: txt(h3),
      especialidad: esp ? (esp.textContent || '').replace(/\s+/g, ' ').trim() : null,
      ubicacion: ubicacion
    };
  }

  function sesionId() {
    try {
      var s = localStorage.getItem('mp_clics_sesion');
      if (!s) {
        s = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
        localStorage.setItem('mp_clics_sesion', s);
      }
      return s;
    } catch (e) { return 'sin-sesion'; }
  }

  /* ------------------------------------------------------------------ */
  /* Clasificación del click                                             */
  /* ------------------------------------------------------------------ */

  function clasificar(target) {
    var card = target.closest('a[href*="/medicos/"]');
    if (card) {
      return { tipo: 'tarjeta_medico', origen: 'red_medica', datos: medicoDeTarjeta(target) };
    }

    var btn = target.closest('button, a[role="button"]');
    if (btn) {
      var texto = (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      var clases = String(btn.className || '');

      if (clases.indexOf('btn-wa') > -1 || texto.indexOf('abrir whatsapp') > -1 || texto.indexOf('haz clic aquí') > -1) {
        return { tipo: 'whatsapp_abrir', origen: 'perfil_modal', datos: medicoDePagina() };
      }
      if (clases.indexOf('btn-agendar') > -1 || texto.indexOf('agendar cita por whatsapp') > -1) {
        return { tipo: 'perfil_whatsapp', origen: 'perfil', datos: medicoDePagina() };
      }
      if (texto.indexOf('agendar cita') > -1) {
        return { tipo: 'ver_perfil', origen: 'listado', datos: medicoDeTarjeta(btn) || medicoDePagina() };
      }
    }

    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Envío                                                               */
  /* ------------------------------------------------------------------ */

  function guardarLocal(evento) {
    try {
      var arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      arr.unshift(evento);
      localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 100)));
    } catch (e) {}
  }

  function enviar(evento) {
    try {
      var body = JSON.stringify(evento);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API, new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Panel de depuración                                                 */
  /* ------------------------------------------------------------------ */

  function panel() {
    var box = document.createElement('div');
    box.className = 'mp-clics-panel';
    box.style.cssText =
      'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:330px;' +
      'max-height:46vh;display:flex;flex-direction:column;background:#0f172a;color:#e2e8f0;' +
      'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace';
    box.innerHTML =
      '<div style="padding:8px 10px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center">' +
      '<strong style="color:#38bdf8">MP-CLICS</strong>' +
      '<span><button data-act="reset" style="all:unset;cursor:pointer;color:#f87171">limpiar</button>' +
      ' &middot; <button data-act="close" style="all:unset;cursor:pointer;color:#94a3b8">x</button></span></div>' +
      '<div class="mp-clics-body" style="overflow:auto;padding:8px 10px"></div>';

    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'reset') window.MPClics.reset();
      if (act === 'close') box.remove();
    });
    return box;
  }

  function pintar(evento) {
    if (!window.MPClics._panel) return;
    var body = window.MPClics._panel.querySelector('.mp-clics-body');
    var d = evento.datos || {};
    var line = document.createElement('div');
    line.style.cssText = 'padding:6px 0;border-bottom:1px solid #1e293b';
    line.innerHTML =
      '<span style="color:#4ade80">● ' + evento.tipo + '</span> ' +
      '<span style="color:#64748b">' + evento.hora_local + '</span><br>' +
      '<span style="color:#94a3b8">' + (d.nombre || '-') + '</span><br>' +
      '<span style="color:#475569">' + (d.id_medico || '-') + '</span>';
    body.insertBefore(line, body.firstChild);
  }

  /* ------------------------------------------------------------------ */
  /* Listener principal                                                  */
  /* ------------------------------------------------------------------ */

  function registrar(target) {
    var hit = clasificar(target);
    if (!hit) return;

    var pag = new URLSearchParams(location.search);
    var evento = {
      tipo: hit.tipo,
      origen: hit.origen,
      id_medico: (hit.datos && hit.datos.id_medico) || null,
      medico_nombre: (hit.datos && hit.datos.nombre) || null,
      especialidad: (hit.datos && hit.datos.especialidad) || null,
      ubicacion: (hit.datos && hit.datos.ubicacion) || null,
      pagina: location.pathname,
      referrer: document.referrer || null,
      sesion_id: sesionId(),
      utm_source: pag.get('utm_source'),
      utm_medium: pag.get('utm_medium'),
      utm_campaign: pag.get('utm_campaign'),
      user_agent: navigator.userAgent,
      hora_local: new Date().toLocaleTimeString('es-MX'),
      created_at: new Date().toISOString()
    };

    window.MPClics.eventos.push(evento);
    guardarLocal(evento);
    enviar(evento);
    console.log('[MP-CLICS]', evento);
    pintar(evento);
  }

  function onClick(e) {
    try { registrar(e.target); } catch (err) { console.warn('[MP-CLICS]', err); }
  }

  function init() {
    if (window.MPClics.debug) {
      window.MPClics._panel = panel();
      console.log('[MP-CLICS] depuracion activa. window.MPClics.reset() para limpiar.');
    }
    document.addEventListener('click', onClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
