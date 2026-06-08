/* ══════════════════════════════════════════════════════════
   DR. REDDY'S — PERFORMANCE PATCH v1 + CLOSE-BUTTON FIX
   Fixes: scroll jank, IO memory leak, touch flicker,
          FAQ reflow, image CLS, modal GPU priming,
          service modal close button on iOS/Android
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  /* ── 1. Wrap FAQ answers for CSS grid accordion trick ───
     perf-patch.css uses display:grid + grid-template-rows:0fr/1fr
     on .faq-answer. This requires a direct child with overflow:hidden.
     We inject .faq-inner as that wrapper.                   */
  function wrapFaqAnswers(root) {
    (root || document).querySelectorAll('.faq-answer').forEach(function (el) {
      if (el.querySelector('.faq-inner')) return;
      var inner = document.createElement('div');
      inner.className = 'faq-inner';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
    });
  }

  /* ── 2. Direct touchend fallback on service modal close ──
     Defense-in-depth against the iOS Safari / Android Chrome
     hit-test bug: even if the synthesised click is swallowed
     by a compositor layer quirk, touchend fires directly.
     Uses touchend (not touchstart) so a scroll doesn't fire it.
     stopPropagation prevents overlay's closeModalOnOverlay.
     preventDefault stops the 300ms synthetic click double-fire. */
  function bindModalCloseTouch() {
    var closeBtn = document.querySelector('#serviceModal .modal-close');
    if (!closeBtn || closeBtn._perf_touch_bound) return;
    closeBtn.addEventListener('touchend', function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (window.closeModal) window.closeModal();
    }, { passive: false });
    closeBtn._perf_touch_bound = true;
  }

  /* ── 3. Patch openModal: FAQ wrap + GPU prime + close fix  */
  function patchOpenModal() {
    var orig = window.openModal;
    if (!orig || orig._perf_patched) return;
    window.openModal = function (serviceKey) {
      orig(serviceKey);
      /* Wrap dynamically-injected FAQ answers */
      var modal = document.getElementById('serviceModal');
      if (modal) wrapFaqAnswers(modal);
      /* Prime will-change for 450ms during entry animation,
         then clear. Static will-change on overflow-y:auto breaks
         position:sticky touch hit-testing on iOS Safari. */
      var box = document.getElementById('modalBox');
      if (box) {
        box.style.willChange = 'transform, opacity';
        setTimeout(function () { if (box) box.style.willChange = 'auto'; }, 450);
      }
      /* Ensure close button touch handler is bound */
      bindModalCloseTouch();
    };
    window.openModal._perf_patched = true;
  }

  /* ── 4. Patch openDoctorProfile: FAQ wrap + GPU prime ─── */
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

  /* ── 5. Lazy-image smooth fade-in (prevents sudden pop) ─ */
  function applyImageFadeIn() {
    document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) return;
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.35s ease';
      img.addEventListener('load', function () {
        img.style.opacity = '';
        setTimeout(function () { img.style.transition = ''; }, 400);
      }, { once: true, passive: true });
      img.addEventListener('error', function () {
        img.style.opacity = '1';
        img.style.transition = '';
      }, { once: true, passive: true });
    });
  }

  /* ── 6. Remove tap highlight on touch targets ─────────── */
  function applyTouchOptimizations() {
    if (!isTouch) return;
    var sel = '.service-card, .service-pill, .doctor-card, .why-card, ' +
              '.consultant-card, .btn-primary, .btn-secondary, .btn-emergency, ' +
              '.service-card-btn, .gallery-item, .gallery-tab, .faq-question, ' +
              '.mode-switcher-btn, .float-mode-btn';
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.webkitTapHighlightColor = 'transparent';
    });
  }

  /* ── 7. Release will-change after fade-up completes ───── */
  function bindWillChangeRelease() {
    document.addEventListener('transitionend', function (e) {
      var el = e.target;
      if (el && el.classList &&
          el.classList.contains('fade-up') &&
          el.classList.contains('visible')) {
        el.style.willChange = 'auto';
      }
    }, { passive: true });
  }

  /* ── 8. Touchmove block on #ap-overlay backdrop only ────
     #serviceModal is intentionally excluded — adding passive:false
     touchmove there caused subtle event interference on Android
     Chrome. The body position:fixed scroll-lock handles iOS bleed. */
  function bindOverlayTouchBlock() {
    var apOverlay = document.getElementById('ap-overlay');
    if (!apOverlay) return;
    apOverlay.addEventListener('touchmove', function (e) {
      var card = document.getElementById('ap-card');
      if (card && card.contains(e.target)) return;
      e.preventDefault();
    }, { passive: false });
  }

  /* ── 9. touch-action: manipulation removes 300ms tap delay */
  function removeTouchDelay() {
    if (!isTouch) return;
    var sel = 'button, a, .service-card, .service-pill, .doctor-card, ' +
              '.consultant-card, .gallery-tab, .faq-question, ' +
              '.why-card, .mode-switcher-btn';
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.touchAction = 'manipulation';
    });
  }

  /* ── 10. Main init ───────────────────────────────────── */
  function init() {
    wrapFaqAnswers();
    patchOpenModal();
    patchOpenDoctorProfile();
    applyImageFadeIn();
    applyTouchOptimizations();
    bindWillChangeRelease();
    bindOverlayTouchBlock();
    removeTouchDelay();
    bindModalCloseTouch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
