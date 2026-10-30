/* titlelessbrowser.com — the two pieces of behaviour the site has.
   No framework, no dependencies; both no-ops if the browser lacks the API. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- reveals */
  /* Things fade up as they come into view, once. The observer lets go of
     each element as it fires, so a long page doesn't keep a live list. */
  var revealables = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var seen = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { seen.observe(el); });
  }

  /* -------------------------------------------------------- carousel */
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.carousel__track');
    var cards = Array.prototype.slice.call(track.children);
    var prev = root.querySelector('.carousel__arrow--prev');
    var next = root.querySelector('.carousel__arrow--next');
    var dots = Array.prototype.slice.call(root.querySelectorAll('.carousel__dot'));
    if (!track || !cards.length) return;

    function step() {
      var gap = parseFloat(getComputedStyle(track).columnGap || '20') || 20;
      return cards[0].getBoundingClientRect().width + gap;
    }

    /* Which card is nearest the middle of the viewport window. */
    function current() {
      var mid = track.scrollLeft + track.clientWidth / 2;
      var best = 0, bestGap = Infinity;
      cards.forEach(function (card, i) {
        var centre = card.offsetLeft + card.offsetWidth / 2;
        var gap = Math.abs(centre - mid);
        if (gap < bestGap) { bestGap = gap; best = i; }
      });
      return best;
    }

    function sync() {
      var i = current();
      dots.forEach(function (dot, n) { dot.classList.toggle('is-on', n === i); });
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }

    /* Scroll events fire far faster than paint; coalesce to one frame. */
    var queued = false;
    track.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; sync(); });
    }, { passive: true });

    if (prev) prev.addEventListener('click', function () { track.scrollLeft -= step(); });
    if (next) next.addEventListener('click', function () { track.scrollLeft += step(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        track.scrollLeft = cards[i].offsetLeft - (track.clientWidth - cards[i].offsetWidth) / 2;
      });
    });

    /* Arrow keys, once the strip has focus. */
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { track.scrollLeft += step(); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { track.scrollLeft -= step(); e.preventDefault(); }
    });

    /* Drag with a mouse. Touch already scrolls natively, and pointer capture
       would fight it, so only a real mouse gets this. */
    var down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0;
      startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = startLeft - dx;
    });
    function release(e) {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
      try { track.releasePointerCapture(e.pointerId); } catch (err) {}
      /* Settle on the nearest card, the way the touch snap does. */
      var card = cards[current()];
      track.scrollLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
      sync();
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    /* A drag that moved is not a click on the card underneath. */
    track.addEventListener('click', function (e) { if (moved > 6) e.preventDefault(); }, true);

    sync();
    window.addEventListener('resize', sync, { passive: true });
  });
})();

/* ---------------------------------------------------------------- search */
/* A static site, so the search is the index and the browser — no request goes
   anywhere when somebody types, which keeps the page honest about collecting
   nothing. The index is fetched once, on first open, not on page load. */
(function () {
  'use strict';

  var trigger = document.querySelector('[data-search-open]');
  var overlay = document.getElementById('search');
  if (!trigger || !overlay) return;

  var input   = overlay.querySelector('.search__input');
  var results = overlay.querySelector('.search__results');
  var index   = null;
  var loading = false;
  var active  = -1;

  /* What we show before anybody has typed: the places people actually want. */
  var SUGGESTED = [
    { t: 'Support',        p: 'Page',  u: '/support/',            b: 'Common questions, and how to reach a person.' },
    { t: 'Changelog',      p: 'Page',  u: '/changelog/',          b: 'What changed in each release.' },
    { t: 'Privacy policy', p: 'Page',  u: '/privacy/',            b: 'What stays on your device, and what leaves it.' },
    { t: 'Terms of Use',   p: 'Page',  u: '/terms/',              b: 'The terms you agree to by using TitleLess.' },
    { t: 'Ad blocking',    p: 'Home',  u: '/#blocking',           b: 'What is blocked, and what that gets you.' },
    { t: 'Glass & Wallpaper', p: 'Home', u: '/#glass',            b: 'Frosted or clear glass, and your own wallpaper.' },
    { t: 'Compare',        p: 'Home',  u: '/#compare',            b: 'TitleLess against Brave, Opera, Chrome and Safari.' }
  ];

  function load() {
    if (index || loading) return Promise.resolve();
    loading = true;
    return fetch('/assets/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { index = data; loading = false; })
      .catch(function () { loading = false; });
  }

  function escape(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* Title hits beat body hits, and a hit at the start beats one in the middle;
     that ordering is the whole ranking, and for a five-page site it is enough. */
  function score(entry, needle) {
    var title = entry.t.toLowerCase();
    var body  = (entry.b || '').toLowerCase();
    if (title === needle) return 100;
    if (title.indexOf(needle) === 0) return 80;
    if (title.indexOf(needle) > -1) return 60;
    if (body.indexOf(needle) > -1) return 30 - Math.min(20, body.indexOf(needle) / 40);
    return 0;
  }

  function render(list, query) {
    active = -1;
    if (!list.length) {
      results.innerHTML = '<p class="search__empty">Nothing matches “' + escape(query) +
        '”. Try <a href="/support/">support</a>.</p>';
      return;
    }
    results.innerHTML = list.map(function (entry, i) {
      return '<a class="search__hit" href="' + entry.u + '" data-i="' + i + '">' +
        '<span class="search__hit-title">' + escape(entry.t) + '</span>' +
        '<span class="label">' + escape(entry.p) + '</span>' +
        (entry.b ? '<span class="search__hit-body">' + escape(entry.b.slice(0, 120)) + '…</span>' : '') +
        '</a>';
    }).join('');
  }

  function search(query) {
    var needle = query.trim().toLowerCase();
    if (!needle) { render(SUGGESTED, ''); return; }
    if (!index) { render(SUGGESTED.filter(function (e) {
      return (e.t + ' ' + e.b).toLowerCase().indexOf(needle) > -1; }), query); return; }
    var hits = index.map(function (e) { return { e: e, s: score(e, needle) }; })
                    .filter(function (h) { return h.s > 0; })
                    .sort(function (a, b) { return b.s - a.s; })
                    .slice(0, 8)
                    .map(function (h) { return h.e; });
    render(hits, query);
  }

  function open() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    render(SUGGESTED, '');
    load().then(function () { if (input.value) search(input.value); });
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    input.value = '';
    trigger.focus();
  }

  trigger.addEventListener('click', open);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.hasAttribute('data-search-close')) close();
  });
  input.addEventListener('input', function () { search(input.value); });

  /* ⌘K and / open it; Escape closes; arrows walk the list. */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName))) {
      e.preventDefault(); overlay.hidden ? open() : close();
    }
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var hits = results.querySelectorAll('.search__hit');
      if (!hits.length) return;
      e.preventDefault();
      active += (e.key === 'ArrowDown' ? 1 : -1);
      if (active < 0) active = hits.length - 1;
      if (active >= hits.length) active = 0;
      hits.forEach(function (h) { h.classList.remove('is-active'); });
      hits[active].classList.add('is-active');
      hits[active].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && active > -1) {
      var hit = results.querySelectorAll('.search__hit')[active];
      if (hit) { window.location.href = hit.getAttribute('href'); }
    }
  });
})();
