/* Animal Friends Company: comportamiento de la página */
(function () {
  'use strict';

  /* ---------- Menú móvil ---------- */
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  }
  btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });

  /* ---------- Botones "Copiar" ---------- */
  document.querySelectorAll('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.dataset.copy);
      var text = el.textContent.trim();
      function done() {
        var old = b.textContent;
        b.textContent = 'Copiado';
        setTimeout(function () { b.textContent = old; }, 1600);
      }
      function fallback() {
        var r = document.createRange();
        r.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  /* ---------- Encabezado dinámico + imagen que se difumina ---------- */
  var header = document.querySelector('header.top');
  var photo = document.querySelector('.hero-photo img.ph');
  var hero = document.getElementById('inicio');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ticking = false;

  function update() {
    var y = window.scrollY || window.pageYOffset;
    /* Histéresis: se compacta al pasar de 60 px y solo se expande al volver a menos de 8 px.
       Así el cambio de altura del header no vuelve a cruzar el umbral y no hay bucle. */
    var compact = header.classList.contains('scrolled');
    if (!compact && y > 60) header.classList.add('scrolled');
    else if (compact && y < 8) header.classList.remove('scrolled');

    if (photo && !reduce) {
      /* La imagen termina de difuminarse tras recorrer ~70 % de la altura de la portada */
      var p = Math.min(Math.max(y / (hero.offsetHeight * 0.7), 0), 1);
      photo.style.setProperty('--p', p.toFixed(3));
      photo.parentElement.querySelector('.badge').style.setProperty('--p', p.toFixed(3));
    }
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

/* ---------- Inducción para cargos: ventana con pestañas ---------- */
(function () {
  'use strict';
  var dlg = document.getElementById('inducDialog');
  var openBtn = document.getElementById('inducOpen');
  var closeBtn = document.getElementById('inducClose');
  if (!dlg || !openBtn) return;

  var tabs = Array.prototype.slice.call(dlg.querySelectorAll('[role="tab"]'));

  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    dlg.querySelector('.modal-body').scrollTop = 0;
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  function openAt(i) {
    select(tabs[i], false);
    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
      document.documentElement.classList.add('modal-open');
    } else {
      dlg.setAttribute('open', '');
    }
  }
  openBtn.addEventListener('click', function () { openAt(0); });
  var evalBtn = document.getElementById('evalOpen');
  if (evalBtn) evalBtn.addEventListener('click', function () { openAt(1); }); /* abre en la pestaña de evaluación */
  function close() { dlg.close(); }
  closeBtn.addEventListener('click', close);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); }); /* clic en el fondo */
  dlg.addEventListener('close', function () { document.documentElement.classList.remove('modal-open'); });
})();

