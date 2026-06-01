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
      <span class="spotify-fab__cta" id="spotify-fab-cta" aria-hidden="true">Play me</span>
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

  const CASE_STUDY_DETAIL_PAGES = new Set([
    'gwi.html',
    'toyota.html',
    'hyundai-finance.html',
    'planning-inspectorate.html',
  ]);

  function isCaseStudyPageKey(key) {
    return key === 'case-studies.html' || CASE_STUDY_DETAIL_PAGES.has(key);
  }

  function ensureSpotifyFabReady() {
    if (document.body.classList.contains('page-case-study')) return;
    mountSpotifyFab();
    initSpotifyFabListeners();
  }

  let spotifyIntroObserver = null;

  function introBlocksSpotifyFab() {
    return document.body.classList.contains('page-home--intro')
      || document.body.classList.contains('hero-intro-active');
  }

  function scheduleSpotifyFabMount() {
    if (!document.body.classList.contains('page-home') || !introBlocksSpotifyFab()) {
      ensureSpotifyFabReady();
      return;
    }
    deferNonCriticalWork(ensureSpotifyFabReady);
  }

  function watchHomeIntroForSpotifyFab() {
    spotifyIntroObserver?.disconnect();
    spotifyIntroObserver = null;

    if (!document.body.classList.contains('page-home')) {
      ensureSpotifyFabReady();
      return;
    }
    if (!introBlocksSpotifyFab()) {
      scheduleSpotifyFabMount();
      return;
    }
    spotifyIntroObserver = new MutationObserver(() => {
      if (!introBlocksSpotifyFab()) {
        spotifyIntroObserver?.disconnect();
        spotifyIntroObserver = null;
        scheduleSpotifyFabMount();
      }
    });
    spotifyIntroObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function deferNonCriticalWork(fn) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: 1500 });
    } else {
      setTimeout(fn, 1);
    }
  }

  let testimonialCarouselCleanup = () => {};
  let recordStackCleanup = () => {};
  let flipImagesCleanup  = () => {};
  let fosHotspotCleanup  = () => {};
  let aiSleeveCleanup    = () => {};
  let pivotDropCleanup  = () => {};
  let pinsFlowCleanup   = () => {};
  let careerAgentCleanup = () => {};
  let heroEntranceCleanup = () => {};
  let heroIntroCleanup = () => {};
  let heroScrollCollapseCleanup = () => {};
  let enableHeroCollapseTrack = () => {};
  let aboutEntranceCleanup = () => {};
  /** Invalidates async career-agent script load when SPA tears down before onload. */
  let careerAgentLoadGen = 0;
  let revealObserver     = null;
  /** Clears flaky IntersectionObserver “stuck invisible” fallback. */
  let revealSafetyTimerId = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  /** Home: wait for hero before scroll reveals; avoids below-fold firing on load. */
  let homeScrollRevealEnabled = false;
  /** About: same gate as home hero before scroll reveals run. */
  let aboutScrollRevealEnabled = false;

  /** Incremented whenever a newer in-app navigation starts; stale async completions must not swap DOM. */
  let spaNavGeneration = 0;

  const HOME_INTRO_SEEN_KEY = 'home-intro-seen';

  function hasSeenHomeIntro() {
    try {
      return sessionStorage.getItem(HOME_INTRO_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  }

  function markHomeIntroSeen() {
    try {
      sessionStorage.setItem(HOME_INTRO_SEEN_KEY, '1');
    } catch {
      /* sessionStorage unavailable */
    }
  }

  function markHomeIntroSeenIfLeavingHome(nextUrl) {
    if (!document.body.classList.contains('page-home')) return;
    if (
      document.body.classList.contains('hero-intro-active')
      && !document.body.classList.contains('hero-intro-done')
    ) return;
    markHomeIntroSeen();
  }

  function prepareHomeReturnIfSeen(resolvedHref) {
    let url;
    try {
      url = new URL(resolvedHref, document.baseURI);
    } catch {
      return;
    }
    const key = filenameKey(url.pathname) || 'index.html';
    if (!isHomePageKey(key) || !hasSeenHomeIntro()) return;
    document.body.classList.remove('page-home--intro', 'hero-intro-active', 'hero-intro-letters-in');
    document.body.classList.add('hero-intro-done', 'home-motion-on');
  }

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
    careerAgentCleanup();
    careerAgentCleanup = () => {};
    testimonialCarouselCleanup();
    testimonialCarouselCleanup = () => {};
    heroEntranceCleanup();
    heroEntranceCleanup = () => {};
    heroIntroCleanup();
    heroIntroCleanup = () => {};
    heroScrollCollapseCleanup();
    heroScrollCollapseCleanup = () => {};
    aboutEntranceCleanup();
    aboutEntranceCleanup = () => {};
    if (revealSafetyTimerId !== null) {
      clearTimeout(revealSafetyTimerId);
      revealSafetyTimerId = null;
    }
    homeScrollRevealEnabled = false;
    aboutScrollRevealEnabled = false;
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

  function isHomePageKey(key) {
    return key === 'index.html' || key === 'home.html';
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

    if (!document.getElementById('case-study-lock-form')) {
    root.innerHTML =
      '<div class="case-study-lock__backdrop" aria-hidden="true"></div>' +
      '<div class="case-study-lock__panel" role="dialog" aria-modal="true" aria-labelledby="case-study-lock-title">' +
      '<p class="kicker case-study-lock__kicker">Case study</p>' +
      '<h2 class="case-study-lock__title" id="case-study-lock-title">This page is password protected</h2>' +
      '<p class="case-study-lock__hint case-study-lock__hint--secondary">Enter the passphrase below, or email for access.</p>' +
      '<form class="case-study-lock__form" id="case-study-lock-form">' +
      '<label class="sr-only" for="case-study-lock-input">Password</label>' +
      '<input type="password" id="case-study-lock-input" class="case-study-lock__input" name="password" autocomplete="current-password" required />' +
      '<button type="submit" class="case-study-lock__submit">Unlock</button>' +
      '</form>' +
      '<p class="case-study-lock__error" id="case-study-lock-error" role="alert" hidden>Incorrect password. Try again.</p>' +
      '</div>';
    }

    const form = document.getElementById('case-study-lock-form');
    const input = document.getElementById('case-study-lock-input');
    const err = document.getElementById('case-study-lock-error');
    if (!form || !input || !err) return;
    if (form.dataset.caseStudyLockBound === '1') return;
    form.dataset.caseStudyLockBound = '1';

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
    document.body.classList.toggle('page-home', isHomePageKey(key));
    document.body.classList.toggle('page-about', key === 'about.html' || key === 'career-agent-preview.html');
    document.body.classList.toggle('page-career-agent-preview', key === 'career-agent-preview.html');
    document.body.classList.toggle('page-pins', key === 'planning-inspectorate.html');
    document.body.classList.toggle('page-case-study', isCaseStudyPageKey(key));
  }

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
    if (window.location.protocol === 'file:') {
      navigateHard(rawUrl);
      return;
    }

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

    markHomeIntroSeenIfLeavingHome(url.href);
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
    prepareHomeReturnIfSeen(url.href);
    window.scrollTo(0, 0);

    const hid = url.hash.slice(1);
    if (hid) {
      requestAnimationFrame(() => {
        document.getElementById(hid)?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    initDynamicPage();
    applyCaseStudyPasswordGate(url.href);
    if (!document.body.classList.contains('page-case-study') && !document.getElementById('spotify-fab')) {
      watchHomeIntroForSpotifyFab();
    }
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

    const REVEAL_CLASSES = [
      'reveal',
      'reveal--lift',
      'reveal--stagger',
      'reveal--soft',
      'reveal--slide-right',
      'reveal--scale',
    ];

    function stripRecordRevealClasses() {
      cards.forEach(card => {
        card.classList.remove(...REVEAL_CLASSES);
        card.style.removeProperty('--reveal-delay');
      });
    }

    function restoreMobileRecordReveal() {
      cards.forEach((card, i) => {
        card.classList.add('reveal', 'reveal--lift');
        card.style.setProperty('--reveal-delay', `${Math.min(i * 100, 380)}ms`);
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.86 && rect.bottom > 0) {
          card.classList.add('is-in');
        }
      });
    }

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
      if (!mqDesk.matches) {
        restoreMobileRecordReveal();
        return;
      }

      stripRecordRevealClasses();

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
        overflow:    'visible',
        perspective: '2200px',
      });

      cards.forEach(card => {
        Object.assign(card.style, {
          position:   'absolute',
          top:        '50%',
          left:       '50%',
          width:
            'min(calc(1540px * 2 / 3 * 1.21), max(min(calc(96vw * 2 / 3 * 1.24), calc((100svh - 168px) * 1.48)), calc(78vw)))',
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

  /** Home hero: sticky image + copy fades; hero title fades out, nav name fades in. */
  function initHeroScrollCollapse() {
    if (!document.body.classList.contains('page-home')) return () => {};

    const hero = document.querySelector('#top.hero');
    const pin = hero?.querySelector('.hero__pin');
    const title = hero?.querySelector('.hero__title');
    const subtitle = hero?.querySelector('.hero__subtitle');
    const tagline = hero?.querySelector('.hero__tagline');
    const aside = hero?.querySelector('.hero__aside');
    const bottom = hero?.querySelector('.hero__bottom');
    const linkedin = hero?.querySelector('.hero__right');
    const scrollCue = hero?.querySelector('.hero__scroll');
    const nav = document.querySelector('.nav');
    const navName = document.querySelector('.nav__name');
    if (!hero || !pin || !title || !nav || !navName) return () => {};

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => {};
    }

    let rafId = 0;

    const trackPx = () => Math.round(window.innerHeight * 0.75);

    function clamp(v, min, max) {
      return Math.min(max, Math.max(min, v));
    }

    function enableTrack() {
      if (document.body.classList.contains('hero-intro-active')) return;
      document.body.classList.add('hero-collapse-ready');
      hero.style.setProperty('--hero-collapse-track', `${trackPx()}px`);
      update();
    }

    enableHeroCollapseTrack = enableTrack;

    function collapseProgress() {
      if (document.body.classList.contains('hero-intro-active')) return 0;
      if (!document.body.classList.contains('hero-collapse-ready')) return 0;

      const heroRect = hero.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const vh = window.innerHeight;
      const track = hero.offsetHeight - vh;
      const scrollP = track <= 1 ? 0 : clamp(window.scrollY / track, 0, 1);
      const exitRange = vh - navRect.bottom;
      const exitP = exitRange <= 1
        ? (heroRect.bottom <= navRect.bottom ? 1 : 0)
        : clamp(1 - (heroRect.bottom - navRect.bottom) / exitRange, 0, 1);

      return Math.max(scrollP, exitP);
    }

    function clearTitleStyles() {
      title.classList.remove('hero__title--collapse-fixed', 'hero__title--collapse-settled');
      title.style.left = '';
      title.style.top = '';
      title.style.transform = '';
      title.style.transformOrigin = '';
      title.style.opacity = '';
      title.style.visibility = '';
    }

    function clearNavNameStyles() {
      navName.style.opacity = '';
      navName.style.visibility = '';
      navName.style.display = '';
    }

    function settleTitleInNav() {
      document.body.classList.add('hero-title-settled');
      clearTitleStyles();
      clearNavNameStyles();
      title.style.visibility = 'hidden';
      title.style.opacity = '0';
    }

    function clearCopyStyles() {
      for (const el of [tagline, bottom, aside, subtitle, linkedin, scrollCue]) {
        if (el) el.style.opacity = '';
      }
    }

    function resetCollapse() {
      document.body.style.removeProperty('--hero-collapse');
      document.body.classList.remove('hero-title-settled');
      clearTitleStyles();
      clearNavNameStyles();
      clearCopyStyles();
    }

    function applyCollapse(p) {
      if (document.body.classList.contains('hero-intro-active')) return;

      document.body.style.setProperty('--hero-collapse', String(p));

      const taglineFade = clamp(1 - p / 0.38, 0, 1);
      const subtitleFade = clamp(1 - (p - 0.12) / 0.32, 0, 1);
      const titleFade = clamp(1 - (p - 0.28) / 0.38, 0, 1);
      const navFade = clamp((p - 0.38) / 0.32, 0, 1);

      if (tagline) tagline.style.opacity = String(taglineFade);
      if (bottom) bottom.style.opacity = String(taglineFade);
      if (aside) aside.style.opacity = String(taglineFade);
      if (subtitle) subtitle.style.opacity = String(subtitleFade);
      if (linkedin) linkedin.style.opacity = String(subtitleFade);
      if (scrollCue) scrollCue.style.opacity = String(clamp(1 - p / 0.2, 0, 1));

      const heroRect = hero.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const shouldSettle = p >= 0.94 || heroRect.bottom <= navRect.bottom + 2;

      if (shouldSettle) {
        settleTitleInNav();
        return;
      }

      document.body.classList.remove('hero-title-settled');
      clearTitleStyles();
      title.style.opacity = String(titleFade);
      title.style.visibility = titleFade < 0.04 ? 'hidden' : 'visible';

      if (navFade > 0.02) {
        navName.style.display = 'inline';
        navName.style.visibility = 'visible';
        navName.style.opacity = String(navFade);
      } else {
        clearNavNameStyles();
      }
    }

    function update() {
      if (document.body.classList.contains('hero-intro-active')) return;
      if (!document.body.classList.contains('hero-collapse-ready')) {
        if (document.body.classList.contains('hero-intro-done')) enableTrack();
        return;
      }
      const p = collapseProgress();
      if (p <= 0 && window.scrollY < 8) {
        resetCollapse();
        return;
      }
      applyCollapse(p);
    }

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    }

    function onHeroLeaveViewport(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) return;
        if (!document.body.classList.contains('hero-collapse-ready')) return;
        settleTitleInNav();
      });
    }

    const heroObserver = new IntersectionObserver(onHeroLeaveViewport, {
      root: null,
      rootMargin: `${-(parseFloat(getComputedStyle(nav).height) || 56) - 2}px 0px 0px 0px`,
      threshold: 0,
    });
    heroObserver.observe(hero);

    function onResize() {
      if (!document.body.classList.contains('hero-collapse-ready')) return;
      hero.style.setProperty('--hero-collapse-track', `${trackPx()}px`);
      update();
    }

    if (
      document.body.classList.contains('hero-intro-done')
      || (!document.body.classList.contains('hero-intro-active')
        && !document.body.classList.contains('page-home--intro'))
    ) {
      enableTrack();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    update();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      heroObserver.disconnect();
      document.body.classList.remove('hero-collapse-ready', 'hero-title-settled');
      hero.style.removeProperty('--hero-collapse-track');
      enableHeroCollapseTrack = () => {};
      resetCollapse();
    };
  }

  /** Home hero: black → letters swipe in → scroll morphs name + reveals hero. */
  function initHeroIntro() {
    if (!document.body.classList.contains('page-home')) return () => {};

    const hero = document.querySelector('#top.hero');
    const pin = hero?.querySelector('.hero__pin');
    const overlay = hero?.querySelector('.hero__intro-overlay');
    const backdrop = hero?.querySelector('.hero__intro-backdrop');
    const bg = hero?.querySelector('.hero__bg');
    const title = hero?.querySelector('.hero__title');
    const subtitle = hero?.querySelector('.hero__subtitle');
    const nav = document.querySelector('.nav');
    if (!hero || !pin || !overlay || !backdrop || !bg || !title) return () => {};

    function clearIntroSubtitleInlinePosition() {
      if (!subtitle) return;
      subtitle.style.removeProperty('position');
      subtitle.style.removeProperty('left');
      subtitle.style.removeProperty('top');
      subtitle.style.zIndex = '';
      subtitle.style.removeProperty('opacity');
      subtitle.style.removeProperty('visibility');
      subtitle.style.transform = '';
      subtitle.style.margin = '';
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.remove('page-home--intro');
      return () => {};
    }

    const originalTitleHtml = title.innerHTML;

    if (hasSeenHomeIntro()) {
      document.body.classList.remove('page-home--intro', 'hero-intro-active', 'hero-intro-letters-in');
      document.body.classList.add('hero-intro-done');
      title.classList.remove('hero__title--intro-center', 'hero__title--intro-split');
      title.innerHTML = originalTitleHtml;
      title.style.left = '';
      title.style.top = '';
      title.style.transform = '';
      title.style.fontSize = '';
      title.style.visibility = '';
      clearIntroSubtitleInlinePosition();
      bg.style.transform = '';
      bg.style.clipPath = '';
      bg.style.webkitClipPath = '';
      backdrop.style.clipPath = '';
      backdrop.style.webkitClipPath = '';
      nav?.classList.remove('nav--intro-pulse', 'nav--intro-ready');
      return () => {
        document.body.classList.remove(
          'hero-intro-active',
          'hero-intro-done',
          'hero-intro-letters-in',
          'page-home--intro'
        );
      };
    }

    document.body.classList.add('hero-intro-active');
    document.body.classList.remove('hero-intro-done');
    /* Keep page-home--intro until boot reveals the large centred title. */

    const TITLE_END = 0.32;
    const TITLE_SPLIT_AT = 0.78;
    const IMAGE_START = 0.28;
    const IMAGE_END = 0.48;
    const SUBTITLE_START = 0.34;
    const SUBTITLE_END = 0.44;
    const COPY_START = 0.46;
    const COPY_END = 0.58;
    const LINKEDIN_START = 0.58;
    const LINKEDIN_END = 0.68;
    const INTRO_FINISH = 0.74;
    const INTRO_TITLE_INSET = 12;

    const trackPx = () => Math.round(window.innerHeight * 2);
    hero.style.setProperty('--hero-intro-track', `${trackPx()}px`);

    function getHeroPadPx() {
      return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 24;
    }

    function introTitleMaxWidth() {
      return Math.max(0, window.innerWidth - getHeroPadPx() * 2 - INTRO_TITLE_INSET * 2);
    }

    function measureIntroTitleTextWidth() {
      const first = title.querySelector('.hero__title-first');
      const accent = title.querySelector('.hero__title-accent');
      if (!first || !accent) return Math.ceil(title.scrollWidth);
      const firstRect = first.getBoundingClientRect();
      const accentRect = accent.getBoundingClientRect();
      return Math.ceil(accentRect.right - firstRect.left);
    }

    function fitIntroTitleToViewport() {
      const onIntro =
        document.body.classList.contains('page-home--intro')
        || title.classList.contains('hero__title--intro-center');
      if (!onIntro) return null;

      const maxW = introTitleMaxWidth();
      if (maxW <= 0) return null;

      title.style.fontSize = '';
      void title.offsetWidth;

      let lo = 20;
      let hi = Math.min(280, Math.floor(maxW * 0.24));
      let best = lo;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        title.style.fontSize = `${mid}px`;
        void title.offsetWidth;
        if (measureIntroTitleTextWidth() <= maxW) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      title.style.fontSize = `${best}px`;
      hero.style.setProperty('--hero-intro-title-fit', `${best}px`);
      document.body.style.setProperty('--hero-intro-title-fit', `${best}px`);
      return best;
    }

    let maxImageP = 0;
    let hasIntroScrolled = false;
    let introFinished = false;
    let rafId = 0;
    let lettersTimerId = 0;
    /** @type {{
     *   introCx: number; introCy: number;
     *   settledCx: number; settledCy: number; settledLeft: number;
     *   introFontPx: number; settledFontPx: number;
     * } | null} */
    let titleMorph = null;

    function clearIntroTitleInlinePosition() {
      title.style.left = '';
      title.style.top = '';
      title.style.transform = '';
      title.style.fontSize = '';
    }

    function measureTitleMorphTargets() {
      const progress = parseFloat(hero.style.getPropertyValue('--hero-title-progress') || '0');

      title.classList.remove('hero__title--intro-center');
      clearIntroTitleInlinePosition();
      title.style.visibility = 'hidden';
      void title.offsetHeight;

      const settledRect = title.getBoundingClientRect();
      if (!settledRect.width) {
        titleMorph = null;
        return;
      }

      const settledCx = settledRect.left + settledRect.width / 2;
      const settledCy = settledRect.top + settledRect.height / 2;
      const settledLeft = settledRect.left;
      const settledFontPx = parseFloat(getComputedStyle(title).fontSize);
      hero.style.setProperty('--hero-intro-title-slot', `${Math.round(settledRect.height)}px`);

      title.classList.add('hero__title--intro-center');
      title.style.transform = 'translate(-50%, -50%)';
      fitIntroTitleToViewport();
      void title.offsetHeight;

      const introRect = title.getBoundingClientRect();
      if (!introRect.width) {
        titleMorph = null;
        return;
      }

      const introCx = introRect.left + introRect.width / 2;
      const introCy = introRect.top + introRect.height / 2;
      const introFontPx = parseFloat(getComputedStyle(title).fontSize);

      titleMorph = {
        introCx,
        introCy,
        settledCx,
        settledCy,
        settledLeft,
        introFontPx,
        settledFontPx,
      };

      if (progress > 0) {
        title.style.visibility = 'visible';
        applyTitleMorph(progress);
      }
    }

    function applyTitleMorph(titleP) {
      if (!titleMorph || !title.classList.contains('hero__title--intro-center')) return;
      const t = clamp(titleP, 0, 1);

      if (t >= TITLE_SPLIT_AT) {
        title.classList.add('hero__title--intro-split');
      } else {
        title.classList.remove('hero__title--intro-split');
      }

      const fontPx = titleMorph.introFontPx + (titleMorph.settledFontPx - titleMorph.introFontPx) * t;
      title.style.fontSize = `${fontPx}px`;
      void title.offsetWidth;

      let cx = titleMorph.introCx + (titleMorph.settledCx - titleMorph.introCx) * t;
      const cy = titleMorph.introCy + (titleMorph.settledCy - titleMorph.introCy) * t;
      const width = title.getBoundingClientRect().width;
      if (width > 0) {
        cx = Math.max(cx, titleMorph.settledLeft + width / 2);
      }

      title.style.left = `${cx}px`;
      title.style.top = `${cy}px`;
      title.style.transform = 'translate(-50%, -50%)';
      title.style.opacity = '1';
      title.style.visibility = 'visible';
    }

    function settleIntroTitleInPlace() {
      title.classList.add('hero__title--intro-split');

      if (!titleMorph) {
        title.classList.remove('hero__title--intro-center', 'hero__title--intro-split');
        clearIntroTitleInlinePosition();
        title.style.opacity = '1';
        title.style.visibility = 'visible';
        return;
      }

      title.style.fontSize = `${titleMorph.settledFontPx}px`;
      void title.offsetWidth;

      let cx = titleMorph.settledCx;
      const width = title.getBoundingClientRect().width;
      if (width > 0) {
        cx = Math.max(cx, titleMorph.settledLeft + width / 2);
      }

      title.style.left = `${cx}px`;
      title.style.top = `${titleMorph.settledCy}px`;
      title.style.transform = 'translate(-50%, -50%)';
      title.style.opacity = '1';
      title.style.visibility = 'visible';
      void title.offsetHeight;

      title.classList.remove('hero__title--intro-center', 'hero__title--intro-split');
      clearIntroTitleInlinePosition();
      title.style.opacity = '1';
      title.style.visibility = 'visible';
    }

    function settleTitleLayoutIfReady(titleP) {
      if (titleLayoutSettled || titleP < 1) return;
      applyTitleMorph(1);
      settleIntroTitleInPlace();
      titleLayoutSettled = true;
      document.body.classList.add('hero-intro-title-settled');
    }

    function clamp(v, min, max) {
      return Math.min(max, Math.max(min, v));
    }

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function scrollProgress() {
      const track = hero.offsetHeight - window.innerHeight;
      if (track <= 1) return 0;
      return clamp(-hero.getBoundingClientRect().top / track, 0, 1);
    }

    function applyImageReveal(imageP) {
      if (imageP >= 1) {
        bg.style.transform = 'translateY(0)';
        backdrop.style.clipPath = 'inset(0 0 100% 0)';
        backdrop.style.webkitClipPath = backdrop.style.clipPath;
        return;
      }
      const lift = (1 - imageP) * 100;
      bg.style.transform = `translateY(${lift}%)`;
      backdrop.style.clipPath = `inset(0 0 ${imageP * 100}% 0)`;
      backdrop.style.webkitClipPath = backdrop.style.clipPath;
    }

    function clearImageReveal() {
      bg.style.transform = '';
      bg.style.clipPath = '';
      bg.style.webkitClipPath = '';
      backdrop.style.clipPath = '';
      backdrop.style.webkitClipPath = '';
    }

    function finishIntro() {
      if (introFinished) return;
      introFinished = true;

      if (!titleLayoutSettled) {
        applyTitleMorph(1);
        settleIntroTitleInPlace();
        titleLayoutSettled = true;
      }
      document.body.classList.add('hero-intro-title-settled');

      const scrollY = window.scrollY;
      const heroH = hero.offsetHeight;

      document.body.classList.add('hero-intro-done');
      document.body.classList.remove(
        'hero-intro-active',
        'hero-intro-letters-in',
        'hero-intro-title-settled'
      );
      markHomeIntroSeen();

      hero.classList.remove('hero--hold');
      hero.classList.add('hero--ready');
      clearIntroSubtitleInlinePosition();

      hero.style.removeProperty('--hero-intro-track');
      hero.style.removeProperty('--hero-intro-title-slot');
      hero.style.removeProperty('--hero-intro-title-fit');
      document.body.style.removeProperty('--hero-intro-title-fit');
      clearImageReveal();
      nav?.classList.remove('nav--intro-ready', 'nav--intro-pulse');
      document.body.style.removeProperty('--hero-title-progress');
      document.body.style.removeProperty('--hero-image-progress');
      document.body.style.removeProperty('--hero-subtitle-progress');
      document.body.style.removeProperty('--hero-copy-progress');
      document.body.style.removeProperty('--hero-linkedin-progress');
      hero.style.removeProperty('--hero-title-progress');
      hero.style.removeProperty('--hero-image-progress');
      hero.style.removeProperty('--hero-subtitle-progress');
      hero.style.removeProperty('--hero-copy-progress');
      hero.style.removeProperty('--hero-linkedin-progress');
      titleMorph = null;
      void hero.offsetHeight;
      const heightDelta = hero.offsetHeight - heroH;
      if (heightDelta !== 0) {
        window.scrollTo(0, scrollY + heightDelta);
      }
      enableHeroCollapseTrack();
    }

    function clearIntroPulse() {
      if (hasIntroScrolled) return;
      hasIntroScrolled = true;
      nav?.classList.remove('nav--intro-pulse');
    }

    function applyIntro(rawProgress) {
      const raw = clamp(rawProgress, 0, 1);
      const titleP = clamp(raw / TITLE_END, 0, 1);

      let imageP = 0;
      if (raw >= IMAGE_START) {
        imageP = easeOut(clamp((raw - IMAGE_START) / (IMAGE_END - IMAGE_START), 0, 1));
      }
      maxImageP = Math.max(maxImageP, imageP);
      imageP = maxImageP;

      let subtitleP = 0;
      if (titleLayoutSettled && raw >= SUBTITLE_START) {
        subtitleP = easeOut(clamp((raw - SUBTITLE_START) / (SUBTITLE_END - SUBTITLE_START), 0, 1));
      }

      let copyP = 0;
      if (titleLayoutSettled && raw >= COPY_START) {
        copyP = easeOut(clamp((raw - COPY_START) / (COPY_END - COPY_START), 0, 1));
      }

      let linkedinP = 0;
      if (titleLayoutSettled && raw >= LINKEDIN_START) {
        linkedinP = easeOut(clamp((raw - LINKEDIN_START) / (LINKEDIN_END - LINKEDIN_START), 0, 1));
      }

      hero.style.setProperty('--hero-title-progress', String(titleP));
      hero.style.setProperty('--hero-image-progress', String(imageP));
      hero.style.setProperty('--hero-subtitle-progress', String(subtitleP));
      hero.style.setProperty('--hero-copy-progress', String(copyP));
      hero.style.setProperty('--hero-linkedin-progress', String(linkedinP));
      document.body.style.setProperty('--hero-title-progress', String(titleP));
      document.body.style.setProperty('--hero-image-progress', String(imageP));
      document.body.style.setProperty('--hero-subtitle-progress', String(subtitleP));
      document.body.style.setProperty('--hero-copy-progress', String(copyP));
      document.body.style.setProperty('--hero-linkedin-progress', String(linkedinP));
      applyTitleMorph(titleP);
      settleTitleLayoutIfReady(titleP);
      applyImageReveal(imageP);
      nav?.classList.toggle('nav--intro-ready', imageP >= 0.45);

      if (
        raw >= INTRO_FINISH
        || (imageP >= 1 && titleP >= 1 && subtitleP >= 1 && copyP >= 1 && linkedinP >= 1)
      ) {
        finishIntro();
      }
    }

    function update() {
      if (introFinished || document.body.classList.contains('hero-intro-done')) return;
      if (scrollProgress() > 0 || window.scrollY > 0) {
        clearIntroPulse();
      }
      applyIntro(scrollProgress());
    }

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    }

    function onResize() {
      hero.style.setProperty('--hero-intro-track', `${trackPx()}px`);
      if (titleLayoutSettled) {
        update();
        return;
      }
      if (
        title.classList.contains('hero__title--intro-center')
        || document.body.classList.contains('page-home--intro')
      ) {
        fitIntroTitleToViewport();
        measureTitleMorphTargets();
        title.style.visibility = 'visible';
      }
      update();
    }

    let introBooted = false;
    let titleLayoutSettled = false;

    function showIntroTitle() {
      title.classList.add('hero__title--intro-center');
      title.style.visibility = 'visible';
      title.style.opacity = '1';
      fitIntroTitleToViewport();
      if (titleMorph) {
        applyTitleMorph(0);
      } else {
        title.style.transform = 'translate(-50%, -50%)';
      }
      document.body.classList.remove('page-home--intro');
      document.body.classList.add('hero-intro-letters-in');
      lettersTimerId = window.setTimeout(update, 820);
    }

    function boot() {
      if (introBooted) return;
      introBooted = true;
      nav?.classList.add('nav--intro-pulse');
      try {
        measureTitleMorphTargets();
      } catch (_) {
        titleMorph = null;
      }
      void hero.offsetHeight;
      showIntroTitle();
      update();
    }

    function waitForIntroFonts() {
      const timeout = new Promise(resolve => setTimeout(resolve, 900));
      const loads = [
        document.fonts?.load?.('500 15px "General Sans"'),
        document.fonts?.load?.('400 15px Manrope'),
        document.fonts?.load?.('600 16px "General Sans"'),
        document.fonts?.load?.('600 16px Manrope'),
      ].filter(Boolean).map(p => p.catch(() => {}));

      return Promise.race([
        Promise.all([Promise.all(loads), document.fonts?.ready ?? Promise.resolve()]),
        timeout,
      ]);
    }

    boot();
    requestAnimationFrame(boot);
    waitForIntroFonts().then(() => {
      if (!introBooted) {
        requestAnimationFrame(boot);
        return;
      }
      if (scrollProgress() > 0.02 || introFinished) return;
      fitIntroTitleToViewport();
      measureTitleMorphTargets();
      title.style.visibility = 'visible';
      applyTitleMorph(parseFloat(hero.style.getPropertyValue('--hero-title-progress') || '0'));
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lettersTimerId) clearTimeout(lettersTimerId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      hero.style.removeProperty('--hero-intro-track');
      hero.style.removeProperty('--hero-intro-title-slot');
      hero.style.removeProperty('--hero-intro-title-fit');
      document.body.style.removeProperty('--hero-intro-title-fit');
      clearImageReveal();
      nav?.classList.remove('nav--intro-ready', 'nav--intro-pulse');
      titleMorph = null;
      title.classList.remove('hero__title--intro-center', 'hero__title--intro-split');
      clearIntroTitleInlinePosition();
      clearIntroSubtitleInlinePosition();
      title.style.visibility = '';
      document.body.classList.remove(
        'hero-intro-active',
        'hero-intro-done',
        'hero-intro-letters-in',
        'hero-intro-title-settled',
        'page-home--intro'
      );
      document.body.style.removeProperty('--hero-title-progress');
      document.body.style.removeProperty('--hero-image-progress');
      document.body.style.removeProperty('--hero-subtitle-progress');
      document.body.style.removeProperty('--hero-copy-progress');
      document.body.style.removeProperty('--hero-linkedin-progress');
      hero.style.removeProperty('--hero-title-progress');
      hero.style.removeProperty('--hero-image-progress');
      hero.style.removeProperty('--hero-subtitle-progress');
      hero.style.removeProperty('--hero-copy-progress');
      hero.style.removeProperty('--hero-linkedin-progress');
      title.style.opacity = '';
      maxImageP = 0;
      hasIntroScrolled = false;
      introBooted = false;
      titleLayoutSettled = false;
      document.body.classList.remove('hero-intro-title-settled');
    };
  }

  /** Home hero: staggered copy reveal on first paint and after SPA swap to home. */
  function initHeroEntrance() {
    if (!document.body.classList.contains('page-home')) return () => {};

    const hero = document.querySelector('.hero');
    if (!hero) return () => {};

    const morphIntro = document.body.classList.contains('hero-intro-active')
      || document.body.classList.contains('hero-intro-done');

    hero.classList.remove('hero--ready');
    hero.classList.add('hero--hold');
    document.body.classList.remove('home-motion-on');

    if (morphIntro) {
      hero.classList.remove('hero--hold');
      hero.classList.add('hero--ready');
      document.body.classList.add('home-motion-on');
      homeScrollRevealEnabled = true;
      return () => {
        hero.classList.remove('hero--ready', 'hero--hold');
        document.body.classList.remove('home-motion-on');
      };
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.classList.remove('hero--hold');
      hero.classList.add('hero--ready');
      document.body.classList.add('home-motion-on');
      homeScrollRevealEnabled = true;
      revealVisibleHomeBlocks();
      return () => {
        hero.classList.remove('hero--ready', 'hero--hold');
        document.body.classList.remove('home-motion-on');
        homeScrollRevealEnabled = false;
      };
    }

    const startId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.classList.remove('hero--hold');
        hero.classList.add('hero--ready');
        document.body.classList.add('home-motion-on');
        homeScrollRevealEnabled = true;
        revealVisibleHomeBlocks();
      });
    });

    return () => {
      cancelAnimationFrame(startId);
      homeScrollRevealEnabled = false;
      hero.classList.remove('hero--ready', 'hero--hold');
      document.body.classList.remove('home-motion-on');
    };
  }

  /** True when a home reveal target has entered the viewport (not just “near” it). */
  function isHomeRevealInView(el) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    return r.top < vh * 0.82 && r.bottom > vh * 0.12;
  }

  function revealVisibleHomeBlocks() {
    if (!document.body.classList.contains('page-home') || !homeScrollRevealEnabled) return;
    document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
      if (!isHomeRevealInView(el)) return;
      el.classList.add('is-in');
      revealObserver?.unobserve(el);
    });
  }

  /** About hero: staggered copy + polaroid on first paint and after SPA swap. */
  function initAboutEntrance() {
    if (!document.body.classList.contains('page-about')) return () => {};

    const hero = document.querySelector('.about--page');
    if (!hero) return () => {};

    setupAboutPageMotion();

    hero.classList.remove('about--ready');
    hero.classList.add('about--hold');
    document.body.classList.remove('about-motion-on');

    function markHeroIn() {
      document.querySelectorAll('.about--page .about__copy, .about--page .about__visual').forEach(el => {
        el.classList.add('is-in');
        revealObserver?.unobserve(el);
      });
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.classList.remove('about--hold');
      hero.classList.add('about--ready');
      document.body.classList.add('about-motion-on');
      aboutScrollRevealEnabled = true;
      markHeroIn();
      revealVisibleAboutBlocks();
      return () => {
        hero.classList.remove('about--ready', 'about--hold');
        document.body.classList.remove('about-motion-on');
        aboutScrollRevealEnabled = false;
      };
    }

    const startId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.classList.remove('about--hold');
        hero.classList.add('about--ready');
        document.body.classList.add('about-motion-on');
        aboutScrollRevealEnabled = true;
        markHeroIn();
        revealVisibleAboutBlocks();
      });
    });

    return () => {
      cancelAnimationFrame(startId);
      aboutScrollRevealEnabled = false;
      hero.classList.remove('about--ready', 'about--hold');
      document.body.classList.remove('about-motion-on');
    };
  }

  function revealVisibleAboutBlocks() {
    if (!document.body.classList.contains('page-about') || !aboutScrollRevealEnabled) return;
    document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
      if (!isHomeRevealInView(el)) return;
      el.classList.add('is-in');
      revealObserver?.unobserve(el);
    });
  }

  /** About page: hero stagger, track cards, career, jewel cards, outside-of-design. */
  function setupAboutPageMotion() {
    if (!document.body.classList.contains('page-about')) return;

    const heroCopy = document.querySelector('.about__copy');
    const heroVisual = document.querySelector('.about__visual');
    if (heroCopy) heroCopy.classList.add('reveal', 'reveal--stagger');
    if (heroVisual) heroVisual.classList.add('reveal', 'reveal--slide-right');

    const careerHead = document.querySelector('.career__head');
    if (careerHead) careerHead.classList.add('reveal', 'reveal--soft');

    document.querySelectorAll('.career__item').forEach((item, i) => {
      item.classList.add('reveal');
      item.style.setProperty('--reveal-delay', `${i * 75}ms`);
    });

    const sideActsKicker = document.querySelector('.side-acts__inner > .kicker');
    if (sideActsKicker) sideActsKicker.classList.add('reveal', 'reveal--soft');

    document.querySelectorAll('.side-acts .sa-card').forEach((card, i) => {
      card.classList.add('reveal', 'reveal--scale');
      card.style.setProperty('--reveal-delay', `${i * 110}ms`);
    });

    const outsideHead = document.querySelector('.outside-design__head');
    if (outsideHead) outsideHead.classList.add('reveal', 'reveal--soft');

    const outsideBody = document.querySelector('.outside-design__body');
    if (outsideBody) outsideBody.classList.add('reveal', 'reveal--stagger');

    document.querySelectorAll('.outside-design__media > *').forEach((el, i) => {
      el.classList.add('reveal', i === 0 ? 'reveal--slide-right' : 'reveal--scale');
      el.style.setProperty('--reveal-delay', `${i * 120}ms`);
    });

    document.querySelectorAll('.foot__inner').forEach(el => {
      el.classList.add('reveal');
    });

    document.querySelectorAll('.career, .side-acts, .outside-design').forEach(section => {
      section.classList.add('about-section');
    });
  }

  /** Home-only scroll reveals: staggered heads, records, CDs, testimonials, footer. */
  function setupHomePageMotion() {
    if (!document.body.classList.contains('page-home')) return;

    document.querySelectorAll(
      '.works .section__head, .lineup .section__head, .ai-shelf__head, .testimonials__header'
    ).forEach(head => {
      head.classList.add('reveal', 'reveal--stagger');
    });

    document.querySelectorAll('.lineup__floor').forEach(el => {
      el.classList.add('reveal', 'reveal--slide-right');
    });

    const mqMobileCrate = window.matchMedia('(max-width: 880px)');
    document.querySelectorAll('.works .crate > .record').forEach((rec, i) => {
      if (!mqMobileCrate.matches) return;
      rec.classList.add('reveal', 'reveal--lift');
      rec.style.setProperty('--reveal-delay', `${Math.min(i * 100, 380)}ms`);
    });

    document.querySelectorAll('.ai-shelf .cd-rack > li').forEach((li, i) => {
      li.classList.add('reveal', 'reveal--scale');
      li.style.setProperty('--reveal-delay', `${i * 110}ms`);
    });

    document.querySelectorAll('.ai-shelf__more-wrap').forEach(el => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', '300ms');
    });

    document.querySelectorAll('.testimonials__stage').forEach(el => {
      el.classList.add('reveal', 'reveal--soft');
      el.style.setProperty('--reveal-delay', '120ms');
    });

    document.querySelectorAll('.foot__inner').forEach(el => {
      el.classList.add('reveal');
    });

    document.querySelectorAll('.works, .lineup, .ai-shelf, .testimonials').forEach(section => {
      section.classList.add('home-section');
    });
  }

  function setupRevealOnScroll() {
    setupHomePageMotion();
    setupAboutPageMotion();

    const isHome = document.body.classList.contains('page-home');
    const isAbout = document.body.classList.contains('page-about');
    const selectorList = isHome
      ? [
          '.about__copy',
          '.about__visual',
          '.cs-page-hero__inner',
          '.cs-grid-section .cs-grid > .cs-card',
          'article.csd > .csd-back-wrap',
          'article.csd > section:not(.gwi-pivot-drop)',
        ]
      : isAbout
      ? [
          '.cs-page-hero__inner',
          '.cs-grid-section .cs-grid > .cs-card',
          'article.csd > .csd-back-wrap',
          'article.csd > section:not(.gwi-pivot-drop)',
        ]
      : [
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
        ];

    const reveal = document.querySelectorAll(selectorList.join(', '));
    reveal.forEach(el => el.classList.add('reveal'));

    const allReveal = document.querySelectorAll('.reveal');

    /** Desktop + late font layout can leave blocks at opacity:0 if IO misses once; re-run after paint. */
    function unblockVisibleReveals() {
      if (isHome) {
        if (!homeScrollRevealEnabled) return;
        revealVisibleHomeBlocks();
        return;
      }
      if (isAbout) {
        if (!aboutScrollRevealEnabled) return;
        revealVisibleAboutBlocks();
        return;
      }
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
      const usesPremiumReveal = isHome || isAbout;
      const revealRootMargin = usesPremiumReveal ? '0px 0px -14% 0px' : '0px 0px 45% 0px';
      const revealThreshold = usesPremiumReveal ? 0.14 : 0.02;

      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          if (isHome && !homeScrollRevealEnabled) return;
          if (isAbout && !aboutScrollRevealEnabled) return;
          const target = entry.target;
          if (target.classList.contains('home-section') || target.classList.contains('about-section')) {
            target.classList.add('is-section-in');
          } else {
            target.classList.add('is-in');
          }
          revealObserver.unobserve(target);
        });
      }, { rootMargin: revealRootMargin, threshold: revealThreshold });

      allReveal.forEach(el => revealObserver.observe(el));
      document.querySelectorAll('.page-home .home-section').forEach(section => {
        revealObserver.observe(section);
      });
      document.querySelectorAll('.page-about .about-section').forEach(section => {
        revealObserver.observe(section);
      });

      if (isHome && homeScrollRevealEnabled) {
        revealVisibleHomeBlocks();
      }

      if (isAbout && aboutScrollRevealEnabled) {
        revealVisibleAboutBlocks();
      }

      if (!usesPremiumReveal) {
        requestAnimationFrame(unblockVisibleReveals);
        setTimeout(unblockVisibleReveals, 120);
        setTimeout(unblockVisibleReveals, 450);
        setTimeout(unblockVisibleReveals, 1100);
        if (document.readyState === 'complete') {
          requestAnimationFrame(unblockVisibleReveals);
        } else {
          window.addEventListener('load', () => requestAnimationFrame(unblockVisibleReveals), { once: true });
        }
      }

      /* IO can still occasionally miss sections (scroll timing, WKWebKit, SPA swap). Guarantee visibility. */
      if (revealSafetyTimerId !== null) clearTimeout(revealSafetyTimerId);
      const safetyMs = usesPremiumReveal ? 4000 : 2200;
      revealSafetyTimerId = setTimeout(() => {
        revealSafetyTimerId = null;
        if (usesPremiumReveal) {
          document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
            if (isHomeRevealInView(el)) {
              el.classList.add('is-in');
              revealObserver?.unobserve(el);
            }
          });
          return;
        }
        document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
          el.classList.add('is-in');
          revealObserver?.unobserve(el);
        });
      }, safetyMs);
    } else {
      allReveal.forEach(el => el.classList.add('is-in'));
    }
  }

  /**
   * Loads career-agent.js once (any entry page) so SPA navigation to about.html works.
   * @returns {() => void}
   */
  function initCareerAgent() {
    careerAgentCleanup();
    careerAgentCleanup = () => {};

    const root = document.getElementById('career-agent');
    if (!root) return () => {};

    const gen = careerAgentLoadGen;

    let innerCleanup = () => {};

    function applyInit() {
      if (gen !== careerAgentLoadGen) return;
      if (!root.isConnected) return;
      if (typeof window.PortfolioCareerAgent?.init !== 'function') return;
      innerCleanup();
      innerCleanup = window.PortfolioCareerAgent.init(root) || (() => {});
    }

    if (typeof window.PortfolioCareerAgent?.init === 'function') {
      applyInit();
    } else {
      const existing = document.querySelector('script[data-portfolio-career-agent]');
      if (existing) {
        existing.addEventListener('load', () => applyInit(), { once: true });
      } else {
        const ref = document.querySelector('script[src*="script.js"]');
        const base = ref && ref.src ? ref.src.replace(/script\.js(\?[^#]*)?$/i, '') : '';
        const s = document.createElement('script');
        s.src = `${base}career-agent.js`;
        s.async = true;
        s.setAttribute('data-portfolio-career-agent', '1');
        s.addEventListener('load', () => {
          applyInit();
        });
        document.head.appendChild(s);
      }
    }

    return () => {
      innerCleanup();
      innerCleanup = () => {};
      careerAgentLoadGen += 1;
    };
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

  /** planning-inspectorate.html: publish flow before/after (auto-cycles when in view) */
  function initPinsPublishFlow() {
    const cb = document.getElementById('pins-publish-flow-toggle');
    if (!cb) return () => {};

    const root = cb.closest('.pins-flow');
    const before = root?.querySelector('.pins-flow__track--before');
    const after = root?.querySelector('.pins-flow__track--after');
    if (!before || !after) return () => {};

    const removers = [];
    const CYCLE_MS = 4500;
    let cycleTimer = null;
    let userControlled = false;

    function sync() {
      const on = cb.checked;
      before.setAttribute('aria-hidden', on ? 'true' : 'false');
      after.setAttribute('aria-hidden', on ? 'false' : 'true');
    }

    function clearCycle() {
      if (cycleTimer !== null) {
        clearInterval(cycleTimer);
        cycleTimer = null;
      }
    }

    function startCycle() {
      if (userControlled || cycleTimer !== null) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      cycleTimer = setInterval(() => {
        cb.checked = !cb.checked;
        sync();
      }, CYCLE_MS);
    }

    function onChange(e) {
      sync();
      if (e.isTrusted) {
        userControlled = true;
        clearCycle();
      }
    }

    sync();
    cb.addEventListener('change', onChange);
    removers.push(() => cb.removeEventListener('change', onChange));

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && root) {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !userControlled) startCycle();
            else clearCycle();
          });
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.25 }
      );
      observer.observe(root);
      removers.push(() => observer.disconnect());
    }

    return () => {
      clearCycle();
      removers.forEach(fn => fn());
    };
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

  function initTestimonialCarousel() {
    const track = document.getElementById('testimonials-track');
    const carousel = document.getElementById('testimonials-carousel');
    if (!track || !carousel) return () => {};

    const slides = Array.from(track.querySelectorAll('.oryzo-t__slide'));
    const dots = Array.from(document.querySelectorAll('#testimonials-dots .oryzo-t__dot'));
    const prevBtn = document.getElementById('testimonials-prev');
    const nextBtn = document.getElementById('testimonials-next');
    const count = slides.length;
    if (!count) return () => {};

    let current = 0;
    let touchStartX = 0;
    let touchDeltaX = 0;
    let isDragging = false;

    function mod(n, m) {
      return ((n % m) + m) % m;
    }

    function positionSlides(activeIndex) {
      slides.forEach((slide, i) => {
        let offset = i - activeIndex;
        if (offset > count / 2) offset -= count;
        if (offset < -count / 2) offset += count;

        slide.dataset.offset = String(offset);
        slide.classList.toggle('is-active', offset === 0);
        slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');

        const card = slide.querySelector('.oryzo-t__card');
        if (card) card.setAttribute('tabindex', offset === 0 ? '0' : '-1');
      });

      track.dataset.active = String(activeIndex);
    }

    function goTo(index) {
      const next = mod(index, count);
      if (next === current) return;
      current = next;
      positionSlides(current);

      dots.forEach((dot, i) => {
        const active = i === current;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function onPrevClick(e) {
      e.preventDefault();
      prev();
    }

    function onNextClick(e) {
      e.preventDefault();
      next();
    }

    function onDotClick(e) {
      const dot = e.currentTarget;
      goTo(parseInt(dot.dataset.index, 10));
    }

    function onCardClick(e) {
      const slide = e.currentTarget.closest('.oryzo-t__slide');
      if (!slide) return;
      const offset = parseInt(slide.dataset.offset, 10);
      if (offset === 0 || Number.isNaN(offset)) return;
      e.preventDefault();
      e.stopPropagation();
      goTo(current + offset);
    }

    function onKeydown(e) {
      if (!document.getElementById('testimonials')) return;
      if (e.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }

    function onPointerDown(e) {
      if (e.button !== 0) return;
      const slide = e.target.closest('.oryzo-t__slide');
      if (slide && slide.dataset.offset !== '0') return;
      isDragging = true;
      touchStartX = e.clientX;
      touchDeltaX = 0;
      carousel.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      touchDeltaX = e.clientX - touchStartX;
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      carousel.releasePointerCapture(e.pointerId);
      if (Math.abs(touchDeltaX) > 48) {
        if (touchDeltaX < 0) next();
        else prev();
      }
      touchDeltaX = 0;
    }

    function onPointerCancel() {
      isDragging = false;
      touchDeltaX = 0;
    }

    prevBtn?.addEventListener('click', onPrevClick);
    nextBtn?.addEventListener('click', onNextClick);
    dots.forEach(dot => dot.addEventListener('click', onDotClick));
    slides.forEach(slide => {
      slide.querySelector('.oryzo-t__card')?.addEventListener('click', onCardClick);
    });
    document.addEventListener('keydown', onKeydown);
    carousel.addEventListener('pointerdown', onPointerDown);
    carousel.addEventListener('pointermove', onPointerMove);
    carousel.addEventListener('pointerup', onPointerUp);
    carousel.addEventListener('pointercancel', onPointerCancel);

    positionSlides(0);

    return () => {
      prevBtn?.removeEventListener('click', onPrevClick);
      nextBtn?.removeEventListener('click', onNextClick);
      dots.forEach(dot => dot.removeEventListener('click', onDotClick));
      slides.forEach(slide => {
        slide.querySelector('.oryzo-t__card')?.removeEventListener('click', onCardClick);
      });
      document.removeEventListener('keydown', onKeydown);
      carousel.removeEventListener('pointerdown', onPointerDown);
      carousel.removeEventListener('pointermove', onPointerMove);
      carousel.removeEventListener('pointerup', onPointerUp);
      carousel.removeEventListener('pointercancel', onPointerCancel);
    };
  }

  function initDynamicPage() {
    heroIntroCleanup = initHeroIntro();
    heroScrollCollapseCleanup = initHeroScrollCollapse();
    heroEntranceCleanup = initHeroEntrance();
    aboutEntranceCleanup = initAboutEntrance();
    initCaseStudyRecordClicks();
    watchHomeIntroForSpotifyFab();

    function initBelowFoldInteractions() {
      try {
        recordStackCleanup = initRecordStack();
        flipImagesCleanup  = initFlipImages();
        fosHotspotCleanup  = initFosConceptHotspots();
        aiSleeveCleanup    = initAISleeves();
        pivotDropCleanup   = initGwiPivotDrop();
        pinsFlowCleanup    = initPinsPublishFlow();
        careerAgentCleanup = initCareerAgent();
        testimonialCarouselCleanup = initTestimonialCarousel();
        initTrackCards();
        const runRevealSetup = () => setupRevealOnScroll();
        const deferReveal =
          (document.body.classList.contains('page-home') || document.body.classList.contains('page-about'))
          && 'requestIdleCallback' in window;
        if (deferReveal) {
          requestIdleCallback(runRevealSetup, { timeout: 350 });
        } else {
          runRevealSetup();
        }
      } catch {
        /* One bad interaction should not strand the SPA shell entirely. */
      }
    }

    if (document.body.classList.contains('page-home')) {
      deferNonCriticalWork(initBelowFoldInteractions);
    } else {
      initBelowFoldInteractions();
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
    const spotifyCta       = document.getElementById('spotify-fab-cta');

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

      if (spotifyCta) {
        const ctaText = fabPlayingChip
          ? ''
          : spotifyUserEverStartedPlayback
            ? 'Resume'
            : open
              ? 'Hit play'
              : 'Play me';
        spotifyCta.textContent = ctaText;
        spotifyCta.hidden = !ctaText;
        spotifyCta.classList.toggle('spotify-fab__cta--dim', open && !spotifyUserEverStartedPlayback);
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

  document.addEventListener('click', e => {
    if (e.button !== 0) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (window.location.protocol === 'file:') return;
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
    if (window.location.protocol === 'file:') {
      window.location.reload();
      return;
    }
    spaNavigate(window.location.href, { replace: true });
  });

  updateNavAriaCurrent(window.location.href);
  syncBodyPageClasses(window.location.href);
  watchHomeIntroForSpotifyFab();

})();
