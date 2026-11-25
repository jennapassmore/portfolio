/* Pauses looping animation and video while they are off screen. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var loops = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('offscreen', !e.isIntersecting); });
  }, { rootMargin: '120px 0px' });
  [].forEach.call(document.querySelectorAll('.mrow,.orbit-wrap,.chips'), function (el) { loops.observe(el); });

  /* video downloads and plays only as it comes into view */
  var films = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (!e.isIntersecting) { v.pause(); return; }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
  }, { rootMargin: '300px 0px' });
  [].forEach.call(document.querySelectorAll('video'), function (v) { v.muted = true; films.observe(v); });
})();