/* ---------- Catálogo: filtros por animal y tipo de producto ---------- */
(function () {
  'use strict';
  var data = window.CATALOGO || { productos: [] };
  var grid = document.getElementById('catGrid');
  var count = document.getElementById('catCount');
  if (!grid) return;

  var NOMBRE_TIPO = { medicamentos: 'Medicamentos', cuidado: 'Cuidado animal', accesorios: 'Accesorios' };
  var NOMBRE_ANIMAL = { perros: 'Perros', ganaderia: 'Ganadería', porcinos: 'Porcinos', general: 'Uso general' };
  /* Ilustraciones sencillas (viewBox 24, trazo) para productos sin foto */
  var ICONOS = {
    capsula: '<g transform="rotate(-45 12 12)"><rect x="2" y="7.5" width="20" height="9" rx="4.5"/><path d="M12 7.5v9"/></g>',
    frasco: '<path d="M9 3h6v3l2 3v10a2 2 0 01-2 2H9a2 2 0 01-2-2V9l2-3V3z"/><path d="M7 13h10"/><path d="M12 15.5v3M10.5 17h3"/>',
    caja: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    comedero: '<path d="M3 12h18l-2 6.5a2 2 0 01-1.9 1.5H6.9A2 2 0 015 18.5L3 12z"/><path d="M7 12c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/>',
    bebedero: '<path d="M5 9h14l-1.5 10a2 2 0 01-2 1.7h-7a2 2 0 01-2-1.7L5 9z"/><path d="M5 9c0-2 3-3.5 7-3.5s7 1.5 7 3.5"/><path d="M9 14c1 1 2 1 3 0s2-1 3 0"/>',
    collar: '<ellipse cx="12" cy="9" rx="9" ry="4.5"/><path d="M3 9v4c0 2.5 4 4.5 9 4.5s9-2 9-4.5V9"/><circle cx="12" cy="20.6" r="1.5"/>',
    correa: '<rect x="3" y="3" width="9" height="6" rx="3"/><path d="M7.5 9v3c0 3 5 2.5 5 5.5 0 1.5 1.5 2.5 4 2.5"/><circle cx="19.5" cy="20" r="1.6"/>',
    pelota: '<circle cx="12" cy="12" r="8.5"/><path d="M4.5 8.5c4.5 1.5 10.5 1.5 15 0M4.5 15.5c4.5-1.5 10.5-1.5 15 0"/>',
    cepillo: '<rect x="4" y="3" width="16" height="8" rx="2"/><path d="M7 11v3M10.5 11v3M14 11v3M17 11v3M12 14v7"/>',
    shampoo: '<path d="M10 3h4v3l2 3v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V9l2-3V3z"/><path d="M8 13h8"/>'
  };
  var state = { animal: 'todos', tipo: 'todos' };
  var wa = String(data.whatsapp || '').replace(/\D/g, '');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function card(p) {
    var a = el('article', 'product');
    var img = el('div', 'pimg t-' + p.tipo);
    if (p.imagen) {
      var i = document.createElement('img');
      i.src = p.imagen; i.alt = p.nombre; i.loading = 'lazy';
      img.appendChild(i);
    } else {
      img.innerHTML = '<svg class="pico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS[p.icono] || ICONOS.caja) + '</svg>';
    }
    var b = el('div', 'pbody');
    b.appendChild(el('span', 'pill', NOMBRE_TIPO[p.tipo] || p.tipo));
    b.appendChild(el('h3', '', p.nombre));
    if (p.descripcion) b.appendChild(el('p', '', p.descripcion));
    var tagList = (p.animales || []).map(function (k) { return NOMBRE_ANIMAL[k] || k; });
    if (p.linea) tagList.unshift('Línea');
    if (tagList.length) {
      var tags = el('div', 'ptags');
      tagList.forEach(function (t) { tags.appendChild(el('span', '', t)); });
      b.appendChild(tags);
    }
    if (wa) {
      var l = el('a', 'btn btn-primary', 'Consultar por WhatsApp');
      l.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hola, quiero información sobre ' + p.nombre);
      l.target = '_blank'; l.rel = 'noopener';
      b.appendChild(l);
    }
    a.appendChild(img); a.appendChild(b);
    return a;
  }

  function render() {
    var list = data.productos.filter(function (p) {
      var an = p.animales || [];
      var okA = state.animal === 'todos' || an.indexOf(state.animal) !== -1 || an.indexOf('general') !== -1;
      var okT = state.tipo === 'todos' || p.tipo === state.tipo;
      return okA && okT;
    });
    grid.textContent = '';
    if (!list.length) {
      grid.appendChild(el('p', 'empty', 'Pronto habrá productos en esta selección.'));
      count.textContent = '';
      return;
    }
    list.forEach(function (p) { grid.appendChild(card(p)); });
    count.textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
  }

  function bind(groupId, key, attr) {
    var g = document.getElementById(groupId);
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      state[key] = b.getAttribute(attr);
      Array.prototype.forEach.call(g.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      render();
    });
  }
  bind('fAnimal', 'animal', 'data-animal');
  bind('fTipo', 'tipo', 'data-tipo');
  render();
})();

/* ---------- Medios de pago: usa el logo oficial si existe en img/pagos/ ---------- */
(function () {
  'use strict';
  var exts = ['svg', 'png'];
  Array.prototype.forEach.call(document.querySelectorAll('.pay-list li[data-logo]'), function (li) {
    var nombre = li.textContent.trim();
    var base = 'img/pagos/' + li.getAttribute('data-logo');
    (function intentar(i) {
      if (i >= exts.length) return;
      var im = new Image();
      im.onload = function () { im.alt = nombre; li.textContent = ''; li.appendChild(im); };
      im.onerror = function () { intentar(i + 1); };
      im.src = base + '.' + exts[i];
    })(0);
  });
})();

(function () {
  'use strict';
  var li = document.querySelector('.has-sub');
  if (!li) return;
  var toggle = li.querySelector('.sub-toggle');
  function set(open) {
    li.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function (e) { e.stopPropagation(); set(!li.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (!li.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && li.classList.contains('open')) { set(false); toggle.focus(); }
  });
  Array.prototype.forEach.call(li.querySelectorAll('.submenu a'), function (a) {
    a.addEventListener('click', function () { set(false); });
  });
})();