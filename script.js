/* Enhancements:
   - Stacked-record scroll effect for case studies
   - Case study records: whole card navigates (nested links unchanged)
   - Reveal on scroll for sections, catalogue, and every article.csd case study
   - Header style on scroll
   - SPA-style navigation so the Spotify embed keeps playing across internal pages
*/

/* Injected once: panel opens mounts the Embed via Spotify iFrame API (playback state for the FAB chip). */
const SPOTIFY_FAB_HTML = `
  <div class="spotify-fab" id="spotify-fab">
    <div class="spotify-fab__panel" id="spotify-fab-panel" role="region" aria-label="Spotify playlist player" aria-hidden="true">
      <div class="spotify-fab__panel-head">
        <span class="spotify-fab__panel-title">Now spinning</span>
        <button type="button" class="spotify-fab__panel-close" aria-label="Close playlist">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="spotify-fab__embed">
        <div id="spotify-fab-embed-root" class="spotify-fab__embed-root" data-spotify-uri="spotify:playlist:145DhPn9Z7D2cnNkggKWZx"></div>
      </div>
    </div>
    <button type="button" class="spotify-fab__trigger" id="spotify-fab-trigger" aria-expanded="false" aria-controls="spotify-fab-panel" title="Open Spotify playlist player">
      <span class="spotify-fab__art" aria-hidden="true">
        <svg class="spotify-fab__turntable" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
          <rect x="3" y="13" width="42" height="29" rx="4" fill="#241C15" stroke="#3D3228" stroke-width="1"/>
          <rect x="6" y="16" width="36" height="23" rx="2" fill="#1B140E" opacity="0.85"/>
          <circle cx="21" cy="27.5" r="11.5" fill="#14110E" stroke="#4A3C30" stroke-width="0.75"/>
          <circle cx="21" cy="27.5" r="8.5" stroke="#E9A05B" stroke-opacity="0.28" stroke-width="0.5"/>
          <circle cx="21" cy="27.5" r="5.5" stroke="#8A7A66" stroke-opacity="0.35" stroke-width="0.35"/>
          <circle cx="21" cy="27.5" r="2" fill="#C9BEAB"/>
          <circle cx="36" cy="19" r="2.8" fill="#5C5145" stroke="#8A7A66" stroke-width="0.35"/>
          <path d="M35.6 18.8L23.2 31.2" stroke="#C9BEAB" stroke-width="1.25" stroke-linecap="round"/>
          <circle cx="23.2" cy="31.2" r="1.15" fill="#D67B3D"/>
        </svg>
      </span>
      <span class="spotify-fab__play-ring" aria-hidden="true">
        <svg class="spotify-fab__play" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
          <path fill="currentColor" d="M8 5v14l11-7L8 5z"/>
        </svg>
        <svg class="spotify-fab__pause" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
          <path fill="currentColor" d="M5 4h5v16H5V4zm9 0h5v16h-5V4z"/>
        </svg>
      </span>
    </button>
  </div>
`;

function mountSpotifyFab() {
  if (document.getElementById('spotify-fab')) return;
  const toast = document.getElementById('email-toast');
  const tpl = document.createElement('template');
  tpl.innerHTML = SPOTIFY_FAB_HTML.trim();
  const fab      = tpl.content.firstElementChild;
  const curScr   = document.currentScript;
  if (toast && toast.parentNode) toast.parentNode.insertBefore(fab, toast);
  else if (curScr && curScr.parentNode) curScr.parentNode.insertBefore(fab, curScr);
  else document.body.appendChild(fab);
}

