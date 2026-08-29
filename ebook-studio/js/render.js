/* Drawing a design, twice.
 *
 * toDom() is what you see and edit. toCanvas() is what you export. They walk
 * the same element list with the same wrapped lines from TextLayout, so a PNG
 * comes out matching the screen instead of nearly matching it.
 */
(function (global) {
  'use strict';

  var imgCache = {};

  function assetUrl(assetId) {
    var assets = Store.project.assets || {};
    return assets[assetId] || null;
  }

  function loadImage(url) {
    if (imgCache[url]) return imgCache[url];
    imgCache[url] = new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Image failed to load')); };
      img.src = url;
    });
    return imgCache[url];
  }

  var fontsPrimed = null;

  /* A web font that is not on the page yet has not been downloaded, and
     canvas measureText would silently fall back and wrap the wrong way. Ask
     for every family the picker offers before anything gets measured. */
  function ready() {
    if (!document.fonts) return Promise.resolve();
    if (fontsPrimed) return fontsPrimed;

    var specs = [];
    TextLayout.FONTS.forEach(function (f) {
      [300, 400, 500, 600, 700, 800].forEach(function (weight) {
        specs.push(weight + ' 40px ' + f.stack);
      });
    });

    fontsPrimed = Promise.all(specs.map(function (spec) {
      return document.fonts.load(spec).catch(function () {});
    })).then(function () { return document.fonts.ready; });

    return fontsPrimed;
  }

  /* Height an element occupies. Text is measured; everything else is told. */
  function elementHeight(el) {
    if (el.type === 'text') return TextLayout.measuredHeight(el);
    return el.h || 0;
  }

  function backgroundCss(bg) {
    if (!bg) return '#ffffff';
    if (bg.type === 'gradient') {
      return 'linear-gradient(' + (bg.angle || 160) + 'deg, ' + bg.from + ', ' + bg.to + ')';
    }
    return bg.color || '#ffffff';
  }

  /* ── DOM ───────────────────────────────────────────────────────────── */

  function textNode(el) {
    var node = document.createElement('div');
    node.className = 'el el-text';
    var lines = TextLayout.wrap(el);
    var lh = TextLayout.lineHeightPx(el);

    node.style.width = el.w + 'px';
    node.style.height = (lines.length * lh) + 'px';
    node.style.fontFamily = el.family;
    node.style.fontSize = el.size + 'px';
    node.style.fontWeight = el.weight;
    node.style.fontStyle = el.italic ? 'italic' : 'normal';
    node.style.color = el.color;
    node.style.textAlign = el.align;
    node.style.letterSpacing = (el.letterSpacing || 0) + 'px';

    lines.forEach(function (line) {
      var row = document.createElement('div');
      row.className = 'el-line-row';
      row.style.height = lh + 'px';
      row.style.lineHeight = lh + 'px';
      row.textContent = line;
      node.appendChild(row);
    });
    return node;
  }

  function shapeNode(el) {
    var node = document.createElement('div');
    node.className = 'el';
    node.style.width = el.w + 'px';
    node.style.height = el.h + 'px';
    node.style.background = el.fill === 'transparent' ? 'none' : el.fill;
    node.style.borderRadius = el.type === 'ellipse' ? '50%' : (el.radius || 0) + 'px';
    if (el.strokeWidth > 0 && el.stroke) {
      node.style.border = el.strokeWidth + 'px solid ' + el.stroke;
    }
    return node;
  }

  function imageNode(el) {
    var node = document.createElement('div');
    node.className = 'el';
    node.style.width = el.w + 'px';
    node.style.height = el.h + 'px';
    node.style.borderRadius = (el.radius || 0) + 'px';
    node.style.overflow = 'hidden';
    node.style.background = '#e8eaee';

    var url = assetUrl(el.assetId);
    if (url) {
      var img = document.createElement('img');
      img.src = url;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = el.fit || 'cover';
      img.style.display = 'block';
      img.draggable = false;
      node.appendChild(img);
    }
    return node;
  }

  function elementNode(el) {
    var node = el.type === 'text' ? textNode(el)
             : el.type === 'image' ? imageNode(el)
             : shapeNode(el);
    node.dataset.id = el.id;
    node.style.left = el.x + 'px';
    node.style.top = el.y + 'px';
    node.style.opacity = el.opacity == null ? 1 : el.opacity;
    if (el.rot) node.style.transform = 'rotate(' + el.rot + 'deg)';
    return node;
  }

  function toDom(design, container) {
    container.innerHTML = '';
    container.style.width = design.w + 'px';
    container.style.height = design.h + 'px';
    container.style.background = backgroundCss(design.bg);

    if (design.bg && design.bg.type === 'image') {
      var url = assetUrl(design.bg.assetId);
      if (url) {
        container.style.background = 'center / ' + (design.bg.fit || 'cover') + ' no-repeat url("' + url + '")';
      }
    }
    design.elements.forEach(function (el) { container.appendChild(elementNode(el)); });
  }

  /* ── canvas ────────────────────────────────────────────────────────── */

  function roundRectPath(ctx, x, y, w, h, r) {
    var rad = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rad); return; }
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  /* Match the CSS line box: half the leading above, then the ascent. */
  function baselineOffset(ctx, el, lh) {
    var m = ctx.measureText('Hg');
    var ascent  = m.fontBoundingBoxAscent  || el.size * 0.8;
    var descent = m.fontBoundingBoxDescent || el.size * 0.2;
    return (lh - (ascent + descent)) / 2 + ascent;
  }

  function drawText(ctx, el) {
    var lines = TextLayout.wrap(el);
    var lh = TextLayout.lineHeightPx(el);
    ctx.font = TextLayout.fontString(el);
    if ('letterSpacing' in ctx) ctx.letterSpacing = (el.letterSpacing || 0) + 'px';
    ctx.fillStyle = el.color;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    var offset = baselineOffset(ctx, el, lh);

    lines.forEach(function (line, i) {
      var width = ctx.measureText(line).width;
      var x = el.x;
      if (el.align === 'center') x = el.x + (el.w - width) / 2;
      else if (el.align === 'right') x = el.x + el.w - width;
      ctx.fillText(line, x, el.y + i * lh + offset);
    });
  }

  function drawCover(ctx, img, x, y, w, h, fit) {
    var ir = img.naturalWidth / img.naturalHeight;
    var br = w / h;
    var dw, dh;
    if (fit === 'contain' ? ir > br : ir < br) { dw = w; dh = w / ir; }
    else { dh = h; dw = h * ir; }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  async function drawBackground(ctx, design) {
    var bg = design.bg || { type: 'solid', color: '#ffffff' };
    if (bg.type === 'gradient') {
      var rad = ((bg.angle || 160) - 90) * Math.PI / 180;
      var cx = design.w / 2, cy = design.h / 2;
      var len = Math.abs(design.w * Math.cos(rad)) + Math.abs(design.h * Math.sin(rad));
      var g = ctx.createLinearGradient(
        cx - Math.cos(rad) * len / 2, cy - Math.sin(rad) * len / 2,
        cx + Math.cos(rad) * len / 2, cy + Math.sin(rad) * len / 2
      );
      g.addColorStop(0, bg.from);
      g.addColorStop(1, bg.to);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, design.w, design.h);
      return;
    }
    if (bg.type === 'image') {
      var url = assetUrl(bg.assetId);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, design.w, design.h);
      if (url) {
        try {
          var img = await loadImage(url);
          drawCover(ctx, img, 0, 0, design.w, design.h, bg.fit || 'cover');
        } catch (e) { /* leave the white ground */ }
      }
      return;
    }
    ctx.fillStyle = bg.color || '#ffffff';
    ctx.fillRect(0, 0, design.w, design.h);
  }

  async function toCanvas(design, scale) {
    await ready();
    var s = scale || 1;
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(design.w * s);
    canvas.height = Math.round(design.h * s);
    var ctx = canvas.getContext('2d');
    ctx.scale(s, s);

    await drawBackground(ctx, design);

    for (var i = 0; i < design.elements.length; i++) {
      var el = design.elements[i];
      var h = elementHeight(el);
      ctx.save();
      ctx.globalAlpha = el.opacity == null ? 1 : el.opacity;

      if (el.rot) {
        var cx = el.x + el.w / 2;
        var cy = el.y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(el.rot * Math.PI / 180);
        ctx.translate(-cx, -cy);
      }

      if (el.type === 'text') {
        drawText(ctx, el);

      } else if (el.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
        if (el.fill && el.fill !== 'transparent') { ctx.fillStyle = el.fill; ctx.fill(); }
        if (el.strokeWidth > 0 && el.stroke) { ctx.lineWidth = el.strokeWidth; ctx.strokeStyle = el.stroke; ctx.stroke(); }

      } else if (el.type === 'image') {
        var url = assetUrl(el.assetId);
        if (url) {
          try {
            var img = await loadImage(url);
            ctx.save();
            roundRectPath(ctx, el.x, el.y, el.w, el.h, el.radius);
            ctx.clip();
            drawCover(ctx, img, el.x, el.y, el.w, el.h, el.fit || 'cover');
            ctx.restore();
          } catch (e) { /* skip a broken image rather than abort the export */ }
        }

      } else {
        roundRectPath(ctx, el.x, el.y, el.w, el.h, el.radius);
        if (el.fill && el.fill !== 'transparent') { ctx.fillStyle = el.fill; ctx.fill(); }
        if (el.strokeWidth > 0 && el.stroke) {
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeStyle = el.stroke;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    return canvas;
  }

  async function toDataUrl(design, scale) {
    return (await toCanvas(design, scale)).toDataURL('image/png');
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
  }

  /* A thumbnail wide enough to stay crisp in the dashboard grid. */
  function thumbScale(design, targetWidth) {
    return Math.min(1, (targetWidth || 320) / design.w);
  }

  global.Render = {
    ready: ready,
    toDom: toDom,
    elementNode: elementNode,
    elementHeight: elementHeight,
    backgroundCss: backgroundCss,
    toCanvas: toCanvas,
    toDataUrl: toDataUrl,
    toBlob: toBlob,
    thumbScale: thumbScale,
    loadImage: loadImage,
    assetUrl: assetUrl
  };
})(window);
