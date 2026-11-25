/* Side Quests: a small comet that travels the page with you.
   With a mouse, it drifts along after the cursor once you start scrolling.
   On touch screens, it travels its own path past each project as you scroll. */
(function () {
  var hero = document.querySelector('.sq-hero'), items = [].slice.call(document.querySelectorAll('.sq .item'));
  if (!hero || !items.length) return;
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:4';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var INK = '36,8,0', PINK = '255,166,217', ORG = '255,107,63';
  var W = 0, H = 0, pts = [], keys = [], len = 0, t0 = 0;

  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return .5 - .5 * Math.cos(Math.PI * cl(x)); }
  function sprite(c) {
    var s = document.createElement('canvas'); s.width = s.height = 128;
    var g = s.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(' + c + ',1)'); r.addColorStop(.25, 'rgba(' + c + ',.6)');
    r.addColorStop(.6, 'rgba(' + c + ',.16)'); r.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return s;
  }
  var glow = {}; glow[PINK] = sprite(PINK); glow[ORG] = sprite(ORG);
  function halo(c, x, y, r, a) { if (a <= .01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glow[c], x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
  /* page position, ignoring reveal and parallax transforms */
  function top(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }

  /* one cubic curve, sampled into the path; remembers the scroll position that should reach its end */
  function seg(c1x, c1y, c2x, c2y, x, y) {
    var a = pts[pts.length - 1], n = 80, i, t, u, px, py, last = a;
    for (i = 1; i <= n; i++) {
      t = i / n; u = 1 - t;
      px = u * u * u * a.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x;
      py = u * u * u * a.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y;
      len += Math.hypot(px - last.x, py - last.y);
      last = { x: px, y: py, l: len }; pts.push(last);
    }
    var prev = keys[keys.length - 1];
    keys.push({ s: Math.max(prev.s + 40, y - H * .62), l: len });
  }
  function build() {
    W = document.documentElement.clientWidth; H = innerHeight;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var gut = items[0].offsetLeft || 20, hh = hero.offsetHeight, narrow = W <= 760;
    len = 0; keys = [];
    /* enters from the right and rests beside the headline */
    var sx = narrow ? W - 46 : W * .74, sy = narrow ? 128 : hh * .46;
    pts = [{ x: W + 30, y: narrow ? 70 : hh * .16, l: 0 }];
    keys.push({ s: -1, l: 0 });
    seg(W * .98, sy * .5, sx + W * .1, sy, sx, sy);
    keys = [{ s: 0, l: len }];
    items.forEach(function (it, i) {
      var y = top(it), h = it.offsetHeight, right = i % 2 === 0, ex = right ? W - gut / 2 : gut / 2;
      var next = items[i + 1];
      var capY = narrow ? y + h + 24 : y + h - 24, capX = narrow ? W * .5 : W * (right ? .64 : .52);
      var from = pts[pts.length - 1];
      if (i === 0) seg(from.x - W * .1, from.y + 10, ex, from.y + 40, ex, y + h * .12);
      else { var mid = (from.y + y) / 2; seg(from.x + (ex - from.x) * .45, mid, ex, mid, ex, y + h * .12); }
      seg(ex + (right ? 6 : -6), y + h * .35, ex - (right ? 6 : -6), y + h * .5, ex, y + h * .68);
      seg(ex, capY, capX + (ex - capX) * .5, capY, capX, capY);
      if (!next) { var d = (right ? -1 : 1) * W * .1; seg(capX + d, capY, capX + d * 1.5, capY + 25, capX + d * 1.6, capY + (narrow ? 50 : 70)); }
    });
    /* the last stop must be reachable before the page runs out */
    var max = document.documentElement.scrollHeight - H;
    keys.forEach(function (k) { k.s = Math.min(k.s, max); });
  }
  function target(s) {
    for (var i = 1; i < keys.length; i++) if (s <= keys[i].s) {
      var a = keys[i - 1], b = keys[i];
      return a.l + (b.l - a.l) * cl((s - a.s) / Math.max(1, b.s - a.s));
    }
    return keys[keys.length - 1].l;
  }
  function at(l) {
    var lo = 0, hi = pts.length - 1, m;
    while (lo < hi) { m = (lo + hi) >> 1; if (pts[m].l < l) lo = m + 1; else hi = m; }
    var b = pts[lo], a = pts[Math.max(0, lo - 1)], k = cl((l - a.l) / Math.max(.001, b.l - a.l));
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  var cur = 0;

  /* mouse only: where the pointer is, and the comet's own position while it follows */
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce;
  var contact = document.querySelector('.contact');
  var mouse = null, follow = false, pos = null, vel = null, past = [], fade = 1, then = 0;
  /* how loosely it follows */
  var SPACE = 150,     /* px it likes to keep from the cursor */
      PULL = .0022,    /* how strongly it is drawn along: higher is clingier */
      GLIDE = .925;    /* momentum: closer to 1 drifts longer */
  function point(e) { if (e.pointerType !== 'touch') mouse = { x: e.clientX, y: e.clientY }; }
  if (fine) {
    addEventListener('pointermove', point, { passive: true });
    addEventListener('wheel', point, { passive: true });
  }
  function drop(x, y, now) { past.push({ x: x, y: y, t: now }); if (past.length > 90) past.shift(); }
  function steer(now, sy) {
    if (!follow) {
      if (!fine || !mouse || sy < 40) return false;
      follow = true; pos = at(cur); vel = { x: 0, y: 0 }; then = now; past = [];
      for (var l = Math.max(0, cur - 300); l < cur; l += 11) { var q = at(l); drop(q.x, q.y, now - (cur - l) * 5); }
    }
    var home = sy < 40 ? at(keys[0].l) : null;
    var gx, gy, t = now / 1000;
    if (home) { gx = home.x; gy = home.y; }
    else {
      /* drift toward a loose spot near the pointer, on whichever side it is already on, and wander a little */
      var my = mouse.y + sy, dx = pos.x - mouse.x, dy = pos.y - my, d0 = Math.hypot(dx, dy) || 1;
      gx = mouse.x + dx / d0 * SPACE + Math.sin(t * .7) * 55;
      gy = my + dy / d0 * SPACE + Math.cos(t * .9) * 40;
      gx = Math.max(24, Math.min(W - 24, gx));
      gy = Math.max(sy + 40, Math.min(sy + H - 40, gy));
    }
    /* momentum, stepped at 60 per second so it feels the same on every screen */
    for (var k = Math.min(4, (now - then) / 16.7); k > 0; k--) {
      var step = Math.min(1, k);
      vel.x = (vel.x + (gx - pos.x) * PULL * step) * Math.pow(GLIDE, step);
      vel.y = (vel.y + (gy - pos.y) * PULL * step) * Math.pow(GLIDE, step);
      pos = { x: pos.x + vel.x * step, y: pos.y + vel.y * step };
    }
    then = now;
    if (home && Math.hypot(gx - pos.x, gy - pos.y) < 3 && Math.hypot(vel.x, vel.y) < .4) { follow = false; cur = keys[0].l; return false; }
    var last = past[past.length - 1];
    if (!last) drop(pos.x, pos.y, now);
    else {
      var d = Math.hypot(pos.x - last.x, pos.y - last.y), n = Math.floor(d / 11), i;
      for (i = 1; i <= n; i++) drop(last.x + (pos.x - last.x) * i * 11 / d, last.y + (pos.y - last.y) * i * 11 / d, now);
    }
    return true;
  }

  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000, sy = scrollY;
    var goal = reduce ? len : target(sy);
    if (t < 1.8 && !reduce && sy < 5) cur = keys[0].l * ease(t / 1.8);
    else cur += (goal - cur) * (reduce ? 1 : .09);
    ctx.clearRect(0, 0, W, H);
    var chasing = steer(now, sy);
    /* step aside while someone is using the contact section */
    var busy = chasing && contact && mouse && mouse.y > contact.getBoundingClientRect().top;
    fade += ((busy ? 0 : 1) - fade) * .1;
    if (chasing) {
      past = past.filter(function (q) { return now - q.t < 2200; });
      past.forEach(function (q) {
        var fresh = cl(1 - (now - q.t) / 2200);
        ctx.fillStyle = 'rgba(' + (fresh > .45 ? ORG : INK) + ',' + (.7 * fresh * fade) + ')';
        ctx.beginPath(); ctx.arc(q.x, q.y - sy, .8 + 2 * fresh, 0, 6.283); ctx.fill();
      });
    }
    /* dotted trail along the path */
    for (var l = 0; !chasing && l < cur - 8; l += 11) {
      var p = at(l), y = p.y - sy; if (y < -20 || y > H + 20) continue;
      var fresh = cl(1 - (cur - l) / 260);
      ctx.fillStyle = 'rgba(' + (fresh > .35 ? ORG : INK) + ',' + (.26 + .55 * fresh) + ')';
      ctx.beginPath(); ctx.arc(p.x, y, 1.3 + 1.4 * fresh, 0, 6.283); ctx.fill();
    }
    /* the comet: tapered tail, soft glow, bright head */
    var head = chasing ? pos : at(cur), bob = reduce ? 0 : Math.sin(t * 1.6) * 3;
    ctx.globalAlpha = 1;
    for (var i = 16; !chasing && i >= 1; i--) {
      var q = at(Math.max(0, cur - i * 4.5)), k = 1 - i / 17;
      ctx.fillStyle = 'rgba(' + PINK + ',' + (.75 * k) + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y - sy + bob * k, 6 * k, 0, 6.283); ctx.fill();
    }
    /* while following, the tail stretches back through where it has just been */
    for (var j = Math.max(0, past.length - 9); chasing && j < past.length; j++) {
      var w = (j - (past.length - 10)) / 10;
      if (now - past[j].t > 400) continue;
      ctx.fillStyle = 'rgba(' + PINK + ',' + (.7 * w * fade) + ')';
      ctx.beginPath(); ctx.arc(past[j].x, past[j].y - sy + bob * w, 6 * w, 0, 6.283); ctx.fill();
    }
    halo(PINK, head.x, head.y - sy + bob, 34, .85 * fade);
    ctx.fillStyle = 'rgba(' + ORG + ',' + fade + ')'; ctx.beginPath(); ctx.arc(head.x, head.y - sy + bob, 5.5, 0, 6.283); ctx.fill();
    requestAnimationFrame(frame);
  }
  build(); requestAnimationFrame(frame);
  addEventListener('resize', build); addEventListener('load', build);
  if (window.ResizeObserver) new ResizeObserver(function () { build(); }).observe(document.body);
})();
