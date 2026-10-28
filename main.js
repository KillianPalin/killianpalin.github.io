(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const P = window.PROJECTS || [];
  const bySlug = Object.fromEntries(P.map(p => [p.slug, p]));
  const CAT = { vfx: 'VFX', edit: 'Montage', motion: 'Motion', ia: 'IA' };
  const cats = p => p.cats.map(c => CAT[c]).join(', ');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  let vw = innerWidth, vh = innerHeight;

  /* ---------- Visuels de survol (deuxième image du projet) ---------- */
  const ALT = {
    'ysl-rouge-sur-mesure': 0, 'canal-squid-game': 1, 'afflelou-tchin-tchin-ete': 2, 'heetch-choose-uber-1': 1,
    'seconde-chance-black-dogs': 2, 'remi-babinet-pas-de-publicte-merci': 2, 'adidas-case': 1,
    'loreal-mission-impossible': 1, 'street-nav-case-study': 2
  };
  const ORDER = ['ysl-rouge-sur-mesure', 'guerlain-gold-nobile', 'canal-squid-game', 'sephora-stretch', 'hennessy-xo-cognac', 'sephora-champs-elysees', 'giant-in-new-york', 'coachella-aftermovie',
    'lacoste', 'afflelou-tchin-tchin-ete', 'heetch-choose-uber-1', 'helmet-canadiens', 'rona', 'loreal-mission-impossible',
    'seconde-chance-black-dogs', 'lacoste-vision', 'clarins-beautiful-stories', 'adidas-case'];
  const sorted = [...ORDER.map(s => bySlug[s]).filter(Boolean), ...P.filter(p => !ORDER.includes(p.slug))];

  /* ---------- Projets : cadres flottants ---------- */
  const cardsEl = document.querySelector('[data-cards]');
  const cardHTML = (p, i) => {
    const alt = ALT[p.slug] !== undefined ? `<img class="alt" src="img/cards/detail-${p.slug}-${ALT[p.slug]}.webp" alt="" loading="lazy" width="900" height="700">` : '';
    return `<button type="button" class="card" data-open="${p.slug}" data-cursor="Voir le projet" style="--d:${(-(i * 1.37) % 7).toFixed(2)}s">
      <span class="card-media"><img src="img/cards/work-${p.slug}.webp" alt="${p.brand}, ${p.film}" width="900" height="700">${alt}</span>
      <span class="card-body"><span class="card-title"><b>${p.brand}</b> ${p.film}</span><span class="card-meta">${cats(p)} · ${p.year}</span></span>
    </button>`;
  };
  let filter = 'all', cols = [];
  function colCount() { return vw <= 700 ? 1 : vw <= 1000 ? 2 : 3; }
  function buildCards() {
    const list = sorted.filter(p => filter === 'all' || p.cats.includes(filter));
    const n = colCount();
    const buckets = Array.from({ length: n }, () => []);
    list.forEach((p, i) => buckets[i % n].push(cardHTML(p, i)));
    cardsEl.innerHTML = buckets.map(b => `<div class="col">${b.join('')}</div>`).join('');
    cols = [...cardsEl.children];
    if (finePointer && !reduce) cardsEl.querySelectorAll('.card').forEach(tilt);
  }
  function tilt(card) {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); });
  }
  buildCards();
  const counts = { all: P.length };
  P.forEach(p => p.cats.forEach(c => counts[c] = (counts[c] || 0) + 1));
  document.querySelectorAll('[data-count]').forEach(s => s.textContent = counts[s.dataset.count] || 0);
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    filter = btn.dataset.filter; buildCards();
  }));

  /* ---------- Lecteur ---------- */
  const film = document.querySelector('[data-film]');
  const iframe = film.querySelector('[data-film-iframe]');
  function openFilm(slug) {
    const p = bySlug[slug]; if (!p) return;
    film.querySelector('[data-film-title]').textContent = `${p.brand}, ${p.film}`;
    film.querySelector('[data-film-meta]').textContent = `${cats(p)} · ${p.year}`;
    film.querySelector('[data-film-text]').textContent = p.text;
    film.classList.toggle('is-vertical', !!p.vertical); // reels Instagram en 9:16
    iframe.src = p.embed.replace('lazyLoading=true', 'lazyLoading=false');
    lenis && lenis.stop();
    film.showModal();
  }
  film.addEventListener('close', () => { iframe.src = 'about:blank'; lenis && lenis.start(); });
  film.querySelector('[data-film-close]').addEventListener('click', () => film.close());
  film.addEventListener('click', e => { if (e.target === film) film.close(); });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open]');
    if (t) { e.preventDefault(); openFilm(t.dataset.open); }
  });

  /* ---------- Formulaire : envoi direct par FormSubmit ---------- */
  const form = document.querySelector('[data-form]');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = form.querySelector('[data-status]'), btn = form.querySelector('[data-submit]');
    const fd = new FormData(form);
    if (fd.get('_honey')) return;
    const data = Object.fromEntries([...fd.keys()].map(k => [k, fd.getAll(k).join(', ')]));
    data._replyto = data.email;
    btn.disabled = true; status.className = 'form-status'; status.textContent = 'Envoi en cours…';
    try {
      const r = await fetch('https://formsubmit.co/ajax/killianpalin.pro@gmail.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === 'false' || j.success === false) throw new Error(j.message || 'Erreur');
      form.reset(); status.className = 'form-status ok'; status.textContent = 'Merci, ton message est parti. Je te réponds vite.';
    } catch (err) {
      status.className = 'form-status err';
      status.innerHTML = 'L\'envoi n\'a pas marché. Écris-moi directement à <a href="mailto:killianpalin.pro@gmail.com">killianpalin.pro@gmail.com</a>.';
    } finally { btn.disabled = false; }
  });

  /* ---------- Hero : réveil au scroll, regard qui suit la souris ---------- */
  const wrap = document.querySelector('.hero-wrap');
  const frameEl = document.querySelector('[data-hero]');
  const canvas = frameEl.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const hint = document.querySelector('[data-hint]');
  const halfL = document.querySelector('.half-l'), halfR = document.querySelector('.half-r');
  const lede = document.querySelector('.hero-lede');
  const F = window.HERO_FRAMES || null;
  const seq = { wake: [], left: [], right: [] };
  let lastDrawn = null;

  if (F && !reduce) {
    const small = vw <= 900;
    const load = (key) => new Promise(done => {
      const s = F[key]; let left = s.n;
      for (let i = 0; i < s.n; i++) {
        const im = new Image();
        im.decoding = 'async';
        const fin = () => { if (--left === 0) done(); };
        im.onerror = fin;
        im.onload = () => {
          // image décodée à l'avance : pas de saccade quand la souris bouge vite
          if (window.createImageBitmap) createImageBitmap(im).then(b => { seq[key][i] = b; fin(); }, fin);
          else fin();
        };
        im.src = `${F.base}${small ? F.small : F.large}/${key}/${String(i + 1).padStart(3, '0')}.${F.ext}`;
        seq[key][i] = im;
      }
    });
    load('wake').then(() => { doc.classList.add('has-frames'); return Promise.all([load('left'), load('right')]); });
  }
  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = frameEl.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    lastDrawn = null;
  }
  sizeCanvas();
  function draw(im) {
    if (!ready(im) || im === lastDrawn) return;
    const cw = canvas.width, ch = canvas.height, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) * 0.4, w, h);
    lastDrawn = im;
  }
  const ready = im => !!im && (im instanceof ImageBitmap || (im.complete && im.naturalWidth > 0));
  const pick = (arr, t) => {
    let i = Math.round(clamp(t, 0, 1) * (arr.length - 1));
    while (i > 0 && !ready(arr[i])) i--;
    return arr[i];
  };
  const look = { v: 0, t: 0 };
  addEventListener('pointermove', e => { look.t = clamp((e.clientX / vw) * 2 - 1, -1, 1); }, { passive: true });

  /* ---------- Curseur et boutons ---------- */
  const cursor = document.querySelector('.cursor');
  const cur = { x: -200, y: -200, tx: -200, ty: -200 };
  if (finePointer) {
    addEventListener('pointermove', e => { cur.tx = e.clientX; cur.ty = e.clientY; }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-on', !!t);
      if (t) cursor.firstElementChild.textContent = t.dataset.cursor;
    });
  }

  /* ---------- Barre ---------- */
  const bar = document.querySelector('.bar');
  let lastY = 0, travel = 0, barHidden = false;

  /* ---------- Entrées ---------- */
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal, [data-reveal]').forEach(el => revealIO.observe(el));
  let pending = [...document.querySelectorAll('.reveal, [data-reveal]')];
  if (vw <= 700) { pending.forEach(el => el.classList.add('is-in')); pending = []; }

  /* ---------- Défilement doux ---------- */
  let lenis = null;
  function startLenis() {
    if (reduce || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const el = id === '#top' || id === '#' ? 0 : document.querySelector(id);
      if (el === null) return; e.preventDefault(); lenis.scrollTo(el);
    }));
  }

  /* ---------- Boucle ---------- */
  function frame(now) {
    if (lenis) lenis.raf(now);
    const y = scrollY;

    // la barre ne bascule qu'après 40 px dans le même sens : plus de clignotement
    const dy = y - lastY;
    if (dy !== 0) travel = (Math.sign(dy) === Math.sign(travel)) ? travel + dy : dy;
    if (!barHidden && travel > 40 && y > vh * 0.6 && !film.open) { barHidden = true; bar.classList.add('is-hidden'); }
    else if (barHidden && (travel < -40 || y < vh * 0.6 || film.open)) { barHidden = false; bar.classList.remove('is-hidden'); }
    const solid = y > wrap.offsetHeight - vh;
    if (solid !== bar.classList.contains('is-solid')) bar.classList.toggle('is-solid', solid);
    lastY = y;

    // hero
    const span = wrap.offsetHeight - vh;
    if (y < wrap.offsetHeight) {
      const p = clamp(y / span, 0, 1);
      const wakeT = clamp(p / 0.45, 0, 1);          // 0 → 45 % : les yeux s'ouvrent
      const awake = clamp((p - 0.42) / 0.08, 0, 1);  // ensuite le regard suit la souris
      const shrink = ease(clamp((p - 0.62) / 0.38, 0, 1)); // puis l'image devient un cadre flottant
      hint.classList.toggle('is-done', p > 0.05);

      if (!finePointer) look.t = Math.sin(now / 1400) * 0.9;
      look.v = lerp(look.v, look.t * awake, 0.16);
      if (F && !reduce && seq.wake.length) {
        if (awake < 0.02 || Math.abs(look.v) < 0.02) draw(pick(seq.wake, wakeT));
        else draw(look.v < 0 ? pick(seq.left, -look.v) : pick(seq.right, look.v));
      }

      if (!reduce) {
        const sc = 1 - shrink * 0.16;
        frameEl.style.transform = `scale(${sc.toFixed(4)})`;
        frameEl.style.borderRadius = `${(shrink * 28 / sc).toFixed(1)}px`;
        lede.style.opacity = String(1 - shrink);
      }
    }

    // colonnes de projets : vitesses différentes, effet de flottement
    if (!reduce && cols.length > 1) {
      const r = cardsEl.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const k = (r.top + r.height / 2 - vh / 2) / vh;
        const speeds = [0, -70, 40];
        cols.forEach((c, i) => c.style.transform = `translate3d(0, ${(k * (speeds[i] || 0)).toFixed(1)}px, 0)`);
      }
    }

    // filet de sécurité : tout ce qui est passé au-dessus du bas de l'écran apparaît
    if (pending.length) pending = pending.filter(el => {
      if (el.classList.contains('is-in')) return false;
      if (el.getBoundingClientRect().top < vh * 0.95) { el.classList.add('is-in'); return false; }
      return true;
    });

    if (finePointer) {
      cur.x = lerp(cur.x, cur.tx, 0.2); cur.y = lerp(cur.y, cur.ty, 0.2);
      cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
    }
    requestAnimationFrame(frame);
  }

  let lastCols = colCount();
  addEventListener('resize', () => {
    vw = innerWidth; vh = innerHeight; sizeCanvas();
    if (colCount() !== lastCols) { lastCols = colCount(); buildCards(); }
  });
  addEventListener('load', startLenis);
  requestAnimationFrame(() => { doc.classList.add('is-loaded'); requestAnimationFrame(frame); });
})();
