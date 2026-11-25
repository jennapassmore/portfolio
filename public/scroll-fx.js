/* Smooth scrolling (Lenis) + per-section parallax. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Seconds the page takes to catch up with the wheel. 1 is floaty, 0.6 is snappy. */
  var SMOOTH = 0.8;
  /* Overall parallax strength. 0 turns it off, 1.5 is dramatic. */
  var STRENGTH = 1;

  var root = document.documentElement;
  var lenis = null;

  if (window.Lenis) {
    var css = document.createElement('style');
    css.textContent = 'html.lenis,html.lenis body{height:auto}html.lenis{scroll-behavior:auto!important}';
    document.head.appendChild(css);
    /* touch devices keep native scrolling */
    lenis = new window.Lenis({
      duration: SMOOTH,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      anchors: true,
      allowNestedScroll: true
    });
    [].forEach.call(document.querySelectorAll('.cp'), function (el) { el.setAttribute('data-lenis-prevent', ''); });
    /* freeze the page while the menu or contact panel is open */
    new MutationObserver(function () {
      var locked = root.classList.contains('cp-open') || root.classList.contains('nav-open');
      if (locked) lenis.stop(); else lenis.start();
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* [selector, travel in px]. Positive layers move faster than the page, negative ones lag. */
  var LAYERS = [
    /* home */
    ['.hero .hello', 26],
    ['.exp > div:first-child', 18], ['.exp-copy', 48],
    ['.dark .quote', 36], ['.center-img', 54],
    ['.work-intro > div:first-child', 22], ['.work-intro > div:last-child', 52],
    /* image and caption move as one block, so text never rides over the picture */
    ['.worklist .case', 24],
    ['.quote.dark > q', 28], ['.quote.dark > cite', 48],
    ['.history > *', 28, true],
    ['.marquees .mwrap', 14],
    ['.about > *', 34, true],
    /* case studies */
    ['.contrib > div', 24, true],
    ['.intro > *', 24, true],
    ['.sec-head > div', 26, true],
    ['.vis', 30],
    ['.big > *', 44],
    ['.impact > *', 24, true],
    ['.press > *', 30, true],
    ['.next .card', 24, true],
    /* side quests */
    ['.sq .item', 30, true],
    /* shared footer contact block */
    ['.contact .line', 34], ['#contact-form', 20]
  ];

  /* side-by-side projects can separate; stacked (phone) ones move together */
  if (innerWidth > 760) LAYERS.push(['.worklist .oth .pimg', -28], ['.worklist .oth .info', 46]);
  else LAYERS.push(['.worklist .oth', 24]);

  var items = [];
  LAYERS.forEach(function (l) {
    [].forEach.call(document.querySelectorAll(l[0]), function (el, i) {
      /* "stagger" layers alternate speed so neighbours separate */
      var amp = l[2] ? l[1] * (i % 2 ? 1.5 : 0.6) : l[1];
      items.push({ el: el, amp: amp, y: 0 });
    });
  });

  /* case-study heroes: copy drifts up, the image moves inside its own frame */
  var hero = document.querySelector('.hero-img') && document.querySelector('.hero');
  var heroKids = hero ? [].slice.call(hero.children) : [];
  var frame = document.querySelector('body > .hero-img, main > .hero-img');
  var shot = frame && frame.querySelector('img');
  if (frame) frame.style.overflow = 'hidden';
  var sqHero = document.querySelector('.sq-hero');
  var sqKids = sqHero ? [].slice.call(sqHero.children).filter(function (k) { return !k.classList.contains('hglow'); }) : [];

  var dirty = true;
  function render() {
    var vh = innerHeight, y = window.scrollY;
    var scale = STRENGTH * (innerWidth <= 760 ? 0.35 : 1);

    /* read everything first, then write */
    var next = items.map(function (it) {
      var r = it.el.getBoundingClientRect();
      if (!r.height) return it.y;
      var mid = r.top - it.y + r.height / 2;
      var t = (mid - vh / 2) / (vh / 2 + r.height / 2);
      t = Math.max(-1, Math.min(1, t));
      return t * it.amp * scale;
    });
    var fr = shot ? frame.getBoundingClientRect() : null;

    items.forEach(function (it, i) {
      if (Math.abs(next[i] - it.y) < 0.05) return;
      it.y = next[i];
      it.el.style.translate = '0 ' + it.y.toFixed(2) + 'px';
    });
    heroKids.concat(sqKids).forEach(function (k, i) {
      k.style.translate = '0 ' + (Math.min(y, vh) * -(0.05 + i * 0.04) * scale).toFixed(2) + 'px';
    });
    if (shot && fr.bottom > 0 && fr.top < vh) {
      var p = (fr.top + fr.height / 2 - vh / 2) / (vh / 2 + fr.height / 2);
      shot.style.scale = (1 + 0.14 * scale).toFixed(3);
      shot.style.translate = '0 ' + (-p * fr.height * 0.06 * scale).toFixed(2) + 'px';
    }
  }

  function mark() { dirty = true; }
  addEventListener('scroll', mark, { passive: true });
  addEventListener('resize', mark);
  addEventListener('load', mark);
  if (window.ResizeObserver) new ResizeObserver(mark).observe(document.body);

  /* one loop drives both, so parallax never trails the scroll by a frame */
  function loop(time) {
    if (lenis) lenis.raf(time);
    if (dirty) { dirty = false; render(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__lenis = lenis;
})();
