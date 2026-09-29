/**
 * MediProtect Cita Landingsite v1 — Captura de botón "Agendar Cita por WhatsApp"
 * Uso: <script src="https://app.mediprotect.com.mx/landing-agendar.js" defer></script>
 *
 * En la landing (www.mediprotect.com.mx) intercepta el click del botón de
 * "Agendar Cita por WhatsApp" en la tarjeta del médico o en el perfil y
 * construye el enlace al CRM:
 *
 *   https://app.mediprotect.com.mx/agendar-cita?doctor={nombre_completo_urlencoded}
 *
 * El nombre se toma en este orden:
 *   1. data-doctor     -> atributo data en el botón/tarjeta
 *   2. h3 de la tarjeta-> nombre completo en la card
 *   3. h1 de la página -> perfil del médico
 *   4. document.title  -> primer segmento del título
 *
 * El nombre se urlencodea con '+' para espacios (ej: Dr.+Erasmo+Aaron+Vega+Osorio).
 * No se envía el id del médico: el CRM busca por nombre.
 */
(function () {
  'use strict';

  if (window.__MP_LANDING_AGENDAR__) return;
  window.__MP_LANDING_AGENDAR__ = true;

  var APP_BASE = 'https://app.mediprotect.com.mx';
  var TEXTO_BOTON = /agendar\s*cita|agendar\s*por\s*whatsapp|contactar\s*por\s*whatsapp/i;
  var SELECTOR_BOTON =
    'a.btn-agendar, a.btn-whatsapp, a[data-landingsite-whatsapp-cita], ' +
    'button.btn-agendar, button.btn-whatsapp, [class*="btn-whatsapp"], [class*="btn-agendar"]';

  function esBotonAgendar(el) {
    if (!el) return false;
    var texto = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return TEXTO_BOTON.test(texto) || !!el.querySelector('[class*="whatsapp"]');
  }

  function nombreDeTarjeta(card) {
    var h3 = card.querySelector('h3');
    if (h3 && h3.textContent.trim()) return h3.textContent.trim();
    var strong = card.querySelector('strong');
    if (strong && strong.textContent.trim()) return strong.textContent.trim();
    return null;
  }

  function nombreDePagina() {
    var h1 = document.querySelector('h1');
    if (h1) {
      var t = h1.textContent.trim();
      if (t && t.length > 3) return t;
    }
    var m = document.title.match(/^([\w\s.,áéíóúñÁÉÍÓÚÑ-]+)/);
    return m ? m[1].replace(/\s*[-|].*/, '').trim() : null;
  }

  function obtenerNombreMedico(trigger) {
    // 1. Atributo data-doctor en el propio botón o en la tarjeta contenedora
    var dataDoctor = trigger.getAttribute('data-doctor')
      || (trigger.closest('[data-doctor]') && trigger.closest('[data-doctor]').getAttribute('data-doctor'));
    if (dataDoctor && dataDoctor.trim()) return dataDoctor.trim();

    // 2. h3 dentro de la tarjeta (resultados de búsqueda)
    var card = trigger.closest('.card-medico, .medico-card, [class*="card-medico"], [class*="result-card"]');
    if (!card) {
      // Listado genérico: buscar el ancestro "a" que contiene el h3
      card = trigger.closest('a[href]') || trigger;
      var h3 = card.querySelector('h3');
      if (h3) return h3.textContent.trim();
    } else {
      var nombreTarjeta = nombreDeTarjeta(card);
      if (nombreTarjeta) return nombreTarjeta;
    }

    // 3. Perfil del médico (h1)
    var nombrePagina = nombreDePagina();
    if (nombrePagina) return nombrePagina;

    return null;
  }

  function construirEnlace(nombre) {
    var encoded = nombre.split(/\s+/).map(function (p) { return encodeURIComponent(p); }).join('+');
    return APP_BASE + '/agendar-cita?doctor=' + encoded;
  }

  function atributosTrack(evento, nombre) {
    return [
      'data-landing-track="agendar_cita"',
      'data-landing-doctor="' + (nombre || '').replace(/"/g, '&quot;') + '"',
      'data-landing-href="' + construirEnlace(nombre || '').replace(/"/g, '&quot;') + '"',
      'data-landing-at="' + new Date().toISOString() + '"',
    ].join(' ');
  }

  function manejarClick(e) {
    // Solo clicks izquierdos sin tecla modificadora
    if (e.button && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var btn = e.target.closest(SELECTOR_BOTON);
    if (!btn || !esBotonAgendar(btn)) return;

    var nombre = obtenerNombreMedico(e.target.closest(SELECTOR_BOTON) || e.target);
    var enlace = construirEnlace(nombre || '');

    // Registrar el evento (útil para pruebas)
    var infoTrack = atributosTrack(e, nombre);

    if (nombre) {
      console.log('[LANDING-AGENDAR]', infoTrack);
      e.preventDefault();
      e.stopPropagation();
      window.open(enlace, '_blank');
    }
    // Si no se pudo identificar al médico, se deja el enlace original (no bloquear)
  }

  function init() {
    document.addEventListener('click', manejarClick, true);

    // Marcar visualmente los botones capturados (solo en modo debug)
    if (/[?&]mp_debug=1/.test(location.search)) {
      document.querySelectorAll(SELECTOR_BOTON).forEach(function (b) {
        if (esBotonAgendar(b)) {
          b.style.outline = '2px dashed #25D366';
          b.title = 'MediProtect: capturado por landing-agendar.js';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();