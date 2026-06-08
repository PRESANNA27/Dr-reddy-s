/* ══════════════════════════════════════════════════════════
   DR. REDDY'S — PERFORMANCE PATCH v1 (JS)
   Fixes: scroll jank, IO memory leak, touch flicker,
          FAQ reflow, image CLS, modal GPU priming
   DO NOT EDIT — generated patch file
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────── */
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var isMobile = window.innerWidth <= 768 || isTouch;

  /* ── 1. Wrap FAQ answers for grid-template-rows trick ───
     The CSS patch uses display:grid on .faq-answer so the
     0fr→1fr animation works. This requires a direct child
     element with overflow:hidden. We inject .faq-inner.    */
  function wrapFaqAnswers(root) {
    root = root || document;
    root.querySelectorAll('.faq-answer').forEach(function (el) {
      if (el.querySelector('.faq-inner')) return; // already wrapped
      var inner = document.createElement('div');
      inner.className = 'faq-inner';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
    });
  }

  /* ── 2. Patch openModal: wrap FAQ + prime GPU layer ───── */
  function patchOpenModal() {
    var orig = window.openModal;
    if (!orig || orig._perf_patched) return;
    window.openModal = function (serviceKey) {
      orig(serviceKey);
      var modal = document.getElementById('serviceModal');
      if (modal) wrapFaqAnswers(modal);
      // Prime GPU layer so transition doesn't flash
      var box = document.getElementById('modalBox');
      if (box) {
        box.style.willChange = 'transform, opacity';
        setTimeout(function () { if (box) box.style.willChange = 'auto'; }, 450);
      }
    };
    window.openModal._perf_patched = true;
  }

  /* ── 3. Patch openDoctorProfile: wrap FAQ + prime GPU ── */
  function patchOpenDoctorProfile() {
    var orig = window.openDoctorProfile;
    if (!orig || orig._perf_patched) return;
    window.openDoctorProfile = function (key) {
      orig(key);
      var overlay = document.querySelector('.doctor-profile-overlay');
      if (overlay) wrapFaqAnswers(overlay);
      var box = document.querySelector('.doctor-profile-box');
      if (box) {
        box.style.willChange = 'transform';
        setTimeout(function () { if (box) box.style.willChange = 'auto'; }, 450);
      }
    };
    window.openDoctorProfile._perf_patched = true;
  }

  /* ── 4. Lazy-image smooth fade-in (prevents sudden pop) ─ */
  function applyImageFadeIn() {
    document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) return; // already loaded
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.35s ease';
      img.addEventListener('load', function () {
        img.style.opacity = '';
        // Remove inline transition after it fires once so CSS controls it
        setTimeout(function () { img.style.transition = ''; }, 400);
      }, { once: true, passive: true });
      img.addEventListener('error', function () {
        img.style.opacity = '1';
        img.style.transition = '';
      }, { once: true, passive: true });
    });
  }

  /* ── 5. Remove tap highlight on touch targets ─────────── */
  function applyTouchOptimizations() {
    if (!isTouch) return;
    var sel = [
      '.service-card', '.service-pill', '.doctor-card',
      '.why-card', '.consultant-card', '.btn-primary',
      '.btn-secondary', '.btn-emergency', '.service-card-btn',
      '.gallery-item', '.gallery-tab', '.faq-question',
      '.service-pill', '.mode-switcher-btn', '.float-mode-btn'
    ].join(', ');
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.webkitTapHighlightColor = 'transparent';
    });
  }

  /* ── 6. Release will-change after animations complete ─── */
  function bindWillChangeRelease() {
    document.addEventListener('transitionend', function (e) {
      var el = e.target;
      if (!el || !el.classList) return;
      if (el.classList.contains('fade-up') && el.classList.contains('visible')) {
        el.style.willChange = 'auto';
      }
    }, { passive: true });
  }

  /* ── 7. Passive touchmove on overlay backdrops ─────────
     Prevents background page scroll bleeding through modal
     on iOS Safari (body position:fixed doesn't always work). */
  function bindOverlayTouchBlock() {
    ['serviceModal', 'ap-overlay'].forEach(function (id) {
      var overlay = document.getElementById(id);
      if (!overlay) return;
      overlay.addEventListener('touchmove', function (e) {
        // Allow scroll only inside the scrollable card/box
        var scrollable = overlay.querySelector('.modal-box, #ap-card, .doctor-profile-box');
        if (scrollable && scrollable.contains(e.target)) return;
        e.preventDefault();
      }, { passive: false });
    });
  }

  /* ── 8. Disable click delay on touch ──────────────────── */
  function removeTouchDelay() {
    if (!isTouch) return;
    // touch-action: manipulation removes 300ms tap delay
    var clickables = document.querySelectorAll(
      'button, a, .service-card, .service-pill, ' +
      '.doctor-card, .consultant-card, .gallery-tab, ' +
      '.faq-question, .why-card, .mode-switcher-btn'
    );
    clickables.forEach(function (el) {
      el.style.touchAction = 'manipulation';
    });
  }

  /* ── 9. Main init ────────────────────────────────────── */
  function init() {
    wrapFaqAnswers();
    patchOpenModal();
    patchOpenDoctorProfile();
    applyImageFadeIn();
    applyTouchOptimizations();
    bindWillChangeRelease();
    bindOverlayTouchBlock();
    removeTouchDelay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
