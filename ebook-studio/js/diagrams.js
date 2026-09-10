/* Turning a bullet list into something you can look at.
 *
 * Each recipe takes the slide's own content and lays it out as a figure: steps,
 * cards, a comparison, a pyramid, a cycle. Nothing here invents content — it
 * only decides the shape the content should take, which is the whole point.
 * Figures are always light, so they print well inside a book.
 */
(function (global) {
  'use strict';

  var W = 1200;
  var M = 80;

  var T = function (p) { return Templates.text(p); };
  var R = function (p) { return Templates.rect(p); };
  var E = function (p) { return Templates.ellipse(p); };
  var mh = function (el) { return TextLayout.measuredHeight(el); };

  function fitTo(el, maxHeight, min) {
    el.size = TextLayout.fitSize(el, maxHeight, min || 12);
    return el;
  }

  /* ── colour ────────────────────────────────────────────────────────── */

  function rgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return '#' + [0, 1, 2].map(function (i) {
      return Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
    }).join('');
  }

  function tint(color, amount) { return mix(color, '#ffffff', amount); }

  /* Accent text on a pale accent card needs to stay dark enough to read. */
  function readable(theme, color) {
    var c = rgb(color);
    var luminance = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
    return luminance > 0.62 ? theme.pageInk : '#ffffff';
  }

  /* ── frame ─────────────────────────────────────────────────────────── */

  function frame(theme, name, kind) {
    return Templates.design({
      kind: kind || 'figure',
      name: name,
      w: W,
      h: 800,
      bg: { type: 'solid', color: theme.pageBg }
    });
  }

  function heading(theme, design, title, eyebrow) {
    var y = M;
    if (eyebrow) {
      var brow = T({
        x: M, y: y, w: W - M * 2, text: eyebrow, family: theme.ui, size: 22,
        weight: 700, uppercase: true, letterSpacing: 3, color: theme.accent
      });
      design.elements.push(brow);
      y += mh(brow) + 14;
    }
    if (title) {
      var head = fitTo(T({
        x: M, y: y, w: W - M * 2, text: title, family: theme.display, size: 54,
        weight: 700, color: theme.pageInk, lineHeight: 1.14
      }), 190, 26);
      design.elements.push(head);
      y += mh(head) + 12;

      design.elements.push(R({ x: M, y: y, w: 90, h: 5, fill: theme.accent }));
      y += 5 + 40;
    }
    return y;
  }

  /* The artboard ends where the content ends. A figure that reserved a fixed
     height would print with a band of dead space under short slides. */
  function close(design, bottom) {
    design.h = Math.round(Math.max(420, bottom + M));
    return design;
  }

  /* ── numbered cards ────────────────────────────────────────────────── */

  function keyCards(theme, spec) {
    var design = frame(theme, spec.name || 'Key points');
    var y = heading(theme, design, spec.title, spec.eyebrow);
    var items = spec.items.slice(0, 8);
    var twoUp = items.length >= 4 && items.every(function (i) { return i.length <= 88; });
    var perRow = twoUp ? 2 : 1;
    var gap = 18;
    var pad = 26;
    var colW = twoUp ? (W - M * 2 - gap) / 2 : W - M * 2;
    var top = y;

    /* A row is only as tall as its tallest card, so the two columns line up
       instead of drifting apart as the text lengths differ. */
    for (var start = 0; start < items.length; start += perRow) {
      var row = items.slice(start, start + perRow).map(function (item, column) {
        var x = M + column * (colW + gap);
        var label = T({
          x: x + pad + 58, y: 0, w: colW - pad * 2 - 58, text: item,
          family: theme.body, size: 27, color: theme.pageInk, lineHeight: 1.42
        });
        return { x: x, label: label, height: Math.max(96, mh(label) + pad * 2) };
      });

      var rowHeight = row.reduce(function (a, cell) { return Math.max(a, cell.height); }, 0);

      row.forEach(function (cell, column) {
        cell.label.y = top + pad;
        design.elements.push(R({
          x: cell.x, y: top, w: colW, h: rowHeight, radius: 16,
          fill: tint(theme.accent, 0.9)
        }));
        design.elements.push(E({
          x: cell.x + pad, y: top + pad + 2, w: 40, h: 40, fill: theme.accent
        }));
        design.elements.push(T({
          x: cell.x + pad, y: top + pad + 10, w: 40, text: String(start + column + 1),
          family: theme.ui, size: 22, weight: 700,
          color: readable(theme, theme.accent), align: 'center'
        }));
        design.elements.push(cell.label);
      });

      top += rowHeight + gap;
    }

    return close(design, top - gap);
  }

  /* ── step flow ─────────────────────────────────────────────────────── */

  function stepFlow(theme, spec) {
    var design = frame(theme, spec.name || 'Steps');
    var y = heading(theme, design, spec.title, spec.eyebrow || 'Step by step');
    var items = spec.items.slice(0, 8);
    var dot = 56;
    var left = M + dot / 2;
    var textX = M + dot + 34;
    var gap = 30;
    var top = y;

    items.forEach(function (item, i) {
      var parts = item.split(/\s*[:\u2013\u2014-]\s+/);
      var strongPart = parts.length > 1 && parts[0].length <= 42 ? parts.shift() : '';
      var rest = parts.join(' — ');

      var stack = [];
      if (strongPart) {
        stack.push(T({
          x: textX, y: 0, w: W - textX - M, text: strongPart,
          family: theme.ui, size: 29, weight: 700, color: theme.pageInk, lineHeight: 1.3
        }));
      }
      if (rest) {
        stack.push(T({
          x: textX, y: 0, w: W - textX - M, text: rest,
          family: theme.body, size: 26, color: mix(theme.pageInk, '#ffffff', 0.28), lineHeight: 1.45
        }));
      }

      var cursor = top + 6;
      stack.forEach(function (el) { el.y = cursor; cursor += mh(el) + 6; });
      var blockHeight = Math.max(dot, cursor - top);

      if (i < items.length - 1) {
        design.elements.push(R({
          x: left - 2, y: top + dot, w: 4, h: blockHeight + gap - dot + 4,
          fill: tint(theme.accent, 0.62)
        }));
      }
      design.elements.push(E({ x: M, y: top, w: dot, h: dot, fill: theme.accent }));
      design.elements.push(T({
        x: M, y: top + 14, w: dot, text: String(i + 1), family: theme.ui,
        size: 26, weight: 700, color: readable(theme, theme.accent), align: 'center'
      }));
      stack.forEach(function (el) { design.elements.push(el); });

      top += blockHeight + gap;
    });

    return close(design, top - gap);
  }

  /* ── side by side ──────────────────────────────────────────────────── */

  function comparison(theme, spec) {
    var design = frame(theme, spec.name || 'Comparison');
    var y = heading(theme, design, spec.title, spec.eyebrow);
    var gap = 26;
    var colW = (W - M * 2 - gap) / 2;
    var pad = 30;
    var sides = [spec.left, spec.right];
    var tallest = 0;

    var bodies = sides.map(function (side, s) {
      var x = M + s * (colW + gap);
      var cursor = y + pad + 52;
      var els = [];

      side.items.slice(0, 6).forEach(function (item) {
        els.push(R({ x: x + pad, y: cursor + 12, w: 9, h: 9, radius: 5, fill: theme.accent }));
        var line = T({
          x: x + pad + 26, y: cursor, w: colW - pad * 2 - 26, text: item,
          family: theme.body, size: 25, color: theme.pageInk, lineHeight: 1.42
        });
        els.push(line);
        cursor += mh(line) + 18;
      });
      tallest = Math.max(tallest, cursor - y + pad);
      return { x: x, els: els, head: side.head };
    });

    bodies.forEach(function (body, s) {
      design.elements.push(R({
        x: body.x, y: y, w: colW, h: tallest, radius: 18,
        fill: s === 0 ? tint(theme.accent, 0.9) : mix(theme.pageInk, '#ffffff', 0.94)
      }));
      design.elements.push(R({ x: body.x, y: y, w: colW, h: 6, radius: 3, fill: s === 0 ? theme.accent : mix(theme.pageInk, '#ffffff', 0.55) }));
      design.elements.push(fitTo(T({
        x: body.x + pad, y: y + pad, w: colW - pad * 2, text: body.head,
        family: theme.ui, size: 30, weight: 700, color: theme.pageInk, uppercase: true, letterSpacing: 1
      }), 44, 16));
      body.els.forEach(function (el) { design.elements.push(el); });
    });

    return close(design, y + tallest);
  }

  /* ── pyramid ───────────────────────────────────────────────────────── */

  function pyramid(theme, spec) {
    var design = frame(theme, spec.name || 'Levels');
    var y = heading(theme, design, spec.title, spec.eyebrow);
    var items = spec.items.slice(0, 5);
    var n = items.length;
    var rowGap = 12;
    var top = y;

    items.forEach(function (item, i) {
      var scale = 0.44 + (i / Math.max(1, n - 1)) * 0.56;
      var barW = Math.round((W - M * 2) * scale);
      var x = Math.round((W - barW) / 2);
      var label = T({
        x: x + 26, y: 0, w: barW - 52, text: item, family: theme.ui,
        size: 27, weight: 600, color: readable(theme, mix(theme.accent, '#ffffff', i / Math.max(1, n))),
        align: 'center', lineHeight: 1.32
      });
      var height = Math.max(78, mh(label) + 40);
      label.y = top + (height - mh(label)) / 2;

      design.elements.push(R({
        x: x, y: top, w: barW, h: height, radius: 10,
        fill: mix(theme.accent, '#ffffff', (i / Math.max(1, n)) * 0.7)
      }));
      design.elements.push(label);
      top += height + rowGap;
    });

    return close(design, top - rowGap);
  }

  /* ── cycle ─────────────────────────────────────────────────────────── */

  function cycle(theme, spec) {
    var items = spec.items.slice(0, 6);
    if (items.length < 3 || items.length > 6) return keyCards(theme, spec);

    var design = frame(theme, spec.name || 'Cycle');
    var y = heading(theme, design, spec.title, spec.eyebrow || 'A repeating cycle');
    var cardW = 300;
    var radius = 300;
    var cx = W / 2;
    var cy = y + radius + 60;

    design.elements.push(E({
      x: cx - 130, y: cy - 130, w: 260, h: 260,
      fill: 'transparent', stroke: tint(theme.accent, 0.6), strokeWidth: 6
    }));
    design.elements.push(fitTo(T({
      x: cx - 105, y: cy - 34, w: 210, text: spec.centre || 'Repeat',
      family: theme.ui, size: 27, weight: 700, color: theme.pageInk,
      align: 'center', uppercase: true, letterSpacing: 1
    }), 70, 14));

    items.forEach(function (item, i) {
      var angle = (-90 + i * 360 / items.length) * Math.PI / 180;
      var px = cx + Math.cos(angle) * radius;
      var py = cy + Math.sin(angle) * radius;

      var label = fitTo(T({
        x: px - cardW / 2 + 22, y: 0, w: cardW - 44, text: item,
        family: theme.body, size: 24, color: theme.pageInk, align: 'center', lineHeight: 1.36
      }), 130, 14);
      var height = mh(label) + 66;
      label.y = py - height / 2 + 48;

      design.elements.push(R({
        x: px - cardW / 2, y: py - height / 2, w: cardW, h: height, radius: 16,
        fill: tint(theme.accent, 0.9)
      }));
      design.elements.push(E({ x: px - 17, y: py - height / 2 + 12, w: 34, h: 34, fill: theme.accent }));
      design.elements.push(T({
        x: px - 17, y: py - height / 2 + 19, w: 34, text: String(i + 1),
        family: theme.ui, size: 19, weight: 700,
        color: readable(theme, theme.accent), align: 'center'
      }));
      design.elements.push(label);
    });

    return close(design, cy + radius + 90);
  }

  /* ── numbers ───────────────────────────────────────────────────────── */

  function statCards(theme, spec) {
    var design = frame(theme, spec.name || 'By the numbers');
    var y = heading(theme, design, spec.title, spec.eyebrow || 'By the numbers');
    var items = spec.items.slice(0, 4);
    var gap = 22;
    var colW = (W - M * 2 - gap * (items.length - 1)) / items.length;
    var tallest = 0;

    var labels = items.map(function (item, i) {
      var x = M + i * (colW + gap);
      var value = fitTo(T({
        x: x + 20, y: y + 34, w: colW - 40, text: item.value, family: theme.display,
        size: 78, weight: 700, color: theme.accent, align: 'center', lineHeight: 1.05
      }), 190, 30);
      var label = fitTo(T({
        x: x + 20, y: y + 34 + mh(value) + 16, w: colW - 40, text: item.label,
        family: theme.body, size: 24, color: theme.pageInk, align: 'center', lineHeight: 1.36
      }), 150, 13);
      tallest = Math.max(tallest, mh(value) + mh(label) + 100);
      return { x: x, value: value, label: label };
    });

    labels.forEach(function (item) {
      design.elements.push(R({
        x: item.x, y: y, w: colW, h: tallest, radius: 18,
        fill: mix(theme.pageInk, '#ffffff', 0.95)
      }));
      design.elements.push(item.value);
      design.elements.push(item.label);
    });

    return close(design, y + tallest);
  }

  /* ── definition ────────────────────────────────────────────────────── */

  function definitionCard(theme, spec) {
    var design = frame(theme, 'Definition: ' + spec.term);
    design.bg = { type: 'solid', color: tint(theme.accent, 0.92) };

    var y = M + 10;
    design.elements.push(T({
      x: M, y: y, w: W - M * 2, text: spec.eyebrow || 'Key term', family: theme.ui,
      size: 24, weight: 700, uppercase: true, letterSpacing: 4, color: theme.accent
    }));
    y += 48;

    var term = fitTo(T({
      x: M, y: y, w: W - M * 2, text: spec.term, family: theme.display,
      size: 76, weight: 700, color: theme.pageInk, lineHeight: 1.1
    }), 200, 32);
    design.elements.push(term);
    y += mh(term) + 26;

    design.elements.push(R({ x: M, y: y, w: 110, h: 5, fill: theme.accent }));
    y += 42;

    var meaning = fitTo(T({
      x: M, y: y, w: W - M * 2, text: spec.meaning, family: theme.body,
      size: 32, color: theme.pageInk, lineHeight: 1.5
    }), 320, 17);
    design.elements.push(meaning);

    return close(design, y + mh(meaning));
  }

  /* ── timeline ──────────────────────────────────────────────────────── */

  function timeline(theme, spec) {
    var design = frame(theme, spec.name || 'Timeline');
    var y = heading(theme, design, spec.title, spec.eyebrow || 'In order');
    var items = spec.items.slice(0, 7);
    var lineX = M + 20;
    var textX = M + 78;
    var top = y + 6;
    var first = top;

    items.forEach(function (item) {
      var when = T({
        x: textX, y: top, w: W - textX - M, text: item.when, family: theme.ui,
        size: 26, weight: 700, color: theme.accent, uppercase: true, letterSpacing: 1
      });
      var what = T({
        x: textX, y: top + mh(when) + 6, w: W - textX - M, text: item.what,
        family: theme.body, size: 26, color: theme.pageInk, lineHeight: 1.44
      });
      design.elements.push(E({ x: lineX - 11, y: top + 4, w: 22, h: 22, fill: theme.accent }));
      design.elements.push(when, what);
      top += mh(when) + mh(what) + 44;
    });

    design.elements.unshift(R({
      x: lineX - 2, y: first + 14, w: 4, h: Math.max(0, top - first - 58),
      fill: tint(theme.accent, 0.62)
    }));

    return close(design, top - 20);
  }

  /* ── picture ───────────────────────────────────────────────────────── */

  function imageFeature(theme, spec) {
    var design = frame(theme, spec.name || 'Picture');
    var y = heading(theme, design, spec.title, spec.eyebrow);
    var imgH = Math.round((W - M * 2) * 0.58);

    design.elements.push(Templates.image({
      x: M, y: y, w: W - M * 2, h: imgH, assetId: spec.assetId, fit: 'cover', radius: 16
    }));
    y += imgH;

    if (spec.caption) {
      y += 20;
      var caption = fitTo(T({
        x: M, y: y, w: W - M * 2, text: spec.caption, family: theme.body,
        size: 25, italic: true, color: mix(theme.pageInk, '#ffffff', 0.32), lineHeight: 1.42
      }), 130, 14);
      design.elements.push(caption);
      y += mh(caption);
    }
    return close(design, y);
  }

  /* ── choosing a shape ──────────────────────────────────────────────── */

  var ORDINAL = /^\s*(\d+[.)]|step\s*\d|first|second|third|fourth|fifth|finally|next|then|lastly)\b/i;
  /* A leading "1." is a list marker, not a statistic, so it is ruled out first. */
  var NUMBERY = /^\s*(?!\d+[.)]\s)(?:[₱$€£]\s*)?\d[\d,.]*\s*(?:%|x|hrs?|hours?|days?|weeks?|months?|years?|kwh|km|kg|bn|k|million|billion)?\b/i;

  function splitPair(text) {
    var m = text.match(/^(.{2,48}?)\s*[:\u2013\u2014]\s+(.{4,})$/);
    if (m) return { head: m[1].trim(), tail: m[2].trim() };
    var dash = text.match(/^(.{2,48}?)\s+-\s+(.{4,})$/);
    return dash ? { head: dash[1].trim(), tail: dash[2].trim() } : null;
  }

  /* Reads the slide and picks the layout its content is already shaped like. */
  function choose(slide) {
    var title = (slide.title || '').toLowerCase();
    var tops = slide.bullets.filter(function (b) { return b.level === 0; });
    var texts = tops.map(function (b) { return b.text; });
    var n = texts.length;

    if (!n && slide.images.length) return 'image';
    if (!n) return 'statement';

    var ordinals = texts.filter(function (t) { return ORDINAL.test(t); }).length;
    var numbers = texts.filter(function (t) { return NUMBERY.test(t); }).length;
    var dated = texts.filter(function (t) {
      return /^\s*(\d{4}|(19|20)\d{2}|q[1-4]|day\s*\d|week\s*\d|month\s*\d|phase\s*\d)\b/i.test(t);
    }).length;

    if (n === 1) return 'statement';
    if (dated >= Math.max(2, n - 1)) return 'timeline';
    if (ordinals >= Math.max(2, n - 1)) return 'steps';
    if (/\bcycle|loop|continuous|repeat|iterat/.test(title) && n >= 3 && n <= 6) return 'cycle';
    if (numbers >= 2 && n <= 4 && texts.every(function (t) { return t.length <= 90; })) return 'stats';
    if (/\bvs\.?\b|versus|compared|difference between|before and after|pros and cons/.test(title) && n >= 2) return 'comparison';
    if (/\blevels?|hierarch|pyramid|layers|maturity|tiers?\b/.test(title) && n >= 3 && n <= 5) return 'pyramid';
    if (/\bsteps?|stages?|process|how to|workflow|procedure|phases?\b/.test(title) && n >= 2) return 'steps';
    if (n === 2 && texts.every(function (t) { return t.length <= 110; })) return 'comparison';
    return 'cards';
  }

  /* Strips the "1." or "Step 2 -" that a step layout is about to draw anyway. */
  function stripOrdinal(text) {
    return text.replace(/^\s*(\d+[.)]|step\s*\d+\s*[:.\u2013\u2014-]?)\s*/i, '').trim() || text;
  }

  function build(theme, slide, shape) {
    var kind = shape || choose(slide);
    var tops = slide.bullets.filter(function (b) { return b.level === 0; });
    var texts = tops.map(function (b) { return b.text; });
    var title = slide.title || '';

    if (kind === 'image' && slide.assets && slide.assets.length) {
      return imageFeature(theme, {
        title: title, assetId: slide.assets[0],
        caption: texts[0] || slide.caption || '', name: title || 'Picture'
      });
    }

    if (kind === 'statement') {
      var body = texts[0] || slide.notes || '';
      var pair = body && splitPair(body);
      return definitionCard(theme, {
        term: title || (pair ? pair.head : 'Key idea'),
        meaning: pair ? pair.tail : body,
        eyebrow: pair || !body ? 'Key term' : 'Remember this'
      });
    }

    if (kind === 'timeline') {
      return timeline(theme, {
        title: title,
        items: texts.map(function (t) {
          var m = t.match(/^\s*([^\s:\u2013\u2014-]{1,18})\s*[:\u2013\u2014-]?\s*(.*)$/);
          return { when: m ? m[1] : '', what: m && m[2] ? m[2] : t };
        }),
        name: title || 'Timeline'
      });
    }

    if (kind === 'stats') {
      return statCards(theme, {
        title: title,
        items: texts.map(function (t) {
          var m = t.match(/^\s*((?:[₱$€£]\s*)?[\d,.]+\s*(?:%|x)?)\s*[:\u2013\u2014-]?\s*(.*)$/);
          return m && m[2] ? { value: m[1].trim(), label: m[2].trim() } : { value: t.split(' ')[0], label: t };
        }),
        name: title || 'Numbers'
      });
    }

    if (kind === 'comparison') {
      var half = Math.ceil(texts.length / 2);
      var left = texts.slice(0, texts.length === 2 ? 1 : half);
      var right = texts.slice(texts.length === 2 ? 1 : half);
      var heads = title.split(/\s+vs\.?\s+|\s+versus\s+/i);
      return comparison(theme, {
        title: title,
        left:  { head: heads[1] ? heads[0].trim() : 'One side',  items: left },
        right: { head: heads[1] ? heads[1].trim() : 'The other', items: right },
        name: title || 'Comparison'
      });
    }

    if (kind === 'pyramid') return pyramid(theme, { title: title, items: texts, name: title || 'Levels' });
    if (kind === 'cycle')   return cycle(theme, { title: title, items: texts.map(stripOrdinal), centre: shortCentre(title), name: title || 'Cycle' });
    if (kind === 'steps')   return stepFlow(theme, { title: title, items: texts.map(stripOrdinal), name: title || 'Steps' });

    return keyCards(theme, { title: title, items: texts, name: title || 'Key points' });
  }

  function shortCentre(title) {
    var words = title.split(/\s+/).filter(function (w) { return w.length > 3; });
    return (words[0] || 'Cycle').replace(/[^\w\s-]/g, '');
  }

  global.Diagrams = {
    choose: choose,
    build: build,
    splitPair: splitPair,
    stripOrdinal: stripOrdinal,
    keyCards: keyCards,
    stepFlow: stepFlow,
    comparison: comparison,
    pyramid: pyramid,
    cycle: cycle,
    statCards: statCards,
    definitionCard: definitionCard,
    timeline: timeline,
    imageFeature: imageFeature,
    tint: tint,
    mix: mix
  };
})(window);
