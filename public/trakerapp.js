/**
 * MediProtect WhatsApp Cita Tracker v2
 * Uso: <script src="https://app.mediprotect.com.mx/trakerapp.js"></script>
 *
 * Intercepts all WhatsApp "Agendar Cita" buttons on landing pages.
 * On doctor profile pages: extracts name from <h1> and builds personalized message.
 * On doctor listing cards: extracts name, specialty, and location from the card.
 */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '529902447171';
  var WA_REGEX = /wa\.me\/529902447171/;

  function getDoctorNameFromPage() {
    var h1 = document.querySelector('h1');
    if (h1) {
      var text = h1.textContent.trim();
      if (text && text.length > 3) return text;
    }
    var titleTag = document.title;
    var match = titleTag.match(/^([\w\s.,áéíóúñ]+)/i);
    return match ? match[1].replace(/\s*[-|].*/, '').trim() : '';
  }

  function getDoctorInfoFromCard(card) {
    var nameEl = card.querySelector('h3');
    var name = nameEl ? nameEl.textContent.trim() : '';

    var specialtyEl = card.querySelector('p.text-\\[var\\(--primary-color\\)\\]') || card.querySelector('p[class*="primary-color"]');
    var specialty = specialtyEl ? specialtyEl.textContent.trim() : '';

    var locationEl = card.querySelector('p i.fa-location-dot');
    var location = '';
    if (locationEl && locationEl.parentElement) {
      location = locationEl.parentElement.textContent.trim();
    }

    return { name: name, specialty: specialty, location: location };
  }

  function buildMessage(info) {
    var name = info.name || '';
    var specialty = info.specialty || '';
    var location = info.location || '';

    var msg = 'Hola';
    if (name) {
      msg += ', solicito una cita con ' + name;
    }
    if (specialty) {
      msg += '\nEspecialidad: ' + specialty;
    }
    if (location) {
      msg += '\nUbicación: ' + location;
    }
    msg += '\n\n¿Podrían confirmarme disponibilidad?';
    return msg;
  }

  function isProfilePage() {
    return !!document.querySelector('a[href*="wa.me"][target="_blank"].bg-green-600, a[href*="wa.me"][target="_blank"].bg-white');
  }

  function isListingCard(el) {
    return !!el.closest('.bg-white.rounded-2xl, [class*="rounded-2xl"], [class*="rounded-xl"]');
  }

  function handleCitaClick(e) {
    var btn;

    btn = e.target.closest('a[data-landingsite-whatsapp-cita]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      var info = getDoctorInfoFromCard(btn);
      if (info.name) {
        window.open(buildWhatsAppUrl(info), '_blank');
      } else {
        window.open('https://wa.me/' + WHATSAPP_NUMBER, '_blank');
      }
      return;
    }

    btn = e.target.closest('a[href*="wa.me"]');
    if (btn && WA_REGEX.test(btn.href) && (btn.textContent.includes('Agendar') || btn.textContent.includes('Cita') || btn.textContent.includes('Enviar mensaje') || btn.classList.contains('bg-green-600'))) {
      e.preventDefault();
      e.stopPropagation();

      var doctorName = getDoctorNameFromPage();
      if (doctorName) {
        window.open(buildWhatsAppUrl({ name: doctorName }), '_blank');
      } else {
        window.open(btn.href, '_blank');
      }
      return;
    }
  }

  function buildWhatsAppUrl(info) {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildMessage(info));
  }

  function attachListeners() {
    document.addEventListener('click', handleCitaClick, true);

    document.querySelectorAll('a[data-landingsite-whatsapp-cita]').forEach(function (btn) {
      btn.style.cursor = 'pointer';
    });
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachListeners);
    } else {
      attachListeners();
    }
  }

  init();
})();