(() => {
  /* GitHub project pages 301 to /repo/, but the address bar can briefly stay /repo.
     That breaks relative resolution (e.g. gwi.html → /gwi.html). Match the canonical URL. */
  try {
    if (location.protocol !== 'file:' && location.hostname.endsWith('github.io')) {
      const p = location.pathname;
      if (!p.endsWith('/') && !/\.html$/i.test(p)) {
        const segs = p.split('/').filter(Boolean);
        if (segs.length === 1) {
          history.replaceState(history.state || {}, '', `${p}/${location.search}${location.hash}`);
        }
      }
    }
  } catch {
    /* ignore */
  }

  mountSpotifyFab();

  let recordStackCleanup = () => {};
  let flipImagesCleanup  = () => {};
  let fosHotspotCleanup  = () => {};
  let aiSleeveCleanup    = () => {};
  let pivotDropCleanup  = () => {};
  let pinsFlowCleanup   = () => {};
  let revealObserver     = null;
  /** Clears flaky IntersectionObserver “stuck invisible” fallback. */
  let revealSafetyTimerId = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

  /** Incremented whenever a newer in-app navigation starts; stale async completions must not swap DOM. */
  let spaNavGeneration = 0;

  function teardownDynamicPage() {
    recordStackCleanup();
    recordStackCleanup = () => {};
    flipImagesCleanup();
    flipImagesCleanup = () => {};
    fosHotspotCleanup();
    fosHotspotCleanup = () => {};
    aiSleeveCleanup();
    aiSleeveCleanup = () => {};
    pivotDropCleanup();
    pivotDropCleanup = () => {};
    pinsFlowCleanup();
    pinsFlowCleanup = () => {};
    if (revealSafetyTimerId !== null) {
      clearTimeout(revealSafetyTimerId);
      revealSafetyTimerId = null;
    }
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
  }

  /** Expand/collapse summaries on ai-explorations.html CD sleeves */
  function initAISleeves() {
    const main = document.getElementById('spa-main');
    if (!main) return () => {};

    function prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function clearSleeveFlipTimers(btn) {
      if (btn._aiFlipTimer) {
        clearTimeout(btn._aiFlipTimer);
        btn._aiFlipTimer = null;
      }
    }

    function sleeveCoverVideoHasPlayableSrc(video) {
      if (!video || video.tagName !== 'VIDEO') return false;
      const vsrc = video.getAttribute('src');
      if (vsrc && vsrc.trim() !== '') return true;
      return [...video.querySelectorAll('source')].some(s => {
        const hs = s.getAttribute('src');
        return !!(hs && hs.trim() !== '');
      });
    }

    function kickSleeveCoverVideos(panel, play) {
      if (!panel) return;
      panel.querySelectorAll('video.cd-sleeve__cover-video').forEach(v => {
        if (!sleeveCoverVideoHasPlayableSrc(v)) return;
        if (play) v.play().catch(() => {});
        else v.pause();
      });
    }

    function stashIframeEmbedSrc(ifr) {
      if (ifr.dataset.embedSrc) return;
      const cur = ifr.getAttribute('src');
      if (cur && cur.trim() !== '' && cur !== 'about:blank') ifr.dataset.embedSrc = cur;
    }

    function blankIframeEmbed(ifr) {
      stashIframeEmbedSrc(ifr);
      if (ifr.dataset.embedSrc && ifr.getAttribute('src') !== 'about:blank') {
        ifr.setAttribute('src', 'about:blank');
      }
    }

    function pauseAllMediaStripEmbedsInPanel(panel) {
      if (!panel) return;
      panel.querySelectorAll('.cd-sleeve__media-strip iframe.cd-sleeve__cover-embed').forEach(blankIframeEmbed);
    }

    function syncMediaStripEmbedsInPanel(panel) {
      if (!panel) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.querySelectorAll('.cd-sleeve__media-strip').forEach((s) => {
            s._aiSyncCoverEmbeds?.();
            s._aiSyncStripChrome?.();
          });
        });
      });
    }

    const aiRack = main.querySelector('.cd-rack.cd-rack--ai-row');
    let aiDockRaf = 0;

    const stripNavCleanups = [];

    /**
     * Multi-pane Polaroid rails: iframe embeds swallow horizontal gestures. Add Prev/Next
     * controls and keyboard support so users can reliably move between clips.
     */
    function initAISleeveStripNavigation() {
      if (!aiRack) return;
      aiRack.querySelectorAll('.cd-sleeve__media-strip').forEach((strip) => {
        const wrap = strip.parentElement;
        if (!wrap || !wrap.classList.contains('cd-sleeve__cover-wrap')) return;

        const panes = strip.querySelectorAll(':scope > .cd-sleeve__media-pane');
        if (panes.length < 2) return;
        if (strip.nextElementSibling?.classList?.contains('cd-sleeve__strip-nav')) return;

        const reduced = prefersReducedMotion();

        function clampIndex(next) {
          return Math.max(0, Math.min(panes.length - 1, next));
        }

        function stripPanelVisible() {
          const panelEl = strip.closest('.cd-sleeve__panel');
          return !!(panelEl && !panelEl.hidden);
        }

        /**
         * Geometry-based indexing breaks while the sleeve panel is `hidden` (degenerate rects)
         * and can label the first slide as last. Prefer scroll offsets + pane stride; fall back
         * to largest visible overlap in the viewport.
         */
        function currentPaneIndex() {
          if (!stripPanelVisible() || panes.length === 0) return 0;

          const sr = strip.getBoundingClientRect();
          const cw = strip.clientWidth;

          const step =
            panes.length > 1 && cw > 0
              ? panes[1].offsetLeft - panes[0].offsetLeft
              : cw > 0
                ? cw
                : 0;

          if (step > 0) {
            const fromScroll = Math.round(strip.scrollLeft / step);
            if (!Number.isNaN(fromScroll)) return clampIndex(fromScroll);
          }

          let best = 0;
          let bestVis = -1;
          for (let i = 0; i < panes.length; i++) {
            const pr = panes[i].getBoundingClientRect();
            const vis =
              sr.width <= 0
                ? pr.width > 0
                  ? pr.width
                  : 0
                : Math.max(
                    0,
                    Math.min(pr.right, sr.right) - Math.max(pr.left, sr.left),
                  );
            if (vis > bestVis) {
              bestVis = vis;
              best = i;
            }
          }
          return best;
        }

        function go(direction) {
          const i = clampIndex(currentPaneIndex() + direction);
          panes[i].scrollIntoView({
            behavior: reduced ? 'auto' : 'smooth',
            inline: 'start',
            block: 'nearest',
          });
        }

        function syncChrome() {
          const i = currentPaneIndex();
          prevBtn.disabled = i <= 0;
          nextBtn.disabled = i >= panes.length - 1;
          statusEl.textContent = `${i + 1} / ${panes.length}`;
        }

        function syncStripCoverEmbeds(activeIndex) {
          panes.forEach((pane, idx) => {
            pane.querySelectorAll('iframe.cd-sleeve__cover-embed').forEach((ifr) => {
              stashIframeEmbedSrc(ifr);
              const wanted = ifr.dataset.embedSrc;
              if (!wanted) return;
              if (idx === activeIndex) {
                if (ifr.getAttribute('src') !== wanted) ifr.setAttribute('src', wanted);
              } else if (ifr.getAttribute('src') !== 'about:blank') {
                ifr.setAttribute('src', 'about:blank');
              }
            });
          });
        }

        strip._aiSyncCoverEmbeds = () => {
          if (!stripPanelVisible()) {
            syncStripCoverEmbeds(0);
            return;
          }
          syncStripCoverEmbeds(currentPaneIndex());
        };

        const nav = document.createElement('div');
        nav.className = 'cd-sleeve__strip-nav';
        nav.setAttribute('role', 'toolbar');
        nav.setAttribute('aria-label', 'Browse media in this strip');

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'cd-sleeve__strip-nav__btn cd-sleeve__strip-nav__btn--prev';
        prevBtn.setAttribute('aria-label', 'Previous clip');
        prevBtn.innerHTML = '<span aria-hidden="true">\u2190</span>';

        const statusEl = document.createElement('span');
        statusEl.className = 'cd-sleeve__strip-nav__status';

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'cd-sleeve__strip-nav__btn cd-sleeve__strip-nav__btn--next';
        nextBtn.setAttribute('aria-label', 'Next clip');
        nextBtn.innerHTML = '<span aria-hidden="true">\u2192</span>';

        nav.append(prevBtn, statusEl, nextBtn);
        strip.insertAdjacentElement('afterend', nav);

        const onPrev = () => go(-1);
        const onNext = () => go(1);

        prevBtn.addEventListener('click', onPrev);
        nextBtn.addEventListener('click', onNext);

        let scrollRaf = 0;
        const onStripScroll = () => {
          if (scrollRaf) cancelAnimationFrame(scrollRaf);
          scrollRaf = requestAnimationFrame(() => {
            scrollRaf = 0;
            syncChrome();
            if (stripPanelVisible()) syncStripCoverEmbeds(currentPaneIndex());
          });
        };

        strip.addEventListener('scroll', onStripScroll, { passive: true });

        function onStripKeydown(e) {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(-1);
          }
        }

        strip.addEventListener('keydown', onStripKeydown);

        strip._aiSyncStripChrome = syncChrome;

        syncChrome();
        strip._aiSyncCoverEmbeds();
        stripNavCleanups.push(() => {
          prevBtn.removeEventListener('click', onPrev);
          nextBtn.removeEventListener('click', onNext);
          strip.removeEventListener('keydown', onStripKeydown);
          strip.removeEventListener('scroll', onStripScroll, { passive: true });
          delete strip._aiSyncCoverEmbeds;
          delete strip._aiSyncStripChrome;
          nav.remove();
        });
      });
    }

    initAISleeveStripNavigation();

    /** AI row: clear legacy inline panel metrics (layout is flex in CSS) */
    function alignAiExploreDockedPanel() {
      if (!aiRack) return;
      cancelAnimationFrame(aiDockRaf);
      aiDockRaf = requestAnimationFrame(() => {
        aiDockRaf = 0;
        dockAiExplorePanelFrame();
      });
    }

    function dockAiExplorePanelFrame() {
      if (!aiRack) return;

      /* Clear legacy absolute-position vars if present (layout is flex in CSS) */
      aiRack.querySelectorAll('.cd-sleeve__panel').forEach(p => {
        p.style.removeProperty('--ai-panel-left');
        p.style.removeProperty('--ai-panel-width');
        p.style.removeProperty('--ai-panel-top');
      });
    }

    function runSleeveFlipOpen(btn, panel, sleeve, coverVisual) {
      return new Promise((resolve) => {
        const jewel = btn.querySelector('.cd-case__jewel');
        if (!jewel || !coverVisual) {
          resolve();
          return;
        }

        const from = jewel.getBoundingClientRect();
        sleeve.classList.add('cd-sleeve--flip-opening');
        panel.hidden = false;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const to = coverVisual.getBoundingClientRect();
            if (!to.width || !to.height) {
              sleeve.classList.remove('cd-sleeve--flip-opening');
              if (btn.getAttribute('aria-expanded') === 'true') {
                sleeve?.classList.add('cd-sleeve--expanded');
              }
              resolve();
              return;
            }

            const jcx = from.left + from.width / 2;
            const jcy = from.top + from.height / 2;
            const tcx = to.left + to.width / 2;
            const tcy = to.top + to.height / 2;
            const dx = jcx - tcx;
            const dy = jcy - tcy;
            const sx = from.width / to.width;
            const sy = from.height / to.height;

            let animEnded = false;
            const finish = () => {
              if (animEnded) return;
              animEnded = true;
              clearSleeveFlipTimers(btn);
              if (coverVisual._flipEndHandler) {
                coverVisual.removeEventListener('transitionend', coverVisual._flipEndHandler);
                coverVisual._flipEndHandler = null;
              }
              coverVisual.style.transition = '';
              coverVisual.style.transform = '';
              coverVisual.style.opacity = '';
              coverVisual.style.willChange = '';
              sleeve.classList.remove('cd-sleeve--flip-opening');
              resolve();
            };

            coverVisual.style.willChange = 'transform, opacity';
            coverVisual.style.transition = 'none';
            coverVisual.style.opacity = '0';
            coverVisual.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

            requestAnimationFrame(() => {
              coverVisual.style.transition =
                'transform 0.52s cubic-bezier(0.2, 0.82, 0.12, 1), opacity 0.32s ease';
              coverVisual.style.opacity = '1';
              coverVisual.style.transform = 'translate(0, 0) scale(1, 1)';

              function onEnd(e) {
                if (e.propertyName !== 'transform') return;
                coverVisual.removeEventListener('transitionend', onEnd);
                coverVisual._flipEndHandler = null;
                finish();
              }
              coverVisual._flipEndHandler = onEnd;
              coverVisual.addEventListener('transitionend', onEnd);
              btn._aiFlipTimer = setTimeout(finish, 640);
            });
          });
        });
      });
    }

    function setOpen(btn, open, opts = {}) {
      const id = btn.getAttribute('aria-controls');
      if (!id) return Promise.resolve();
      const panel = document.getElementById(id);
      if (!panel) return Promise.resolve();
      const sleeve = panel.closest('.cd-sleeve');
      const coverVisual = panel.querySelector('.cd-sleeve__cover-visual');
      const instant = !!opts.instant;

      /* AI rack: side-by-side layout uses CSS flex; skip FLIP (jewel stays visible) */
      const openDockedAiRackInstantly =
        !instant && aiRack && sleeve && aiRack.contains(sleeve);

      if (!open) {
        clearSleeveFlipTimers(btn);
        if (coverVisual && coverVisual._flipEndHandler) {
          coverVisual.removeEventListener('transitionend', coverVisual._flipEndHandler);
          coverVisual._flipEndHandler = null;
        }
        const jewel = btn.querySelector('.cd-case__jewel');
        if (jewel) {
          jewel.style.removeProperty('transition');
          jewel.style.removeProperty('opacity');
        }
        if (coverVisual) {
          coverVisual.style.transition = '';
          coverVisual.style.transform = '';
          coverVisual.style.opacity = '';
          coverVisual.style.willChange = '';
        }
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('cd-case__toggle--open');
        panel.hidden = true;
        panel.classList.remove('cd-sleeve__panel--open');
        sleeve?.classList.remove('cd-sleeve--expanded', 'cd-sleeve--flip-opening');
        kickSleeveCoverVideos(panel, false);
        pauseAllMediaStripEmbedsInPanel(panel);
        alignAiExploreDockedPanel();
        return Promise.resolve();
      }

      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('cd-case__toggle--open');
      panel.classList.add('cd-sleeve__panel--open');

      if (instant || prefersReducedMotion() || openDockedAiRackInstantly) {
        panel.hidden = false;
        sleeve?.classList.add('cd-sleeve--expanded');
        kickSleeveCoverVideos(panel, true);
        syncMediaStripEmbedsInPanel(panel);
        alignAiExploreDockedPanel();
        return Promise.resolve();
      }

      return runSleeveFlipOpen(btn, panel, sleeve, coverVisual).then(() => {
        if (btn.getAttribute('aria-expanded') === 'true') {
          sleeve?.classList.add('cd-sleeve--expanded');
        }
        kickSleeveCoverVideos(panel, true);
        syncMediaStripEmbedsInPanel(panel);
        alignAiExploreDockedPanel();
      });
    }

    function closeOther(btn) {
      main.querySelectorAll('.cd-case__toggle[aria-expanded="true"]').forEach(other => {
        if (other !== btn) setOpen(other, false, { instant: true });
      });
    }

    function onClick(e) {
      const btn = e.target.closest('.cd-case__toggle');
      if (!btn || !main.contains(btn)) return;
      e.preventDefault();

      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      const id = btn.getAttribute('aria-controls');
      const panel = id ? document.getElementById(id) : null;

      if (!isOpen) {
        closeOther(btn);
        setOpen(btn, true).then(() => {
          panel?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        });
      } else {
        setOpen(btn, false);
      }
    }

    const onAiRackRelayout = () => alignAiExploreDockedPanel();

    main.addEventListener('click', onClick);

    if (aiRack) {
      window.addEventListener('resize', onAiRackRelayout);
    }

    const hash = window.location.hash.slice(1);
    if (hash && hash.startsWith('cd-sleeve')) {
      requestAnimationFrame(() => {
        const row = document.getElementById(hash);
        const innerBtn = row?.querySelector('.cd-case__toggle');
        if (!innerBtn) return;
        closeOther(innerBtn);
        setOpen(innerBtn, true, { instant: true });
      });
    }

    return () => {
      main.removeEventListener('click', onClick);
      window.removeEventListener('resize', onAiRackRelayout);
      cancelAnimationFrame(aiDockRaf);
      stripNavCleanups.splice(0).forEach((fn) => fn());
    };
  }

  function sameOriginForSpa(a, b) {
    if (a.origin === b.origin) return true;
    if (a.protocol === 'file:' && b.protocol === 'file:') return true;
    return false;
  }

  /** Last path segment as a lowercased *.html filename; directory roots become index.html.
   *  Fixes body.page-home and nav state when the URL is "/" (Vercel apex) or …/Record-store-app/ (GitHub Pages).
   */
  function filenameKey(pathname) {
    if (!pathname) return 'index.html';
    const pathOnly = pathname.split('#')[0].replace(/\\/g, '/');
    const noTrail = pathOnly.replace(/\/+$/, '');
    if (!noTrail) return 'index.html';
    const last = noTrail.slice(noTrail.lastIndexOf('/') + 1);
    const key = last.toLowerCase().replace(/;.*/, '');
    if (!key.endsWith('.html')) return 'index.html';
    return key;
  }

  /** Client-side gate for password-protected case study HTML (SPA + full page loads). Not security-grade. */
  const CASE_STUDY_PASSWORD_PAGES = new Set([
    'planning-inspectorate.html',
    'gwi.html',
    'hyundai-finance.html',
    'toyota.html',
    'ba-fo.html',
  ]);

  const CASE_STUDY_AUTH_KEY = 'zenaCsAuth2026';
  const CASE_STUDY_PASSWORD = 'zena2026';

  function applyCaseStudyPasswordGate(resolvedHref) {
    let key = '';
    try {
      key = filenameKey(new URL(resolvedHref, document.baseURI).pathname);
    } catch {
      key = '';
    }
    const needs = CASE_STUDY_PASSWORD_PAGES.has(key);

    let authed = false;
    try {
      authed = sessionStorage.getItem(CASE_STUDY_AUTH_KEY) === '1';
    } catch {
      authed = false;
    }

    let root = document.getElementById('case-study-lock-root');

    function resetLockChrome() {
      document.documentElement.classList.remove('case-study-locked');
      if (root) {
        root.innerHTML = '';
        root.setAttribute('hidden', '');
        root.setAttribute('aria-hidden', 'true');
      }
    }

    if (!needs || authed) {
      resetLockChrome();
      return;
    }

    document.documentElement.classList.add('case-study-locked');
    if (!root) {
      root = document.createElement('div');
      root.id = 'case-study-lock-root';
      root.className = 'case-study-lock-root';
      document.body.insertBefore(root, document.body.firstChild);
    }
    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');

    if (document.getElementById('case-study-lock-form')) return;

    root.innerHTML =
      '<div class="case-study-lock__backdrop" aria-hidden="true"></div>' +
      '<div class="case-study-lock__panel" role="dialog" aria-modal="true" aria-labelledby="case-study-lock-title">' +
      '<p class="kicker case-study-lock__kicker">Case study</p>' +
      '<h2 class="case-study-lock__title" id="case-study-lock-title">This page is password protected</h2>' +
      '<p class="case-study-lock__hint case-study-lock__hint--recruiter-tip"><span class="case-study-lock__hint-strong">Tip for recruiters:</span> the passphrase is&nbsp;on the&nbsp;Case&nbsp;Studies&nbsp;landing page&nbsp;(first&nbsp;line&nbsp;beneath&nbsp;the&nbsp;intro).</p>' +
      '<p class="case-study-lock__hint case-study-lock__hint--secondary">Everyone else:&nbsp;enter the passphrase below, or email for access.</p>' +
      '<form class="case-study-lock__form" id="case-study-lock-form">' +
      '<label class="sr-only" for="case-study-lock-input">Password</label>' +
      '<input type="password" id="case-study-lock-input" class="case-study-lock__input" name="password" autocomplete="current-password" required />' +
      '<button type="submit" class="case-study-lock__submit">Unlock</button>' +
      '</form>' +
      '<p class="case-study-lock__error" id="case-study-lock-error" role="alert" hidden>Incorrect password. Try again.</p>' +
      '</div>';

    const form = document.getElementById('case-study-lock-form');
    const input = document.getElementById('case-study-lock-input');
    const err = document.getElementById('case-study-lock-error');
    if (!form || !input || !err) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      err.hidden = true;
      const v = input.value.trim();
      if (v === CASE_STUDY_PASSWORD) {
        try {
          sessionStorage.setItem(CASE_STUDY_AUTH_KEY, '1');
        } catch {
          /* ignore */
        }
        resetLockChrome();
      } else {
        err.hidden = false;
        input.value = '';
        input.focus();
      }
    });

    requestAnimationFrame(() => input.focus());
  }

  /** Keeps body page classes correct when SPA-swapping (#spa-main shell may stay index.html). */
  function syncBodyPageClasses(resolvedHref) {
    let url;
    try {
      url = new URL(resolvedHref, document.baseURI);
    } catch {
      return;
    }
    let key = filenameKey(url.pathname);
    if (!key) key = 'index.html';
    document.body.classList.toggle('page-home', key === 'index.html');
    document.body.classList.toggle('page-about', key === 'about.html');
  }

  const CASE_STUDY_DETAIL_PAGES = new Set([
    'gwi.html',
    'toyota.html',
    'hyundai-finance.html',
    'planning-inspectorate.html',
  ]);

  const AI_EXPLORATION_DETAIL_PAGES = new Set([
    'british-airways.html',
    'fos-ai.html',
    'ba-fo.html',
  ]);

  function updateNavAriaCurrent(resolvedUrl) {
    let activeFile = filenameKey(new URL(resolvedUrl, document.baseURI).pathname);
    if (CASE_STUDY_DETAIL_PAGES.has(activeFile)) activeFile = 'case-studies.html';
    else if (AI_EXPLORATION_DETAIL_PAGES.has(activeFile)) activeFile = 'ai-explorations.html';

    document.querySelectorAll('.nav__links a[href], .mobile-nav__links a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (!h || h.startsWith('#')) return;
      const linkFile = filenameKey(new URL(h, document.baseURI).pathname);
      if (linkFile === activeFile) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function isInternalHtmlPageUrl(url) {
    if (url.protocol === 'javascript:') return false;
    const path = url.pathname.toLowerCase();
    return /\.html(\/|$)/i.test(path);
  }

  function closeMobileNav() {
    const btn = document.getElementById('nav-hamburger');
    const drawer = document.getElementById('mobile-nav');
    if (!btn || !drawer) return;
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function navigateHard(destination) {
    closeMobileNav();
    window.location.href = destination;
  }

  /** Retries help with transient network/CDN failures during SPA transitions (common on flaky mobile/Wi‑Fi). */
  async function fetchInternalHtmlPage(fetchUrl) {
    const maxAttempts = 3;
    /** @type {unknown} */
    let lastIssue = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(fetchUrl, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (res.ok) return res;
        lastIssue = new Error(String(res.status));
      } catch (err) {
        lastIssue = err;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw lastIssue instanceof Error ? lastIssue : new Error('fetch failed');
  }

  async function spaNavigate(rawUrl, { replace = false } = {}) {
    const spaMain = document.getElementById('spa-main');
    let url;
    try {
      url = new URL(rawUrl, document.baseURI);
    } catch {
      navigateHard(rawUrl);
      return;
    }

    const here = new URL(window.location.href);

    if (!sameOriginForSpa(url, here)) {
      navigateHard(rawUrl);
      return;
    }

    if (!spaMain || !isInternalHtmlPageUrl(url)) {
      navigateHard(rawUrl);
      return;
    }

    const gen = ++spaNavGeneration;
    closeMobileNav();

    let fetchUrl = url.href;
    if (window.location.protocol !== 'file:') fetchUrl = url.pathname + url.search;

    let res;
    try {
      res = await fetchInternalHtmlPage(fetchUrl);
    } catch {
      if (gen === spaNavGeneration) navigateHard(rawUrl);
      return;
    }
    if (gen !== spaNavGeneration) return;

    let html;
    try {
      html = await res.text();
    } catch {
      if (gen === spaNavGeneration) navigateHard(rawUrl);
      return;
    }
    if (gen !== spaNavGeneration) return;

    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.getElementById('spa-main');
    if (!next) {
      if (gen === spaNavGeneration) navigateHard(rawUrl);
      return;
    }
    if (gen !== spaNavGeneration) return;

    teardownDynamicPage();

    spaMain.innerHTML = next.innerHTML;
    document.title = doc.title;
    const nextDesc = doc.querySelector('meta[name="description"]');
    const curDesc  = document.querySelector('meta[name="description"]');
    if (nextDesc && curDesc) curDesc.setAttribute('content', nextDesc.getAttribute('content') || '');

    let historyPath = url.pathname + url.search + url.hash;
    if (window.location.protocol === 'file:') {
      const file = url.pathname.split('/').pop() || 'index.html';
      historyPath = file + url.search + url.hash;
    }
    try {
      if (replace) history.replaceState({ spa: 1 }, '', historyPath);
      else history.pushState({ spa: 1 }, '', historyPath);
    } catch {
      if (gen === spaNavGeneration) navigateHard(rawUrl);
      return;
    }
    if (gen !== spaNavGeneration) return;

    updateNavAriaCurrent(url.href);
    syncBodyPageClasses(url.href);
    window.scrollTo(0, 0);

    const hid = url.hash.slice(1);
    if (hid) {
      requestAnimationFrame(() => {
        document.getElementById(hid)?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    initDynamicPage();
    applyCaseStudyPasswordGate(url.href);
  }

  /* ──────────────────────────────────────────────────────────────────
     1. STACKED-RECORD SCROLL EFFECT
  ────────────────────────────────────────────────────────────────── */
  function initRecordStack() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

    const section = document.getElementById('works');
    const crate   = section && section.querySelector('.crate');
    if (!crate || !section) return () => {};

    const cards = Array.from(crate.querySelectorAll(':scope > .record'));
    const N = cards.length;
    if (N < 2) return () => {};

    /* Matches styles.css stacked mobile catalogue @media (max-width: 880px) */
    const mqDesk = window.matchMedia('(min-width: 881px)');
    let removeScrollResize = () => {};

    function clearStackEffects() {
      removeScrollResize();
      removeScrollResize = () => {};
      section.style.minHeight = '';
      crate.removeAttribute('style');
      cards.forEach(card => {
        card.removeAttribute('style');
        card.classList.remove('is-in');
      });
    }

    function activateStackScroll() {
      clearStackEffects();
      if (!mqDesk.matches) return;

      const STACK = [
        { ty:  0,  sc: 1.000 },
        { ty: 26,  sc: 0.965 },
        { ty: 47,  sc: 0.933 },
        { ty: 64,  sc: 0.904 },
      ];

      function stackAt(pos) {
        const p = Math.max(0, pos);
        if (p >= STACK.length - 1) return STACK[STACK.length - 1];
        const lo = STACK[Math.floor(p)];
        const hi = STACK[Math.ceil(p)];
        const f  = p % 1;
        return {
          ty: lo.ty + (hi.ty - lo.ty) * f,
          sc: lo.sc + (hi.sc - lo.sc) * f,
        };
      }

      const lerp = (a, b, t) => a + (b - a) * t;
      const eio  = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t;

      let PER = 0, animStart = 0;

      function measure() {
        PER = Math.max(window.innerHeight * 0.95, 500);

        const head  = section.querySelector('.section__head');
        const headH = head ? head.offsetHeight : 0;

        animStart =
          section.getBoundingClientRect().top + window.scrollY + headH;

        section.style.minHeight =
          `${headH + window.innerHeight + (N - 1) * PER + 120}px`;
      }

      Object.assign(crate.style, {
        position:    'sticky',
        top:         '0',
        height:      '100svh',
        gap:         '0',
        padding:     '0',
        maxWidth:    '100%',
        margin:      '0',
        overflow:    'visible',
        perspective: '2200px',
      });

      cards.forEach(card => {
        Object.assign(card.style, {
          position:   'absolute',
          top:        '50%',
          left:       '50%',
          width:
            'min(calc(1220px * 2 / 3 * 1.21), max(min(calc(94vw * 2 / 3 * 1.21), calc((100svh - 168px) * 1.3552)), calc(71vw)))',
          margin:     '0',
          willChange: 'transform, opacity',
        });
        card.classList.add('is-in');
      });

      function draw() {
        const scrolled = Math.max(0, window.scrollY - animStart);
        const sp    = scrolled / PER;
        const front = Math.min(Math.floor(sp), N - 2);
        const rawT  = sp - front;

        const DWELL = 0.45;
        const animT = rawT < DWELL ? 0 : (rawT - DWELL) / (1 - DWELL);
        const t  = Math.min(Math.max(animT, 0), 1);
        const te = eio(t);

        const GONE_Y = -(window.innerHeight * 0.55 + 600);

        cards.forEach((card, i) => {
          let ty, sc, op = 1, ro = 0, zi, pe;

          if (i < front) {
            ty = GONE_Y; sc = 0.88; op = 0; ro = -2;
            zi = N - i;  pe = 'none';

          } else if (i === front) {
            const from = stackAt(0);
            ty = lerp(from.ty, GONE_Y, te);
            sc = lerp(from.sc, 0.88,   te);
            ro = lerp(0,       -2,     te);
            op = te > 0.85 ? lerp(1, 0, (te - 0.85) / 0.15) : 1;
            zi = N + 1;
            pe = t > 0.75 ? 'none' : 'auto';

          } else {
            const sPos = i - front;
            const from = stackAt(sPos);
            const to   = stackAt(sPos - 1);
            ty = lerp(from.ty, to.ty, te);
            sc = lerp(from.sc, to.sc, te);
            zi = N - sPos;
            pe = 'auto';
          }

          card.style.transform =
            `translate(-50%, calc(-50% + ${ty}px)) scale(${sc}) rotate(${ro}deg)`;
          card.style.opacity       = String(Math.max(0, op));
          card.style.zIndex        = String(zi);
          card.style.pointerEvents = pe;
        });
      }

      measure();
      draw();
      const onScroll = draw;
      const onResize = () => {
        if (!mqDesk.matches) {
          activateStackScroll();
          return;
        }
        measure();
        draw();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });

      removeScrollResize = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      };
    }

    function mqListener() {
      activateStackScroll();
    }

    mqDesk.addEventListener('change', mqListener);
    activateStackScroll();

    return () => {
      mqDesk.removeEventListener('change', mqListener);
      clearStackEffects();
    };
  }

  /* ──────────────────────────────────────────────────────────────────
     SCROLL-LINKED CARD FLIP (.csd-fullimg__inner)
  ────────────────────────────────────────────────────────────────── */
  function initFlipImages() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

    const panels = document.querySelectorAll('.csd-fullimg__inner');
    if (!panels.length) return () => {};

    const MAX_ANGLE = 14;

    function update() {
      const vh = window.innerHeight;
      panels.forEach(el => {
        const rect = el.getBoundingClientRect();
        const raw = (vh - rect.top) / (vh * 0.7);
        const progress = Math.max(0, Math.min(1, raw));
        const angle = MAX_ANGLE * (1 - progress);
        el.style.transform = `perspective(1400px) rotateX(${angle.toFixed(2)}deg)`;
      });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }

  /* ──────────────────────────────────────────────────────────────────
     2. Case study records: whole card navigates (SPA when possible)
  ────────────────────────────────────────────────────────────────── */
  function initCaseStudyRecordClicks() {
    document.querySelectorAll('.crate > .record').forEach(rec => {
      if (rec.dataset.spaWired === '1') return;
      rec.dataset.spaWired = '1';

      const href = rec.dataset.caseHref;
      if (!href) return;

      rec.setAttribute('tabindex', '0');

      rec.addEventListener('click', e => {
        if (e.target.closest('a[href]')) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          e.preventDefault();
          window.open(href, '_blank');
          return;
        }
        if (e.button !== 0) return;
        spaNavigate(href);
      });

      rec.addEventListener('auxclick', e => {
        if (e.button !== 1) return;
        if (e.target.closest('a[href]')) return;
        e.preventDefault();
        window.open(href, '_blank');
      });

      rec.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest && e.target.closest('a[href]')) return;

        e.preventDefault();
        spaNavigate(href);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────
     3. "GET IN TOUCH": copy email + toast (delegated for SPA swaps)
     Toast is resolved at click time; markup often lives after this script.
  ────────────────────────────────────────────────────────────────── */
  let toastTimer;

  function showCopiedToast() {
    const el = document.getElementById('email-toast');
    if (!el) return;
    el.textContent = 'Copied to clipboard';
    clearTimeout(toastTimer);
    el.classList.add('is-visible');
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  function copyEmail() {
    navigator.clipboard.writeText('zenazerai@gmail.com').then(showCopiedToast).catch(() => {});
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('#nav-copy-email, #foot-copy-email, #mobile-copy-email, #copy-email, #scope-copy-email');
    if (!t) return;
    if (t.tagName !== 'BUTTON') return;
    e.preventDefault();
    copyEmail();
  });

  /* ──────────────────────────────────────────────────────────────────
     4. NAV elevation on scroll
  ────────────────────────────────────────────────────────────────── */
  const nav = document.querySelector('.nav');
  const onNavScroll = () => {
    nav?.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  document.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  /* ──────────────────────────────────────────────────────────────────
     5a. HAMBURGER MENU toggle
  ────────────────────────────────────────────────────────────────── */
  const hamburgerBtn = document.getElementById('nav-hamburger');
  const mobileNav    = document.getElementById('mobile-nav');

  if (hamburgerBtn && mobileNav) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      hamburgerBtn.classList.toggle('is-open', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      mobileNav.setAttribute('aria-hidden',     String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeMobileNav());
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        closeMobileNav();
        hamburgerBtn.focus();
      }
    });
  }

  function setupRevealOnScroll() {
    const reveal = document.querySelectorAll(
      [
        '.section__head',
        '.lineup__floor',
        '.about__copy',
        '.about__visual',
        '.foot__inner',
        '.testimonials',
        '.cs-page-hero__inner',
        '.cs-grid-section .cs-grid > .cs-card',
        'article.csd > .csd-back-wrap',
        'article.csd > section:not(.gwi-pivot-drop)',
      ].join(', ')
    );
    reveal.forEach(el => el.classList.add('reveal'));

    const allReveal = document.querySelectorAll('.reveal');

    /** Desktop + late font layout can leave blocks at opacity:0 if IO misses once; re-run after paint. */
    function unblockVisibleReveals() {
      const slack = Math.min(window.innerHeight * 0.22, 260);
      document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
        const r = el.getBoundingClientRect();
        const viewBottom = window.innerHeight + slack;
        if (r.top < viewBottom && r.bottom > -slack) {
          el.classList.add('is-in');
          revealObserver?.unobserve(el);
        }
      });
    }

    if ('IntersectionObserver' in window) {
      /* Positive bottom margin = treat “near viewport” as intersecting (large monitors, no scroll yet). */
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px 45% 0px', threshold: 0.02 });
      allReveal.forEach(el => revealObserver.observe(el));
      requestAnimationFrame(unblockVisibleReveals);
      setTimeout(unblockVisibleReveals, 120);
      setTimeout(unblockVisibleReveals, 450);
      setTimeout(unblockVisibleReveals, 1100);
      if (document.readyState === 'complete') {
        requestAnimationFrame(unblockVisibleReveals);
      } else {
        window.addEventListener('load', () => requestAnimationFrame(unblockVisibleReveals), { once: true });
      }

      /* IO can still occasionally miss sections (scroll timing, WKWebKit, SPA swap). Guarantee visibility. */
      if (revealSafetyTimerId !== null) clearTimeout(revealSafetyTimerId);
      revealSafetyTimerId = setTimeout(() => {
        revealSafetyTimerId = null;
        document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
          el.classList.add('is-in');
          revealObserver?.unobserve(el);
        });
      }, 2200);
    } else {
      allReveal.forEach(el => el.classList.add('is-in'));
    }
  }

  function initTrackCards() {
    const cards = document.querySelectorAll('.track-card');
    if (!cards.length) return;

    cards.forEach(details => {
      const summary = details.querySelector('summary');
      const body    = details.querySelector('.track-card__body');
      if (!summary || !body) return;

      summary.addEventListener('click', e => {
        e.preventDefault();

        if (details.open) {
          body.style.gridTemplateRows = '0fr';
          const onEnd = () => {
            details.removeAttribute('open');
            body.removeEventListener('transitionend', onEnd);
          };
          body.addEventListener('transitionend', onEnd, { once: true });
        } else {
          details.setAttribute('open', '');
          body.getBoundingClientRect();
          body.style.gridTemplateRows = '1fr';
        }
      });
    });
  }

  function initFosConceptHotspots() {
    const roots = document.querySelectorAll('.fos-concepts, .pins-queue-hotspots-root');
    if (!roots.length) return () => {};

    function closeAll() {
      roots.forEach(root => {
        root.querySelectorAll('.fos-hotspot--open').forEach(h => {
          h.classList.remove('fos-hotspot--open');
          const b = h.querySelector('.fos-hotspot__btn');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
      });
    }

    const removers = [];
    roots.forEach(root => {
      root.querySelectorAll('.fos-hotspot__popup').forEach(popup => {
        const stop = e => e.stopPropagation();
        popup.addEventListener('click', stop);
        removers.push(() => popup.removeEventListener('click', stop));
      });
      root.querySelectorAll('.fos-hotspot').forEach(hotspot => {
        const btn = hotspot.querySelector('.fos-hotspot__btn');
        if (!btn) return;
        const onBtnClick = e => {
          e.stopPropagation();
          const wasOpen = hotspot.classList.contains('fos-hotspot--open');
          closeAll();
          if (!wasOpen) {
            hotspot.classList.add('fos-hotspot--open');
            btn.setAttribute('aria-expanded', 'true');
          }
        };
        btn.addEventListener('click', onBtnClick);
        removers.push(() => btn.removeEventListener('click', onBtnClick));
      });
    });

    const onDocClick = () => closeAll();
    document.addEventListener('click', onDocClick);
    removers.push(() => document.removeEventListener('click', onDocClick));

    return () => removers.forEach(fn => fn());
  }

  /** planning-inspectorate.html: publish flow before/after checkbox */
  function initPinsPublishFlow() {
    const cb = document.getElementById('pins-publish-flow-toggle');
    if (!cb) return () => {};

    const root = cb.closest('.pins-flow');
    const before = root?.querySelector('.pins-flow__track--before');
    const after = root?.querySelector('.pins-flow__track--after');
    if (!before || !after) return () => {};

    function sync() {
      const on = cb.checked;
      before.setAttribute('aria-hidden', on ? 'true' : 'false');
      after.setAttribute('aria-hidden', on ? 'false' : 'true');
    }

    sync();
    cb.addEventListener('change', sync);
    return () => cb.removeEventListener('change', sync);
  }

  function initGwiPivotDrop() {
    const el = document.querySelector('[data-gwi-pivot-drop]');
    if (!el) return () => {};

    el.classList.add('gwi-pivot-drop--arm');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('gwi-pivot-drop--landed');
      return () => {
        el.classList.remove('gwi-pivot-drop--arm', 'gwi-pivot-drop--landed');
      };
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          el.classList.add('gwi-pivot-drop--landed');
          observer.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -14% 0px', threshold: 0.1 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      el.classList.remove('gwi-pivot-drop--landed', 'gwi-pivot-drop--arm');
    };
  }

  function initDynamicPage() {
    try {
      recordStackCleanup = initRecordStack();
      flipImagesCleanup  = initFlipImages();
      fosHotspotCleanup  = initFosConceptHotspots();
      aiSleeveCleanup    = initAISleeves();
      pivotDropCleanup   = initGwiPivotDrop();
      pinsFlowCleanup    = initPinsPublishFlow();
      initCaseStudyRecordClicks();
      setupRevealOnScroll();
      initTrackCards();
    } catch {
      /* One bad interaction should not strand the SPA shell entirely. */
    }
  }

  initDynamicPage();
  applyCaseStudyPasswordGate(window.location.href);

  function initSpotifyFabListeners() {
    const spotifyFab       = document.getElementById('spotify-fab');
    const spotifyTrigger   = document.getElementById('spotify-fab-trigger');
    const spotifyPanel     = document.getElementById('spotify-fab-panel');
    const spotifyEmbedWrap = spotifyFab?.querySelector('.spotify-fab__embed');
    const spotifyClose     = spotifyFab?.querySelector('.spotify-fab__panel-close');
    const spotifyPlayRing  = spotifyFab?.querySelector('.spotify-fab__play-ring');

    let spotifyEmbedController       = null;
    let spotifyPlaybackState        = /** @type {{ isPaused: boolean } | null} */ (null);
    let spotifyUserEverStartedPlayback = false;
    let spotifyIFrameApiPromise     = null;
    let spotifyAttachPromise       = /** @type {Promise<void> | null} */ (null);

    function spotifyShowsPauseChip() {
      return !!spotifyPlaybackState && spotifyPlaybackState.isPaused === false;
    }

    function applySpotifyPlaybackData(data) {
      if (!data || typeof data.isPaused !== 'boolean') return;
      spotifyPlaybackState = { isPaused: data.isPaused };
      if (!data.isPaused) spotifyUserEverStartedPlayback = true;
      syncSpotifyFabTransport();
    }

    function ensureSpotifyIFrameApiLoaded() {
      if (!spotifyIFrameApiPromise) {
        spotifyIFrameApiPromise = new Promise((resolve, reject) => {
          const prevReady = window.onSpotifyIframeApiReady;
          window.onSpotifyIframeApiReady = function (IFrameAPI) {
            try {
              if (typeof prevReady === 'function') prevReady(IFrameAPI);
            } catch (_) {
              /* another consumer */
            }
            resolve(IFrameAPI);
          };

          let s = document.querySelector('script[data-spotify-iframe-api-src="1"]');
          if (!s) {
            s = document.createElement('script');
            s.dataset.spotifyIframeApiSrc = '1';
            s.async = true;
            s.src = 'https://open.spotify.com/embed/iframe-api/v1';
            s.onerror = () => reject(new Error('Spotify iFrame API failed to load'));
            document.body.appendChild(s);
          }
        });
      }
      return spotifyIFrameApiPromise;
    }

    function mountSpotifyFallbackIframe() {
      if (!spotifyEmbedWrap?.querySelector('iframe')) {
        spotifyEmbedWrap.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src =
          'https://open.spotify.com/embed/playlist/145DhPn9Z7D2cnNkggKWZx?utm_source=generator';
        iframe.width = '100%';
        iframe.height = '352';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute(
          'allow',
          'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        );
        iframe.allowFullscreen = true;
        iframe.title = 'Spotify playlist';
        iframe.loading = 'lazy';
        spotifyEmbedWrap.appendChild(iframe);
      }
      spotifyPlaybackState = null;
      syncSpotifyFabTransport();
    }

    function attachSpotifyEmbedViaApiIfNeeded() {
      if (!spotifyFab || !spotifyEmbedWrap) return Promise.resolve();
      if (spotifyEmbedController) return Promise.resolve();
      if (spotifyAttachPromise) return spotifyAttachPromise;

      spotifyAttachPromise = (async () => {
        try {
          let root = document.getElementById('spotify-fab-embed-root');
          if (!root || !spotifyEmbedWrap.contains(root)) {
            spotifyEmbedWrap.innerHTML =
              '<div id="spotify-fab-embed-root" class="spotify-fab__embed-root" data-spotify-uri="spotify:playlist:145DhPn9Z7D2cnNkggKWZx"></div>';
            root = document.getElementById('spotify-fab-embed-root');
          }
          const mount = /** @type {HTMLElement|null} */ (root);
          if (!mount || spotifyEmbedController) return;

          const playlistUri =
            mount.getAttribute('data-spotify-uri') || 'spotify:playlist:145DhPn9Z7D2cnNkggKWZx';

          const IFrameAPI = await ensureSpotifyIFrameApiLoaded();

          await new Promise((resolve, reject) => {
            try {
              IFrameAPI.createController(
                mount,
                {
                  uri: playlistUri,
                  width: '100%',
                  height: '352',
                },
                EmbedController => {
                  try {
                    spotifyEmbedController = EmbedController;
                    EmbedController.addListener('playback_update', e =>
                      applySpotifyPlaybackData(e.data),
                    );
                    EmbedController.addListener('playback_started', () => {
                      spotifyUserEverStartedPlayback = true;
                      spotifyPlaybackState = { isPaused: false };
                      syncSpotifyFabTransport();
                    });
                    EmbedController.addListener('ready', () => {
                      syncSpotifyFabTransport();
                    });
                    syncSpotifyFabTransport();
                  } finally {
                    resolve(undefined);
                  }
                },
              );
            } catch (err) {
              reject(err);
            }
          });
        } catch (_) {
          mountSpotifyFallbackIframe();
        } finally {
          spotifyAttachPromise = null;
        }
      })();

      return spotifyAttachPromise;
    }

    function syncSpotifyFabTransport() {
      if (!spotifyTrigger || !spotifyFab) return;
      const fabPlayingChip = spotifyShowsPauseChip();
      spotifyTrigger.classList.toggle('spotify-fab__trigger--playing', fabPlayingChip);

      const open = spotifyFab.classList.contains('spotify-fab--open');

      spotifyTrigger.setAttribute(
        'aria-label',
        fabPlayingChip
          ? 'Playback is playing. Pause with the amber button, or open or close the player with the platter.'
          : spotifyUserEverStartedPlayback
            ? 'Playback is paused in the Spotify player. Amber button resumes, platter toggles the panel.'
            : open
              ? 'Player open. Press play inside the Spotify embed, then use amber to pause or resume.'
              : 'Spotify playlist: platter opens the player; use play inside Spotify first, then amber pauses.',
      );

      spotifyTrigger.title = fabPlayingChip
        ? 'Pause playback (tap amber)'
        : spotifyUserEverStartedPlayback
          ? 'Resume playback (tap amber)'
          : open
            ? 'Hide panel (tap platter)'
            : 'Open Spotify player (tap platter)';

      if (spotifyPlayRing) {
        spotifyPlayRing.title = fabPlayingChip
          ? 'Pause playback'
          : spotifyUserEverStartedPlayback
            ? 'Resume playback'
            : 'Use play inside the Spotify embed first';
      }
    }

    function setSpotifyOpen(open) {
      if (!spotifyFab || !spotifyTrigger || !spotifyPanel) return;
      spotifyFab.classList.toggle('spotify-fab--open', open);
      spotifyTrigger.setAttribute('aria-expanded', String(open));
      spotifyPanel.setAttribute('aria-hidden', String(!open));
      if (open) {
        attachSpotifyEmbedViaApiIfNeeded();
      }
      syncSpotifyFabTransport();
    }

    function closeSpotifyPanelFromOutside() {
      if (!spotifyFab || !spotifyTrigger || !spotifyPanel) return;
      if (!spotifyFab.classList.contains('spotify-fab--open')) return;
      spotifyFab.classList.remove('spotify-fab--open');
      spotifyTrigger.setAttribute('aria-expanded', 'false');
      spotifyPanel.setAttribute('aria-hidden', 'true');
      syncSpotifyFabTransport();
    }

    if (!document.body.dataset.spotifyFabBound) {
      document.body.dataset.spotifyFabBound = '1';

      document.addEventListener('click', () => {
        closeSpotifyPanelFromOutside();
      });

      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const fabOpen = document.getElementById('spotify-fab')?.classList.contains('spotify-fab--open');
        if (!fabOpen) return;
        closeSpotifyPanelFromOutside();
        document.getElementById('spotify-fab-trigger')?.focus();
      });
    }

    if (spotifyFab && spotifyTrigger && spotifyPanel && !spotifyFab.dataset.listenersBound) {
      spotifyFab.dataset.listenersBound = '1';
      spotifyFab.addEventListener('click', e => e.stopPropagation());

      spotifyTrigger.addEventListener('click', e => {
        const onRing = Boolean(e.target.closest('.spotify-fab__play-ring'));
        const togglePanelOpen = () => {
          const open = !spotifyFab.classList.contains('spotify-fab--open');
          setSpotifyOpen(open);
        };

        const handleRing = () => {
          const ctrl = spotifyEmbedController;
          if (spotifyShowsPauseChip() && ctrl) {
            try {
              ctrl.pause();
            } catch (_) {
              /* ignore */
            }
            return;
          }
          if (ctrl && spotifyUserEverStartedPlayback) {
            try {
              ctrl.resume();
            } catch (_) {
              /* ignore */
            }
            return;
          }
          if (!spotifyFab.classList.contains('spotify-fab--open')) {
            setSpotifyOpen(true);
          }
          attachSpotifyEmbedViaApiIfNeeded();
        };

        if (onRing) {
          void attachSpotifyEmbedViaApiIfNeeded().then(handleRing);
          return;
        }
        togglePanelOpen();
      });

      spotifyClose?.addEventListener('click', () => {
        setSpotifyOpen(false);
        spotifyTrigger.focus();
      });

      syncSpotifyFabTransport();
    }
  }

  initSpotifyFabListeners();

  document.addEventListener('click', e => {
    if (e.button !== 0) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (a.target === '_blank' || a.hasAttribute('download')) {
      if (a.closest('#mobile-nav')) closeMobileNav();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      if (a.closest('#mobile-nav')) closeMobileNav();
      return;
    }
    if (a.hasAttribute('data-no-spa')) return;

    const hrefAttr = a.getAttribute('href');
    if (!hrefAttr) return;

    if (hrefAttr.startsWith('#') && !hrefAttr.includes('.html')) return;

    let url;
    try {
      url = new URL(a.href);
    } catch {
      return;
    }

    if (!sameOriginForSpa(url, new URL(window.location.href))) return;
    if (!isInternalHtmlPageUrl(url)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    spaNavigate(a.href);
  }, true);

  window.addEventListener('popstate', () => {
    closeMobileNav();
    spaNavigate(window.location.href, { replace: true });
  });

  updateNavAriaCurrent(window.location.href);
  syncBodyPageClasses(window.location.href);

})();