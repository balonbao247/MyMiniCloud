/* MyMiniCloud Blog — interactions (vanilla JS, no dependencies) */
(function () {
    'use strict';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    /* ---------- Theme toggle (persisted) ---------- */
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem('mmc-theme'); } catch (e) {}
    if (saved) root.setAttribute('data-theme', saved);
    var themeBtn = $('#themeBtn');
    function paintTheme() { if (themeBtn) themeBtn.textContent = root.getAttribute('data-theme') === 'light' ? '🌙' : '☀️'; }
    paintTheme();
    if (themeBtn) themeBtn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('mmc-theme', next); } catch (e) {}
        paintTheme();
    });

    /* ---------- Reading progress + back-to-top ---------- */
    var bar = $('#progress'), toTop = $('#toTop');
    function onScroll() {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        if (bar) bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
        if (toTop) toTop.classList.toggle('show', window.scrollY > 600);
        spy();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    /* ---------- Cursor glow ---------- */
    var glow = $('.cursor-glow');
    if (glow && window.matchMedia('(pointer:fine)').matches) {
        window.addEventListener('mousemove', function (e) {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });
    }

    /* ---------- Scroll reveal ---------- */
    var rv = $$('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
            });
        }, { threshold: 0.12 });
        rv.forEach(function (el) { io.observe(el); });
    } else { rv.forEach(function (el) { el.classList.add('visible'); }); }

    /* ---------- 3D tilt cards ---------- */
    if (window.matchMedia('(pointer:fine)').matches) {
        $$('.tilt').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var r = card.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width - 0.5;
                var y = (e.clientY - r.top) / r.height - 0.5;
                card.style.transform = 'perspective(1000px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-6px)';
            });
            card.addEventListener('mouseleave', function () { card.style.transform = ''; });
        });
    }

    /* ---------- Typed headline ---------- */
    var typed = $('#typed');
    if (typed) {
        var words = (typed.getAttribute('data-words') || '').split('|');
        var wi = 0, ci = 0, del = false;
        (function tick() {
            var w = words[wi];
            typed.textContent = w.slice(0, ci);
            if (!del && ci === w.length) { del = true; return setTimeout(tick, 1600); }
            if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; }
            ci += del ? -1 : 1;
            setTimeout(tick, del ? 38 : 85);
        })();
    }

    /* ---------- Animated counters ---------- */
    $$('[data-count]').forEach(function (el) {
        var target = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '';
        var started = false;
        function run() {
            if (started) return; started = true;
            var t0 = performance.now(), dur = 1400;
            (function step(t) {
                var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(target * e) + suffix;
                if (p < 1) requestAnimationFrame(step);
            })(t0);
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { run(); o.disconnect(); } }).observe(el);
        } else run();
    });

    /* ---------- Search + category filter ---------- */
    var cards = $$('.post-card'), input = $('#search'), chips = $$('.chip'), empty = $('.empty');
    var cat = 'all';
    function applyFilter() {
        var q = input ? input.value.trim().toLowerCase() : '', shown = 0;
        cards.forEach(function (c) {
            var ok = (cat === 'all' || c.getAttribute('data-category') === cat) &&
                     (c.getAttribute('data-title') || '').toLowerCase().indexOf(q) !== -1;
            c.style.display = ok ? '' : 'none';
            if (ok) shown++;
        });
        if (empty) empty.classList.toggle('show', shown === 0);
    }
    if (input) input.addEventListener('input', applyFilter);
    chips.forEach(function (ch) {
        ch.addEventListener('click', function () {
            chips.forEach(function (x) { x.classList.remove('active'); });
            ch.classList.add('active');
            cat = ch.getAttribute('data-cat');
            applyFilter();
        });
    });

    /* ---------- Table of contents + scroll spy ---------- */
    var tocBox = $('#tocList'), heads = $$('.prose h2'), links = [];
    if (tocBox && heads.length) {
        heads.forEach(function (h, i) {
            h.id = h.id || 'sec-' + (i + 1);
            var a = document.createElement('a');
            a.href = '#' + h.id;
            a.textContent = h.textContent.replace(/^\d+\.\s*/, '');
            tocBox.appendChild(a); links.push(a);
        });
    }
    function spy() {
        if (!links.length) return;
        var cur = 0;
        heads.forEach(function (h, i) { if (h.getBoundingClientRect().top < 180) cur = i; });
        links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
    }

    /* ---------- Copy buttons on terminals ---------- */
    $$('.terminal').forEach(function (t) {
        var btn = $('.copy', t), body = $('.term-body', t);
        if (!btn || !body) return;
        btn.addEventListener('click', function () {
            var txt = body.innerText;
            (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
                btn.textContent = 'Đã chép ✓'; setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
            }).catch(function () { btn.textContent = 'Lỗi'; });
        });
    });

    /* ---------- Like button (persisted per page) ---------- */
    var like = $('#likeBtn');
    if (like) {
        var key = 'mmc-like-' + location.pathname, cnt = $('#likeCount');
        var base = parseInt(cnt.textContent, 10) || 0, liked = false;
        try { liked = localStorage.getItem(key) === '1'; } catch (e) {}
        function paintLike() { like.classList.toggle('liked', liked); cnt.textContent = base + (liked ? 1 : 0); }
        paintLike();
        like.addEventListener('click', function (e) {
            liked = !liked;
            try { localStorage.setItem(key, liked ? '1' : '0'); } catch (er) {}
            paintLike();
            if (liked) for (var i = 0; i < 9; i++) {
                var h = document.createElement('span');
                h.className = 'heart'; h.textContent = ['❤️', '💖', '✨', '💫'][i % 4];
                h.style.left = (e.clientX - 10) + 'px'; h.style.top = (e.clientY - 10) + 'px';
                h.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
                h.style.animationDelay = (i * 0.05) + 's';
                document.body.appendChild(h);
                setTimeout(function (n) { n.remove(); }.bind(null, h), 1500);
            }
        });
    }

    /* ---------- Comments (saved in localStorage; text-safe) ---------- */
    var list = $('#commentList'), box = $('#commentBox'), send = $('#sendComment');
    if (list && box && send) {
        var ckey = 'mmc-comments-' + location.pathname, stored = [];
        try { stored = JSON.parse(localStorage.getItem(ckey) || '[]'); } catch (e) {}
        function render(name, text, when, prepend) {
            var li = document.createElement('div'); li.className = 'comment';
            var av = document.createElement('div'); av.className = 'avatar'; av.textContent = name.charAt(0).toUpperCase();
            var wrap = document.createElement('div');
            var st = document.createElement('strong'); st.textContent = name;
            var sm = document.createElement('small'); sm.textContent = when;
            var p = document.createElement('p'); p.textContent = text;
            wrap.appendChild(st); wrap.appendChild(sm); wrap.appendChild(p);
            li.appendChild(av); li.appendChild(wrap);
            prepend ? list.insertBefore(li, list.firstChild) : list.appendChild(li);
        }
        stored.forEach(function (c) { render(c.n, c.t, c.w, false); });
        send.addEventListener('click', function () {
            var t = box.value.trim(); if (!t) { box.focus(); return; }
            var item = { n: 'Bạn', t: t, w: 'Vừa xong' };
            render(item.n, item.t, item.w, true);
            stored.unshift(item);
            try { localStorage.setItem(ckey, JSON.stringify(stored)); } catch (e) {}
            box.value = '';
        });
    }

    /* ---------- Share: copy link ---------- */
    var shareBtn = $('#shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
        (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () {
            shareBtn.textContent = '✓'; setTimeout(function () { shareBtn.textContent = '🔗'; }, 1500);
        }).catch(function () {});
    });

    /* ---------- Image fallback (offline-safe) ---------- */
    $$('img[data-fallback]').forEach(function (img) {
        img.addEventListener('error', function () { img.style.display = 'none'; });
    });

    onScroll();
})();

