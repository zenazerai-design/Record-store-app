/* Enhancements:
   - Stacked-record scroll effect for case studies
   - Tap-to-flip on mobile (hover handles desktop already)
   - Reveal on scroll for sections
   - Header style on scroll
*/

(() => {

  /* ──────────────────────────────────────────────────────────────────
     1. STACKED-RECORD SCROLL EFFECT
     Cards are stacked like records in a crate. As the user scrolls,
     each card peels away upward, revealing the next one beneath it.
  ────────────────────────────────────────────────────────────────── */
  function initRecordStack() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const section = document.getElementById('works');
    const crate   = section && section.querySelector('.crate');
    if (!crate) return;

    /* Reverse so the last card in the DOM sits on top of the stack
       (front / first to fly away) and the first card is at the bottom. */
    const cards = Array.from(crate.querySelectorAll(':scope > .record')).reverse();
    const N = cards.length;
    if (N < 2) return;

    /* Visual stack frames — index 0 is the front (active) card.
       ty: offset in px below the viewport centre.
       All cards are fully opaque — depth conveyed through scale only. */
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
    /* easeInOutQuad — snappy start, smooth arrival */
    const eio  = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t;

    let PER = 0, animStart = 0;

    function measure() {
      PER = Math.max(window.innerHeight * 0.95, 500);

      const head  = section.querySelector('.section__head');
      const headH = head ? head.offsetHeight : 0;

      /* animStart = document-Y where the card animation begins
         (once the section heading has scrolled out of view) */
      animStart =
        section.getBoundingClientRect().top + window.scrollY + headH;

      /* Section must be tall enough for all transitions:
         heading + full-height viewport + (N-1) card transitions + buffer */
      section.style.minHeight =
        `${headH + window.innerHeight + (N - 1) * PER + 120}px`;
    }

    /* ── Sticky full-viewport stage ── */
    Object.assign(crate.style, {
      position:    'sticky',
      top:         '0',
      height:      '100svh',
      gap:         '0',
      padding:     '0',
      maxWidth:    '100%',
      margin:      '0',
      overflow:    'visible',
      perspective: '2200px',   /* preserve 3-D flip on record__inner */
    });

    /* ── Absolutely centred cards ── */
    cards.forEach(card => {
      Object.assign(card.style, {
        position:   'absolute',
        top:        '50%',
        left:       '50%',
        width:      'min(1060px, 92vw)',
        margin:     '0',
        willChange: 'transform, opacity',
      });
      /* Pre-flag as revealed so the fade-in observer doesn't fight us */
      card.classList.add('is-in');
    });

    /* ── Per-frame update ── */
    function draw() {
      const scrolled = Math.max(0, window.scrollY - animStart);
      const sp    = scrolled / PER;                  /* float segments elapsed */
      const front = Math.min(Math.floor(sp), N - 2); /* last card always stays */
      const rawT  = sp - front;                      /* 0→1 within this segment */

      /* DWELL: the first 45 % of each scroll segment the card just sits
         there fully readable. The fly-away only starts after that. */
      const DWELL = 0.45;
      const animT = rawT < DWELL ? 0 : (rawT - DWELL) / (1 - DWELL);
      const t  = Math.min(Math.max(animT, 0), 1);
      const te = eio(t);

      const GONE_Y = -(window.innerHeight * 0.55 + 600);

      cards.forEach((card, i) => {
        let ty, sc, op = 1, ro = 0, zi, pe;

        if (i < front) {
          /* ── Already gone ── */
          ty = GONE_Y; sc = 0.88; op = 0; ro = -2;
          zi = N - i;  pe = 'none';

        } else if (i === front) {
          /* ── Front card: peeling away upward, stays fully opaque ── */
          const from = stackAt(0);
          ty = lerp(from.ty, GONE_Y, te);
          sc = lerp(from.sc, 0.88,   te);
          ro = lerp(0,       -2,     te);
          /* Only fade in the final 15 % of the animation so there's
             no ghosting when the next card is already in position */
          op = te > 0.85 ? lerp(1, 0, (te - 0.85) / 0.15) : 1;
          zi = N + 1;
          pe = t > 0.75 ? 'none' : 'auto';

        } else {
          /* ── Waiting in the stack: shift forward as front leaves ── */
          const sPos = i - front;
          const from = stackAt(sPos);
          const to   = stackAt(sPos - 1);
          ty = lerp(from.ty, to.ty, te);
          sc = lerp(from.sc, to.sc, te);
          zi = N - sPos;
          pe = 'none';
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
    window.addEventListener('scroll', draw,   { passive: true });
    window.addEventListener('resize', () => { measure(); draw(); }, { passive: true });
  }

  initRecordStack();


  /* ──────────────────────────────────────────────────────────────────
     2. TAP-TO-FLIP on touch devices (hover handles desktop)
  ────────────────────────────────────────────────────────────────── */
  const records = document.querySelectorAll('.record');
  const isTouch = matchMedia('(hover: none)').matches;

  records.forEach(rec => {
    rec.setAttribute('tabindex', '0');
    rec.addEventListener('click', () => {
      if (isTouch) rec.classList.toggle('is-flipped');
    });
    rec.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        rec.classList.toggle('is-flipped');
      }
    });
  });


  /* ──────────────────────────────────────────────────────────────────
     3. "GET IN TOUCH" — copy email + toast
  ────────────────────────────────────────────────────────────────── */
  const copyBtn = document.getElementById('copy-email');
  const toast   = document.getElementById('email-toast');
  let toastTimer;
  if (copyBtn && toast) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('zenazerai@gmail.com').then(() => {
        clearTimeout(toastTimer);
        toast.classList.add('is-visible');
        toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
      });
    });
  }


  /* ──────────────────────────────────────────────────────────────────
     4. NAV elevation on scroll
  ────────────────────────────────────────────────────────────────── */
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  /* ──────────────────────────────────────────────────────────────────
     5. REVEAL ON SCROLL — gentle fade-up for section elements
     .record is excluded: its opacity is driven by initRecordStack()
  ────────────────────────────────────────────────────────────────── */
  const reveal = document.querySelectorAll(
    '.section__head, .lineup__floor, .about__copy, .about__visual, .foot__inner'
  );
  reveal.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    reveal.forEach(el => io.observe(el));
  } else {
    reveal.forEach(el => el.classList.add('is-in'));
  }

})();
