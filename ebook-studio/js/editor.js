/* The design surface: select, drag, resize, rotate, type, restyle. */
(function (global) {
  'use strict';

  var stageScroll, stage, artboard, overlay, sidePanel, props, picker, zoomLabel;
  var state = { zoom: 1, selId: null, panel: 'templates', editing: false };
  var drag = null;
  var mounted = false;

  /* ── tiny DOM helper ───────────────────────────────────────────────── */

  function h(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'style') Object.assign(node.style, attrs[k]);
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === 'text') node.textContent = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (kid) { if (kid) node.appendChild(kid); });
    return node;
  }

  function design() { return Store.activeDesign(); }

  function selected() {
    var d = design();
    if (!d || !state.selId) return null;
    return d.elements.filter(function (e) { return e.id === state.selId; })[0] || null;
  }

  function theme() { return Templates.themeById(Store.project.themeId); }

  function elHeight(el) { return Render.elementHeight(el); }

  /* ── stage ─────────────────────────────────────────────────────────── */

  function applyZoom() {
    var d = design();
    if (!d) return;
    stage.style.width = Math.round(d.w * state.zoom) + 'px';
    stage.style.height = Math.round(d.h * state.zoom) + 'px';
    artboard.style.transform = 'scale(' + state.zoom + ')';
    zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  }

  function fitZoom() {
    var d = design();
    if (!d) return;
    var box = stageScroll.getBoundingClientRect();
    var pad = 80;
    state.zoom = Math.max(0.05, Math.min(
      (box.width - pad) / d.w,
      (box.height - pad) / d.h,
      1
    ));
    applyZoom();
    drawOverlay();
  }

  function setZoom(next) {
    state.zoom = Math.max(0.05, Math.min(4, next));
    applyZoom();
    drawOverlay();
  }

  function drawArtboard() {
    var d = design();
    if (!d) {
      artboard.innerHTML = '';
      artboard.style.width = artboard.style.height = '0px';
      return;
    }
    Render.toDom(d, artboard);
    applyZoom();
  }

  /* ── selection overlay ─────────────────────────────────────────────── */

  var HANDLES = [
    { id: 'nw', x: 0,   y: 0,   cur: 'nwse-resize' },
    { id: 'n',  x: 0.5, y: 0,   cur: 'ns-resize' },
    { id: 'ne', x: 1,   y: 0,   cur: 'nesw-resize' },
    { id: 'e',  x: 1,   y: 0.5, cur: 'ew-resize' },
    { id: 'se', x: 1,   y: 1,   cur: 'nwse-resize' },
    { id: 's',  x: 0.5, y: 1,   cur: 'ns-resize' },
    { id: 'sw', x: 0,   y: 1,   cur: 'nesw-resize' },
    { id: 'w',  x: 0,   y: 0.5, cur: 'ew-resize' }
  ];

  function drawOverlay(guides) {
    overlay.innerHTML = '';
    var el = selected();
    if (!el || state.editing) return;

    var z = state.zoom;
    var hgt = elHeight(el);
    var box = h('div', {
      class: 'sel-box',
      style: {
        left: (el.x * z) + 'px',
        top: (el.y * z) + 'px',
        width: (el.w * z) + 'px',
        height: (hgt * z) + 'px',
        transform: 'rotate(' + (el.rot || 0) + 'deg)'
      }
    });

    var list = el.type === 'text'
      ? HANDLES.filter(function (k) { return k.id !== 'n' && k.id !== 's'; })
      : HANDLES;

    list.forEach(function (k) {
      box.appendChild(h('div', {
        class: 'handle',
        'data-handle': k.id,
        style: { left: (k.x * 100) + '%', top: (k.y * 100) + '%', cursor: k.cur }
      }));
    });

    box.appendChild(h('div', {
      class: 'handle rot',
      'data-handle': 'rotate',
      style: { left: '50%', top: '-26px' }
    }));

    overlay.appendChild(box);

    (guides || []).forEach(function (g) {
      overlay.appendChild(h('div', {
        class: 'guide ' + g.axis,
        style: g.axis === 'v' ? { left: (g.at * z) + 'px' } : { top: (g.at * z) + 'px' }
      }));
    });
  }

  /* ── pointer maths ─────────────────────────────────────────────────── */

  function toArt(evt) {
    var r = artboard.getBoundingClientRect();
    return { x: (evt.clientX - r.left) / state.zoom, y: (evt.clientY - r.top) / state.zoom };
  }

  function rotatePoint(dx, dy, deg) {
    var r = deg * Math.PI / 180;
    return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) };
  }

  /* Lines worth sticking to: the artboard's own thirds and every other
     element's edges and centre. */
  function snapTargets(skipId) {
    var d = design();
    var v = [0, d.w / 2, d.w];
    var hz = [0, d.h / 2, d.h];
    d.elements.forEach(function (e) {
      if (e.id === skipId) return;
      var eh = elHeight(e);
      v.push(e.x, e.x + e.w / 2, e.x + e.w);
      hz.push(e.y, e.y + eh / 2, e.y + eh);
    });
    return { v: v, h: hz };
  }

  function snapAxis(values, candidates, tolerance) {
    var best = null;
    values.forEach(function (value, i) {
      candidates.forEach(function (c) {
        var delta = c - value;
        if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta: delta, at: c, which: i };
        }
      });
    });
    return best;
  }

  /* ── interactions ──────────────────────────────────────────────────── */

  function onArtboardPointerDown(evt) {
    if (state.editing) return;
    var target = evt.target.closest('.el');
    if (!target) { select(null); return; }
    var d = design();
    var el = d.elements.filter(function (e) { return e.id === target.dataset.id; })[0];
    if (!el) return;

    select(el.id);
    startDrag(evt, 'move', el);
  }

  function onOverlayPointerDown(evt) {
    var handle = evt.target.closest('.handle');
    if (!handle) return;
    var el = selected();
    if (!el) return;
    evt.stopPropagation();
    startDrag(evt, handle.dataset.handle === 'rotate' ? 'rotate' : 'resize', el, handle.dataset.handle);
  }

  function startDrag(evt, mode, el, handle) {
    evt.preventDefault();
    Store.commit();
    var start = toArt(evt);
    drag = {
      mode: mode,
      handle: handle,
      id: el.id,
      start: start,
      origin: JSON.parse(JSON.stringify(el)),
      originHeight: elHeight(el),
      targets: snapTargets(el.id),
      moved: false
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  function onPointerMove(evt) {
    if (!drag) return;
    var d = design();
    var el = d.elements.filter(function (e) { return e.id === drag.id; })[0];
    if (!el) return;

    var now = toArt(evt);
    var dx = now.x - drag.start.x;
    var dy = now.y - drag.start.y;
    var o = drag.origin;
    var guides = [];
    drag.moved = true;

    if (drag.mode === 'move') {
      el.x = o.x + dx;
      el.y = o.y + dy;

      if (!evt.altKey) {
        var tol = 6 / state.zoom;
        var hgt = drag.originHeight;
        var sx = snapAxis([el.x, el.x + el.w / 2, el.x + el.w], drag.targets.v, tol);
        var sy = snapAxis([el.y, el.y + hgt / 2, el.y + hgt], drag.targets.h, tol);
        if (sx) { el.x += sx.delta; guides.push({ axis: 'v', at: sx.at }); }
        if (sy) { el.y += sy.delta; guides.push({ axis: 'h', at: sy.at }); }
      }
      el.x = Math.round(el.x);
      el.y = Math.round(el.y);

    } else if (drag.mode === 'rotate') {
      var cx = o.x + o.w / 2;
      var cy = o.y + drag.originHeight / 2;
      var angle = Math.atan2(now.y - cy, now.x - cx) * 180 / Math.PI + 90;
      if (evt.shiftKey) angle = Math.round(angle / 15) * 15;
      el.rot = Math.round(angle);

    } else {
      resize(el, o, dx, dy, evt.shiftKey);
    }

    drawArtboard();
    drawOverlay(guides);
    syncProps();
    Store.save();
  }

  /* Resize in the element's own axes, keeping the opposite corner pinned. */
  function resize(el, o, dx, dy, keepRatio) {
    var local = rotatePoint(dx, dy, -(o.rot || 0));
    var handle = drag.handle;
    var oh = drag.originHeight;
    var w = o.w, hh = oh;
    var signX = handle.indexOf('e') !== -1 ? 1 : (handle.indexOf('w') !== -1 ? -1 : 0);
    var signY = handle.indexOf('s') !== -1 ? 1 : (handle.indexOf('n') !== -1 ? -1 : 0);

    var isCorner = signX !== 0 && signY !== 0;

    if (o.type === 'text') {
      if (isCorner) {
        // Corner on text scales the type instead of stretching the box.
        var scale = Math.max(0.15, (o.w + signX * local.x) / o.w);
        el.w = Math.max(20, Math.round(o.w * scale));
        el.size = Math.max(6, Math.round(o.size * scale));
        hh = elHeight(el);
      } else {
        el.w = Math.max(20, Math.round(o.w + signX * local.x));
        hh = elHeight(el);
      }
      w = el.w;
    } else {
      w = Math.max(6, o.w + signX * local.x);
      hh = Math.max(6, oh + signY * local.y);
      if (keepRatio && isCorner) {
        var ratio = o.w / oh;
        if (w / hh > ratio) w = hh * ratio; else hh = w / ratio;
      }
      el.w = Math.round(w);
      el.h = Math.round(hh);
    }

    // Put the anchor corner back where it started.
    var anchorLocal = { x: -signX * o.w / 2, y: -signY * oh / 2 };
    var oldCenter = { x: o.x + o.w / 2, y: o.y + oh / 2 };
    var rotated = rotatePoint(anchorLocal.x, anchorLocal.y, o.rot || 0);
    var anchorWorld = { x: oldCenter.x + rotated.x, y: oldCenter.y + rotated.y };

    var newAnchorLocal = { x: -signX * w / 2, y: -signY * hh / 2 };
    var newRotated = rotatePoint(newAnchorLocal.x, newAnchorLocal.y, o.rot || 0);
    el.x = Math.round(anchorWorld.x - newRotated.x - w / 2);
    el.y = Math.round(anchorWorld.y - newRotated.y - hh / 2);
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    if (drag && !drag.moved) Store.undo();   // a plain click should not fill history
    drag = null;
    drawOverlay();
    Store.save();
  }

  /* ── inline text editing ───────────────────────────────────────────── */

  function beginTextEdit(el) {
    state.editing = true;
    drawOverlay();

    var lines = TextLayout.wrap(el);
    var lh = TextLayout.lineHeightPx(el);
    var area = h('textarea', { class: 'text-edit' });

    Object.assign(area.style, {
      left: el.x + 'px',
      top: el.y + 'px',
      width: el.w + 'px',
      height: (lines.length * lh) + 'px',
      fontFamily: el.family,
      fontSize: el.size + 'px',
      fontWeight: el.weight,
      fontStyle: el.italic ? 'italic' : 'normal',
      lineHeight: lh + 'px',
      letterSpacing: (el.letterSpacing || 0) + 'px',
      textAlign: el.align,
      color: el.color,
      textTransform: el.uppercase ? 'uppercase' : 'none',
      transform: el.rot ? 'rotate(' + el.rot + 'deg)' : ''
    });
    area.value = el.text;
    artboard.appendChild(area);
    area.focus();
    area.select();

    function grow() {
      var probe = Object.assign({}, el, { text: area.value });
      area.style.height = TextLayout.measuredHeight(probe) + 'px';
    }
    area.addEventListener('input', grow);

    function finish() {
      var next = area.value;
      area.remove();
      state.editing = false;
      if (next !== el.text) {
        Store.commit();
        el.text = next;
        Store.save();
      }
      drawArtboard();
      drawOverlay();
      syncProps();
    }
    area.addEventListener('blur', finish);
    area.addEventListener('keydown', function (evt) {
      if (evt.key === 'Escape') { area.value = el.text; area.blur(); }
      evt.stopPropagation();
    });
  }

  /* ── selection ─────────────────────────────────────────────────────── */

  function select(id) {
    state.selId = id;
    drawOverlay();
    renderProps();
  }

  function addElement(el) {
    var d = design();
    if (!d) return;
    Store.commit();
    d.elements.push(el);
    Store.save();
    drawArtboard();
    select(el.id);
  }

  function centred(el) {
    var d = design();
    el.x = Math.round((d.w - el.w) / 2);
    el.y = Math.round((d.h - (el.type === 'text' ? elHeight(el) : el.h)) / 2);
    return el;
  }

  function removeSelected() {
    var d = design(), el = selected();
    if (!d || !el) return;
    Store.commit();
    d.elements = d.elements.filter(function (e) { return e.id !== el.id; });
    Store.save();
    select(null);
    drawArtboard();
  }

  function duplicateSelected() {
    var d = design(), el = selected();
    if (!d || !el) return;
    Store.commit();
    var copy = JSON.parse(JSON.stringify(el));
    copy.id = Store.uid('el');
    copy.x += 24;
    copy.y += 24;
    d.elements.push(copy);
    Store.save();
    drawArtboard();
    select(copy.id);
  }

  function arrange(how) {
    var d = design(), el = selected();
    if (!d || !el) return;
    var i = d.elements.indexOf(el);
    Store.commit();
    d.elements.splice(i, 1);
    if (how === 'front') d.elements.push(el);
    else if (how === 'back') d.elements.unshift(el);
    else if (how === 'forward') d.elements.splice(Math.min(d.elements.length, i + 1), 0, el);
    else d.elements.splice(Math.max(0, i - 1), 0, el);
    Store.save();
    drawArtboard();
    drawOverlay();
  }

  function align(how) {
    var d = design(), el = selected();
    if (!d || !el) return;
    Store.commit();
    var hgt = elHeight(el);
    if (how === 'left') el.x = 0;
    else if (how === 'right') el.x = d.w - el.w;
    else if (how === 'centerX') el.x = Math.round((d.w - el.w) / 2);
    else if (how === 'centerY') el.y = Math.round((d.h - hgt) / 2);
    Store.save();
    drawArtboard();
    drawOverlay();
  }

  /* ── side panels ───────────────────────────────────────────────────── */

  function panelTitle(t) { return h('p', { class: 'panel-title', text: t }); }

  async function renderTemplatesPanel() {
    var frag = document.createDocumentFragment();
    frag.appendChild(panelTitle('Cover styles'));

    var grid = h('div', { class: 'tpl-grid' });
    frag.appendChild(grid);
    sidePanel.innerHTML = '';
    sidePanel.appendChild(frag);

    var size = Templates.trimPx(Store.project.trimId);
    var meta = {
      title: Store.project.title,
      subtitle: Store.project.subtitle,
      author: Store.project.author
    };

    for (var i = 0; i < Templates.THEMES.length; i++) {
      var th = Templates.THEMES[i];
      var preview = Templates.makeCover(th, size, meta);
      var card = h('button', { class: 'tpl-card', title: th.name + ' - ' + th.mood });
      var img = h('img', { alt: th.name });
      img.src = await Render.toDataUrl(preview, 220 / preview.w);
      card.appendChild(img);
      (function (themeRef) {
        card.addEventListener('click', function () {
          var d = design();
          if (!d) return;
          Store.commit();
          var fresh = Templates.makeCover(themeRef, { w: d.w, h: d.h }, meta);
          d.bg = fresh.bg;
          d.elements = fresh.elements;
          Store.save();
          drawArtboard();
          select(null);
          toast('Cover restyled with ' + themeRef.name);
        });
      })(th);
      grid.appendChild(card);
    }

    sidePanel.appendChild(h('div', { class: 'panel-group' }, [
      panelTitle('Add a page'),
      h('div', { class: 'add-list' }, [
        h('button', {
          class: 'add-item', text: 'Chapter opener',
          onclick: function () {
            var d = design();
            var n = Store.project.designs.filter(function (x) { return x.kind === 'chapter'; }).length + 1;
            newDesign(Templates.makeChapterOpener(theme(), { w: d.w, h: d.h }, n, 'New chapter'));
          }
        }),
        h('button', {
          class: 'add-item', text: 'Quote card (1080 x 1350)',
          onclick: function () {
            newDesign(Templates.makeQuoteCard(theme(), 'Drop a line worth quoting here.', Store.project.author));
          }
        }),
        h('button', {
          class: 'add-item', text: 'Social card (1080 x 1080)',
          onclick: function () {
            newDesign(Templates.makeSocialCard(theme(), Store.project));
          }
        })
      ])
    ]));
  }

  function renderTextPanel() {
    var d = design();
    var t = theme();
    var w = d ? d.w : 900;

    function add(label, opts) {
      return h('button', {
        class: 'add-item', text: label,
        onclick: function () {
          addElement(centred(Templates.text(Object.assign({
            w: Math.round(w * 0.7), text: label, color: t.pageInk
          }, opts))));
        }
      });
    }

    sidePanel.innerHTML = '';
    sidePanel.appendChild(h('div', {}, [
      panelTitle('Add text'),
      h('div', { class: 'add-list' }, [
        add('Add a heading', { family: t.display, size: Math.round(w * 0.09), weight: 700, lineHeight: 1.1 }),
        add('Add a subheading', { family: t.display, size: Math.round(w * 0.05), weight: 400 }),
        add('Add body text', { family: t.body, size: Math.round(w * 0.03), lineHeight: 1.5 }),
        add('Add a label', {
          family: t.ui, size: Math.round(w * 0.022), weight: 600,
          uppercase: true, letterSpacing: 3, color: t.accent
        })
      ])
    ]));

    var el = selected();
    if (el && el.type === 'text') {
      var list = h('div', { class: 'add-list' });
      TextLayout.FONTS.forEach(function (f) {
        list.appendChild(h('button', {
          class: 'add-item', style: { fontFamily: f.stack, fontSize: '17px' }, text: f.label,
          onclick: function () {
            Store.commit();
            el.family = f.stack;
            Store.save(); drawArtboard(); drawOverlay(); syncProps();
          }
        }));
      });
      sidePanel.appendChild(h('div', { class: 'panel-group' }, [panelTitle('Font'), list]));
    }
  }

  function renderElementsPanel() {
    var d = design();
    var t = theme();
    var unit = d ? Math.round(d.w * 0.3) : 240;

    function shape(label, svg, maker) {
      var btn = h('button', { class: 'shape-btn', title: label, onclick: function () { addElement(centred(maker())); } });
      btn.innerHTML = svg;
      return btn;
    }

    sidePanel.innerHTML = '';
    sidePanel.appendChild(h('div', {}, [
      panelTitle('Shapes'),
      h('div', { class: 'shape-grid' }, [
        shape('Rectangle', '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14"/></svg>',
          function () { return Templates.rect({ w: unit, h: unit, fill: t.accent }); }),
        shape('Rounded', '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="5"/></svg>',
          function () { return Templates.rect({ w: unit, h: unit, radius: Math.round(unit * 0.12), fill: t.accent }); }),
        shape('Circle', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>',
          function () { return Templates.ellipse({ w: unit, h: unit, fill: t.accent }); }),
        shape('Rule', '<svg viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="2"/></svg>',
          function () { return Templates.rect({ w: unit, h: 3, fill: t.ink }); }),
        shape('Thick bar', '<svg viewBox="0 0 24 24"><rect x="2" y="9" width="20" height="6"/></svg>',
          function () { return Templates.rect({ w: unit, h: Math.round(unit * 0.08), fill: t.accent }); }),
        shape('Frame', '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
          function () { return Templates.rect({ w: unit, h: unit, fill: 'transparent', stroke: t.ink, strokeWidth: 2 }); })
      ])
    ]));

    var swatches = h('div', { class: 'swatch-grid' });
    [t.bg, t.ink, t.accent, t.muted, t.pageBg, t.pageInk, '#ffffff', '#000000',
     '#ff5a5f', '#ffc94d', '#4ad991', '#4a9bff'].forEach(function (color) {
      swatches.appendChild(h('button', {
        class: 'swatch', style: { background: color }, title: color,
        onclick: function () {
          var el = selected();
          Store.commit();
          if (el && el.type === 'text') el.color = color;
          else if (el && (el.type === 'rect' || el.type === 'ellipse')) el.fill = color;
          else design().bg = { type: 'solid', color: color };
          Store.save(); drawArtboard(); drawOverlay(); syncProps();
        }
      }));
    });
    sidePanel.appendChild(h('div', { class: 'panel-group' }, [
      panelTitle('Colours'),
      h('p', { class: 'hint', text: 'Applies to the selection, or to the background when nothing is selected.' }),
      swatches
    ]));
  }

  function renderUploadsPanel() {
    var input = h('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
    input.addEventListener('change', function () {
      Array.prototype.forEach.call(input.files, storeAsset);
      input.value = '';
    });

    var grid = h('div', { class: 'upload-grid' });
    var assets = Store.project.assets || {};
    Object.keys(assets).forEach(function (id) {
      var btn = h('button', { class: 'upload-thumb', title: 'Click to place, shift-click for background' });
      btn.appendChild(h('img', { src: assets[id], alt: '' }));
      btn.addEventListener('click', function (evt) {
        var d = design();
        if (!d) return;
        if (evt.shiftKey) {
          Store.commit();
          d.bg = { type: 'image', assetId: id, fit: 'cover' };
          Store.save(); drawArtboard();
          return;
        }
        Render.loadImage(assets[id]).then(function (img) {
          var wide = Math.min(d.w * 0.6, img.naturalWidth);
          addElement(centred(Templates.image({
            assetId: id, w: Math.round(wide),
            h: Math.round(wide * img.naturalHeight / img.naturalWidth)
          })));
        });
      });
      grid.appendChild(btn);
    });

    sidePanel.innerHTML = '';
    sidePanel.appendChild(h('div', {}, [
      panelTitle('Uploads'),
      h('button', { class: 'add-item', text: 'Upload images', onclick: function () { input.click(); } }),
      input,
      Object.keys(assets).length ? grid : h('p', { class: 'hint', text: 'Nothing uploaded yet.' })
    ]));
  }

  function renderBrandPanel() {
    var t = theme();
    var swatches = h('div', { class: 'swatch-grid' });
    [['Background', t.bg], ['Ink', t.ink], ['Accent', t.accent],
     ['Muted', t.muted], ['Page', t.pageBg], ['Page ink', t.pageInk]].forEach(function (pair) {
      swatches.appendChild(h('button', { class: 'swatch', style: { background: pair[1] }, title: pair[0] + ' ' + pair[1] }));
    });

    var themeList = h('div', { class: 'add-list' });
    Templates.THEMES.forEach(function (th) {
      themeList.appendChild(h('button', {
        class: 'add-item' + (th.id === Store.project.themeId ? ' is-active' : ''),
        onclick: function () {
          Store.project.themeId = th.id;
          Store.save();
          renderBrandPanel();
          Store.emit('theme');
          toast(th.name + ' is now the project theme. Rebuild to restyle every graphic.');
        }
      }, [
        h('strong', { text: th.name }),
        h('br'),
        h('span', { class: 'hint', text: th.mood })
      ]));
    });

    sidePanel.innerHTML = '';
    sidePanel.appendChild(h('div', {}, [
      panelTitle('Palette'), swatches,
      h('div', { class: 'panel-group' }, [panelTitle('Theme'), themeList]),
      h('div', { class: 'panel-group' }, [
        h('button', {
          class: 'btn btn-ghost btn-sm', text: 'Rebuild all graphics',
          onclick: function () {
            if (!Store.project.chapters.length) { toast('Import a manuscript first.'); return; }
            Store.commit();
            Store.project.designs = Templates.buildAll(Store.project);
            Store.project.activeDesignId = Store.project.designs[0].id;
            Store.save();
            Store.emit('change');
            refresh();
            toast('Rebuilt with ' + theme().name);
          }
        })
      ])
    ]));
  }

  function renderPanel() {
    if (state.panel === 'templates') renderTemplatesPanel();
    else if (state.panel === 'text') renderTextPanel();
    else if (state.panel === 'elements') renderElementsPanel();
    else if (state.panel === 'uploads') renderUploadsPanel();
    else renderBrandPanel();
  }

  /* ── properties ────────────────────────────────────────────────────── */

  function numberRow(label, value, onChange, step) {
    var input = h('input', { type: 'number', value: Math.round(value), step: step || 1 });
    input.addEventListener('change', function () {
      Store.commit();
      onChange(parseFloat(input.value) || 0);
      Store.save(); drawArtboard(); drawOverlay();
    });
    return h('div', { class: 'prop-row' }, [h('label', { text: label }), input]);
  }

  function colorRow(label, value, onChange) {
    var swatch = h('input', { type: 'color', value: toHex(value) });
    var field = h('input', { type: 'text', value: value });
    function commit(next) {
      Store.commit();
      onChange(next);
      Store.save(); drawArtboard(); drawOverlay();
    }
    swatch.addEventListener('change', function () { field.value = swatch.value; commit(swatch.value); });
    field.addEventListener('change', function () { commit(field.value); });
    return h('div', { class: 'prop-row' }, [
      h('label', { text: label }),
      h('div', { class: 'color-row' }, [swatch, field])
    ]);
  }

  function toHex(value) {
    if (/^#[0-9a-f]{6}$/i.test(value || '')) return value;
    if (/^#[0-9a-f]{3}$/i.test(value || '')) {
      return '#' + value.slice(1).split('').map(function (c) { return c + c; }).join('');
    }
    return '#000000';
  }

  function segRow(label, options, current, onPick) {
    var seg = h('div', { class: 'seg' });
    options.forEach(function (opt) {
      seg.appendChild(h('button', {
        class: opt.value === current ? 'is-active' : '',
        text: opt.label,
        onclick: function () {
          Store.commit();
          onPick(opt.value);
          Store.save(); drawArtboard(); drawOverlay(); renderProps();
        }
      }));
    });
    return h('div', { class: 'prop-row' }, [h('label', { text: label }), seg]);
  }

  function selectRow(label, options, current, onPick) {
    var sel = h('select', {});
    options.forEach(function (opt) {
      var o = h('option', { value: opt.value, text: opt.label });
      if (opt.value === current) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      Store.commit();
      onPick(sel.value);
      Store.save(); drawArtboard(); drawOverlay();
    });
    return h('div', { class: 'prop-row' }, [h('label', { text: label }), sel]);
  }

  function backgroundProps() {
    var d = design();
    if (!d) return h('p', { class: 'props-empty', text: 'No design open.' });
    var bg = d.bg || { type: 'solid', color: '#ffffff' };
    var rows = [
      h('p', { class: 'panel-title', text: 'Background' }),
      segRow('Type', [
        { label: 'Solid', value: 'solid' },
        { label: 'Gradient', value: 'gradient' }
      ], bg.type === 'gradient' ? 'gradient' : 'solid', function (type) {
        d.bg = type === 'gradient'
          ? { type: 'gradient', from: theme().bg, to: theme().accent, angle: 150 }
          : { type: 'solid', color: bg.color || theme().pageBg };
      })
    ];

    if (bg.type === 'gradient') {
      rows.push(colorRow('From', bg.from, function (v) { d.bg.from = v; }));
      rows.push(colorRow('To', bg.to, function (v) { d.bg.to = v; }));
      rows.push(numberRow('Angle', bg.angle || 150, function (v) { d.bg.angle = v; }));
    } else if (bg.type === 'image') {
      rows.push(h('p', { class: 'hint', text: 'Using an uploaded image. Pick a colour type above to clear it.' }));
    } else {
      rows.push(colorRow('Colour', bg.color || '#ffffff', function (v) { d.bg = { type: 'solid', color: v }; }));
    }

    rows.push(h('div', { class: 'prop-sep' }));
    rows.push(h('p', { class: 'panel-title', text: 'Artboard' }));
    rows.push(h('div', { class: 'prop-pair' }, [
      numberRow('Width', d.w, function (v) { d.w = Math.max(50, v); }),
      numberRow('Height', d.h, function (v) { d.h = Math.max(50, v); })
    ]));
    rows.push(h('p', { class: 'hint', text: 'Click an element on the canvas to style it. Double-click text to retype it.' }));
    return h('div', {}, rows);
  }

  function renderProps() {
    var el = selected();
    props.innerHTML = '';
    if (!el) { props.appendChild(backgroundProps()); return; }

    var rows = [h('p', { class: 'panel-title', text: el.type === 'text' ? 'Text' : el.type })];

    if (el.type === 'text') {
      var area = h('textarea', {});
      area.value = el.text;
      area.addEventListener('change', function () {
        Store.commit();
        el.text = area.value;
        Store.save(); drawArtboard(); drawOverlay();
      });
      rows.push(h('div', { class: 'prop-row' }, [h('label', { text: 'Content' }), area]));

      rows.push(selectRow('Font', TextLayout.FONTS.map(function (f) {
        return { label: f.label, value: f.stack };
      }), el.family, function (v) { el.family = v; }));

      rows.push(h('div', { class: 'prop-pair' }, [
        numberRow('Size', el.size, function (v) { el.size = Math.max(4, v); }),
        selectRow('Weight', [300, 400, 500, 600, 700, 800].map(function (w) {
          return { label: String(w), value: String(w) };
        }), String(el.weight), function (v) { el.weight = parseInt(v, 10); })
      ]));

      rows.push(segRow('Align', [
        { label: 'Left', value: 'left' },
        { label: 'Centre', value: 'center' },
        { label: 'Right', value: 'right' }
      ], el.align, function (v) { el.align = v; }));

      rows.push(h('div', { class: 'prop-pair' }, [
        numberRow('Line height', el.lineHeight, function (v) { el.lineHeight = Math.max(0.6, v); }, 0.05),
        numberRow('Letter spacing', el.letterSpacing || 0, function (v) { el.letterSpacing = v; }, 0.5)
      ]));

      rows.push(segRow('Style', [
        { label: 'Normal', value: 'normal' },
        { label: 'Italic', value: 'italic' },
        { label: 'CAPS', value: 'caps' }
      ], el.italic ? 'italic' : (el.uppercase ? 'caps' : 'normal'), function (v) {
        el.italic = v === 'italic';
        el.uppercase = v === 'caps';
      }));

      rows.push(colorRow('Colour', el.color, function (v) { el.color = v; }));

    } else if (el.type === 'image') {
      rows.push(segRow('Fit', [
        { label: 'Fill', value: 'cover' },
        { label: 'Fit', value: 'contain' }
      ], el.fit || 'cover', function (v) { el.fit = v; }));
      rows.push(numberRow('Corner radius', el.radius || 0, function (v) { el.radius = Math.max(0, v); }));

    } else {
      rows.push(colorRow('Fill', el.fill === 'transparent' ? '#ffffff' : el.fill, function (v) { el.fill = v; }));
      rows.push(colorRow('Stroke', el.stroke || '#000000', function (v) { el.stroke = v; }));
      rows.push(numberRow('Stroke width', el.strokeWidth || 0, function (v) { el.strokeWidth = Math.max(0, v); }));
      if (el.type !== 'ellipse') {
        rows.push(numberRow('Corner radius', el.radius || 0, function (v) { el.radius = Math.max(0, v); }));
      }
    }

    rows.push(h('div', { class: 'prop-sep' }));
    rows.push(h('div', { class: 'prop-pair' }, [
      numberRow('X', el.x, function (v) { el.x = v; }),
      numberRow('Y', el.y, function (v) { el.y = v; })
    ]));
    rows.push(h('div', { class: 'prop-pair' }, [
      numberRow('Width', el.w, function (v) { el.w = Math.max(6, v); }),
      el.type === 'text'
        ? numberRow('Rotation', el.rot || 0, function (v) { el.rot = v; })
        : numberRow('Height', el.h, function (v) { el.h = Math.max(6, v); })
    ]));
    if (el.type !== 'text') {
      rows.push(h('div', { class: 'prop-pair' }, [
        numberRow('Rotation', el.rot || 0, function (v) { el.rot = v; }),
        numberRow('Opacity %', (el.opacity == null ? 1 : el.opacity) * 100, function (v) {
          el.opacity = Math.max(0, Math.min(1, v / 100));
        })
      ]));
    } else {
      rows.push(numberRow('Opacity %', (el.opacity == null ? 1 : el.opacity) * 100, function (v) {
        el.opacity = Math.max(0, Math.min(1, v / 100));
      }));
    }

    rows.push(h('div', { class: 'prop-sep' }));
    rows.push(h('div', { class: 'prop-pair' }, [
      h('button', { class: 'btn btn-sm', text: 'Duplicate', onclick: duplicateSelected }),
      h('button', { class: 'btn btn-sm danger-btn', text: 'Delete', onclick: removeSelected })
    ]));

    rows.forEach(function (r) { props.appendChild(r); });
  }

  /* Light refresh of numeric fields while dragging, without rebuilding
     the panel and stealing focus from an open input. */
  function syncProps() {
    var el = selected();
    if (!el) return;
    var inputs = props.querySelectorAll('.prop-row input[type="number"]');
    if (!inputs.length) return;
    renderPropsSoon();
  }

  var propsTimer = null;
  function renderPropsSoon() {
    clearTimeout(propsTimer);
    propsTimer = setTimeout(function () { if (!drag) renderProps(); }, 120);
  }

  /* ── designs ───────────────────────────────────────────────────────── */

  function newDesign(d) {
    Store.commit();
    Store.project.designs.push(d);
    Store.project.activeDesignId = d.id;
    Store.save();
    Store.emit('change');
    refresh();
  }

  function renderPicker() {
    picker.innerHTML = '';
    Store.project.designs.forEach(function (d) {
      var opt = h('option', { value: d.id, text: d.name });
      if (d.id === Store.project.activeDesignId) opt.selected = true;
      picker.appendChild(opt);
    });
  }

  function openDesign(id) {
    Store.project.activeDesignId = id;
    Store.save();
    state.selId = null;
    refresh();
    fitZoom();
  }

  /* ── plumbing ──────────────────────────────────────────────────────── */

  function storeAsset(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var id = Store.uid('asset');
      Store.project.assets[id] = reader.result;
      Store.save();
      if (state.panel === 'uploads') renderUploadsPanel();
    };
    reader.readAsDataURL(file);
  }

  function toast(msg) {
    if (global.App && App.toast) App.toast(msg);
  }

  function onKeyDown(evt) {
    if (state.editing) return;
    var tag = (evt.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (document.getElementById('view-editor').classList.contains('is-active') === false) return;

    var el = selected();
    var mod = evt.ctrlKey || evt.metaKey;

    if (mod && evt.key.toLowerCase() === 'z') {
      evt.preventDefault();
      if (evt.shiftKey) Store.redo(); else Store.undo();
      refresh();
      return;
    }
    if (mod && evt.key.toLowerCase() === 'y') { evt.preventDefault(); Store.redo(); refresh(); return; }
    if (mod && evt.key.toLowerCase() === 'd' && el) { evt.preventDefault(); duplicateSelected(); return; }
    if (!el) return;

    if (evt.key === 'Delete' || evt.key === 'Backspace') { evt.preventDefault(); removeSelected(); return; }
    if (evt.key === 'Escape') { select(null); return; }
    if (evt.key === 'Enter' && el.type === 'text') { evt.preventDefault(); beginTextEdit(el); return; }

    var step = evt.shiftKey ? 10 : 1;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[evt.key]) {
      evt.preventDefault();
      Store.commit();
      el.x += moves[evt.key][0];
      el.y += moves[evt.key][1];
      Store.save();
      drawArtboard(); drawOverlay(); renderPropsSoon();
    }
  }

  function refresh() {
    if (!mounted) return;
    var d = design();
    if (d && Store.project.activeDesignId !== d.id) Store.project.activeDesignId = d.id;
    renderPicker();
    drawArtboard();
    if (!d || !d.elements.some(function (e) { return e.id === state.selId; })) state.selId = null;
    drawOverlay();
    renderProps();
    renderPanel();
    document.getElementById('btnUndo').disabled = !Store.canUndo();
    document.getElementById('btnRedo').disabled = !Store.canRedo();
  }

  function mount() {
    stageScroll = document.getElementById('stageScroll');
    stage = document.getElementById('stage');
    artboard = document.getElementById('artboard');
    overlay = document.getElementById('overlay');
    sidePanel = document.getElementById('sidePanel');
    props = document.getElementById('props');
    picker = document.getElementById('designPicker');
    zoomLabel = document.getElementById('zoomLabel');
    mounted = true;

    artboard.addEventListener('pointerdown', onArtboardPointerDown);
    artboard.addEventListener('dblclick', function (evt) {
      var target = evt.target.closest('.el');
      if (!target) return;
      var el = design().elements.filter(function (e) { return e.id === target.dataset.id; })[0];
      if (el && el.type === 'text') beginTextEdit(el);
    });
    overlay.addEventListener('pointerdown', onOverlayPointerDown);

    stageScroll.addEventListener('pointerdown', function (evt) {
      if (evt.target === stageScroll || evt.target === stage) select(null);
    });

    stageScroll.addEventListener('wheel', function (evt) {
      if (!evt.ctrlKey) return;
      evt.preventDefault();
      setZoom(state.zoom * (evt.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });

    document.querySelectorAll('.rail-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rail-btn').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.panel = btn.dataset.panel;
        renderPanel();
      });
    });

    document.querySelectorAll('[data-arrange]').forEach(function (b) {
      b.addEventListener('click', function () { arrange(b.dataset.arrange); });
    });
    document.querySelectorAll('[data-align]').forEach(function (b) {
      b.addEventListener('click', function () { align(b.dataset.align); });
    });

    document.getElementById('btnUndo').addEventListener('click', function () { Store.undo(); refresh(); });
    document.getElementById('btnRedo').addEventListener('click', function () { Store.redo(); refresh(); });
    document.getElementById('btnZoomIn').addEventListener('click', function () { setZoom(state.zoom * 1.2); });
    document.getElementById('btnZoomOut').addEventListener('click', function () { setZoom(state.zoom / 1.2); });
    document.getElementById('btnZoomFit').addEventListener('click', fitZoom);
    picker.addEventListener('change', function () { openDesign(picker.value); });

    document.getElementById('btnDownloadPng').addEventListener('click', async function () {
      var d = design();
      if (!d) return;
      var canvas = await Render.toCanvas(d, 2);
      var blob = await Render.toBlob(canvas);
      Exporter.download(blob, Exporter.slug(Store.project.title + '-' + d.name) + '.png');
    });

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', function () { if (mounted) drawOverlay(); });
    Store.on('history', function () {
      var u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
      if (u) u.disabled = !Store.canUndo();
      if (r) r.disabled = !Store.canRedo();
    });
  }

  global.Editor = {
    mount: mount,
    refresh: refresh,
    fitZoom: fitZoom,
    openDesign: openDesign,
    newDesign: newDesign,
    select: select
  };
})(window);
