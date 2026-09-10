/* Themes, trim sizes and the layout recipes that build designs.
 *
 * Every recipe is written in terms of the artboard's own width and height, so
 * the same cover recipe works on a 6x9 paperback and an 8x8 square.
 */
(function (global) {
  'use strict';

  var uid = function (p) { return Store.uid(p); };

  function F(label) {
    var hit = TextLayout.FONTS.filter(function (f) { return f.label === label; })[0];
    return (hit || TextLayout.FONTS[0]).stack;
  }

  /* ── trim sizes ────────────────────────────────────────────────────── */

  var PPI = 150;   // artboard pixels per inch; PNG export doubles this to 300

  var TRIMS = [
    { id: 'trade',  name: 'Trade paperback - 6 x 9 in',  win: 6,    hin: 9 },
    { id: 'digest', name: 'Digest - 5.5 x 8.5 in',       win: 5.5,  hin: 8.5 },
    { id: 'a5',     name: 'A5 - 148 x 210 mm',           win: 5.83, hin: 8.27 },
    { id: 'square', name: 'Square - 8 x 8 in',           win: 8,    hin: 8 },
    { id: 'letter', name: 'US Letter - 8.5 x 11 in',     win: 8.5,  hin: 11 }
  ];

  function trimById(id) {
    return TRIMS.filter(function (t) { return t.id === id; })[0] || TRIMS[0];
  }

  function trimPx(id) {
    var t = trimById(id);
    return { w: Math.round(t.win * PPI), h: Math.round(t.hin * PPI) };
  }

  /* ── themes ────────────────────────────────────────────────────────── */

  var THEMES = [
    {
      id: 'midnight', name: 'Midnight', mood: 'Serious non-fiction',
      bg: '#101430', ink: '#ffffff', accent: '#ffb45c', muted: '#a6adcf',
      pageBg: '#ffffff', pageInk: '#181a26',
      display: F('Playfair Display'), body: F('Lora'), ui: F('Inter'),
      cover: 'stack'
    },
    {
      id: 'sunbeam', name: 'Sunbeam', mood: 'Warm and practical',
      bg: '#fff6e9', ink: '#2a1c0e', accent: '#e8622c', muted: '#8a7660',
      pageBg: '#fffdf8', pageInk: '#241a10',
      display: F('DM Serif Display'), body: F('Lora'), ui: F('Inter'),
      cover: 'band'
    },
    {
      id: 'graphite', name: 'Graphite', mood: 'Modern business',
      bg: '#1b1c1f', ink: '#f4f4f5', accent: '#5ce2b0', muted: '#9a9ba1',
      pageBg: '#ffffff', pageInk: '#1b1c1f',
      display: F('Space Grotesk'), body: F('Inter'), ui: F('Inter'),
      cover: 'bold'
    },
    {
      id: 'linen', name: 'Linen', mood: 'Quiet and literary',
      bg: '#f3f0e9', ink: '#2c2a26', accent: '#8a6a4a', muted: '#7d786f',
      pageBg: '#faf8f4', pageInk: '#2c2a26',
      display: F('Playfair Display'), body: F('Lora'), ui: F('Inter'),
      cover: 'minimal'
    },
    {
      id: 'bloom', name: 'Bloom', mood: 'Bright and personal',
      bg: '#2a1140', ink: '#ffffff', accent: '#ff77b0', muted: '#c9a8e0',
      pageBg: '#ffffff', pageInk: '#241033',
      display: F('Playfair Display'), body: F('Inter'), ui: F('Inter'),
      cover: 'gradient'
    },
    {
      id: 'signal', name: 'Signal', mood: 'Bold how-to',
      bg: '#f5f5f2', ink: '#111111', accent: '#1f4fff', muted: '#6b6b66',
      pageBg: '#ffffff', pageInk: '#111111',
      display: F('Bebas Neue'), body: F('Inter'), ui: F('Inter'),
      cover: 'poster'
    }
  ];

  function themeById(id) {
    return THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0];
  }

  /* ── element factories ─────────────────────────────────────────────── */

  function text(props) {
    return Object.assign({
      id: uid('el'), type: 'text', x: 0, y: 0, w: 200,
      text: 'Text', family: F('Inter'), size: 32, weight: 400,
      italic: false, uppercase: false, color: '#000000', align: 'left',
      lineHeight: 1.2, letterSpacing: 0, opacity: 1, rot: 0
    }, props);
  }

  function rect(props) {
    return Object.assign({
      id: uid('el'), type: 'rect', x: 0, y: 0, w: 100, h: 100,
      fill: '#000000', radius: 0, opacity: 1, rot: 0,
      stroke: '', strokeWidth: 0
    }, props);
  }

  function ellipse(props) {
    return Object.assign(rect(props), { type: 'ellipse' }, props, { id: props.id || uid('el') });
  }

  function image(props) {
    return Object.assign({
      id: uid('el'), type: 'image', x: 0, y: 0, w: 300, h: 300,
      assetId: null, fit: 'cover', radius: 0, opacity: 1, rot: 0
    }, props);
  }

  function design(props) {
    return Object.assign({
      id: uid('dsn'), name: 'Design', kind: 'custom',
      w: 900, h: 1350,
      bg: { type: 'solid', color: '#ffffff' },
      elements: []
    }, props);
  }

  /* Height a text element will occupy once wrapped. */
  function h(el) { return TextLayout.measuredHeight(el); }

  /* Shrink until it fits the space we reserved for it, then report height. */
  function fit(el, maxHeight, minSize) {
    el.size = TextLayout.fitSize(el, maxHeight, minSize);
    return el;
  }

  /* ── covers ────────────────────────────────────────────────────────── */

  function makeCover(theme, size, meta) {
    var W = size.w, H = size.h;
    var m = Math.round(W * 0.11);
    var d = design({
      kind: 'cover', name: 'Cover', w: W, h: H,
      bg: { type: 'solid', color: theme.bg }
    });
    var els = d.elements;
    var title = (meta.title || 'Untitled').trim();
    var subtitle = (meta.subtitle || '').trim();
    var author = (meta.author || '').trim();

    function authorLine(y, color) {
      return text({
        x: m, y: y, w: W - m * 2, text: author, family: theme.ui,
        size: Math.round(W * 0.032), weight: 600, uppercase: true,
        letterSpacing: Math.round(W * 0.006), color: color, align: 'center'
      });
    }

    if (theme.cover === 'stack') {
      els.push(rect({ x: W / 2 - W * 0.07, y: H * 0.255, w: W * 0.14, h: 3, fill: theme.accent }));
      var t1 = fit(text({
        x: m, y: 0, w: W - m * 2, text: title, family: theme.display,
        size: Math.round(W * 0.135), weight: 700, color: theme.ink,
        align: 'center', lineHeight: 1.08
      }), H * 0.34, 28);
      t1.y = Math.round(H * 0.32);
      els.push(t1);
      if (subtitle) {
        els.push(fit(text({
          x: m * 1.2, y: Math.round(t1.y + h(t1) + H * 0.035), w: W - m * 2.4,
          text: subtitle, family: theme.body, size: Math.round(W * 0.045),
          color: theme.muted, align: 'center', lineHeight: 1.4, italic: true
        }), H * 0.16, 14));
      }
      if (author) els.push(authorLine(H - m - Math.round(W * 0.05), theme.ink));

    } else if (theme.cover === 'band') {
      d.bg = { type: 'solid', color: theme.pageBg };
      els.push(rect({ x: 0, y: H * 0.30, w: W, h: H * 0.34, fill: theme.accent }));
      var t2 = fit(text({
        x: m, y: 0, w: W - m * 2, text: title, family: theme.display,
        size: Math.round(W * 0.125), weight: 400, color: '#ffffff',
        align: 'left', lineHeight: 1.05
      }), H * 0.24, 26);
      t2.y = Math.round(H * 0.30 + (H * 0.34 - h(t2)) / 2);
      els.push(t2);
      if (subtitle) {
        els.push(fit(text({
          x: m, y: Math.round(H * 0.68), w: W - m * 2, text: subtitle,
          family: theme.body, size: Math.round(W * 0.042), color: theme.ink,
          align: 'left', lineHeight: 1.4
        }), H * 0.14, 14));
      }
      if (author) {
        var a2 = authorLine(H - m - Math.round(W * 0.045), theme.ink);
        a2.align = 'left';
        els.push(a2);
      }

    } else if (theme.cover === 'bold') {
      els.push(rect({ x: 0, y: 0, w: W * 0.16, h: H, fill: theme.accent, opacity: 0.9 }));
      var t3 = fit(text({
        x: W * 0.24, y: 0, w: W - W * 0.24 - m * 0.6, text: title,
        family: theme.display, size: Math.round(W * 0.15), weight: 700,
        color: theme.ink, align: 'left', lineHeight: 1.0, letterSpacing: -1
      }), H * 0.42, 30);
      t3.y = Math.round(H * 0.20);
      els.push(t3);
      els.push(rect({ x: W * 0.24, y: Math.round(t3.y + h(t3) + H * 0.03), w: W * 0.18, h: 4, fill: theme.accent }));
      if (subtitle) {
        els.push(fit(text({
          x: W * 0.24, y: Math.round(t3.y + h(t3) + H * 0.075), w: W - W * 0.24 - m,
          text: subtitle, family: theme.body, size: Math.round(W * 0.038),
          color: theme.muted, align: 'left', lineHeight: 1.45
        }), H * 0.16, 13));
      }
      if (author) {
        var a3 = authorLine(H - m - Math.round(W * 0.04), theme.ink);
        a3.align = 'left';
        a3.x = W * 0.24;
        a3.w = W - W * 0.24 - m;
        els.push(a3);
      }

    } else if (theme.cover === 'minimal') {
      els.push(rect({
        x: m * 0.55, y: m * 0.55, w: W - m * 1.1, h: H - m * 1.1,
        fill: 'transparent', stroke: theme.accent, strokeWidth: 1.5
      }));
      var t4 = fit(text({
        x: m, y: 0, w: W - m * 2, text: title, family: theme.display,
        size: Math.round(W * 0.105), weight: 400, color: theme.ink,
        align: 'center', lineHeight: 1.18
      }), H * 0.3, 24);
      t4.y = Math.round(H * 0.36);
      els.push(t4);
      els.push(rect({ x: W / 2 - 18, y: Math.round(t4.y + h(t4) + H * 0.04), w: 36, h: 1, fill: theme.accent }));
      if (subtitle) {
        els.push(fit(text({
          x: m * 1.4, y: Math.round(t4.y + h(t4) + H * 0.075), w: W - m * 2.8,
          text: subtitle, family: theme.body, size: Math.round(W * 0.036),
          color: theme.muted, align: 'center', lineHeight: 1.5, italic: true
        }), H * 0.14, 13));
      }
      if (author) els.push(authorLine(H - m * 1.5, theme.ink));

    } else if (theme.cover === 'gradient') {
      d.bg = { type: 'gradient', from: theme.bg, to: theme.accent, angle: 150 };
      els.push(ellipse({
        x: W * 0.52, y: H * 0.06, w: W * 0.56, h: W * 0.56,
        fill: '#ffffff', opacity: 0.12
      }));
      var t5 = fit(text({
        x: m, y: 0, w: W - m * 2, text: title, family: theme.display,
        size: Math.round(W * 0.13), weight: 700, color: '#ffffff',
        align: 'left', lineHeight: 1.06
      }), H * 0.36, 28);
      t5.y = Math.round(H * 0.40);
      els.push(t5);
      if (subtitle) {
        els.push(fit(text({
          x: m, y: Math.round(t5.y + h(t5) + H * 0.035), w: W - m * 2,
          text: subtitle, family: theme.body, size: Math.round(W * 0.042),
          color: 'rgba(255,255,255,0.82)', align: 'left', lineHeight: 1.42
        }), H * 0.15, 14));
      }
      if (author) {
        var a5 = authorLine(H - m - Math.round(W * 0.045), '#ffffff');
        a5.align = 'left';
        els.push(a5);
      }

    } else { // poster
      d.bg = { type: 'solid', color: theme.bg };
      els.push(rect({ x: 0, y: 0, w: W, h: H * 0.055, fill: theme.accent }));
      els.push(rect({ x: 0, y: H - H * 0.055, w: W, h: H * 0.055, fill: theme.accent }));
      var t6 = fit(text({
        x: m * 0.8, y: 0, w: W - m * 1.6, text: title, family: theme.display,
        size: Math.round(W * 0.2), weight: 400, color: theme.ink,
        align: 'left', lineHeight: 0.92, uppercase: true
      }), H * 0.46, 34);
      t6.y = Math.round(H * 0.16);
      els.push(t6);
      if (subtitle) {
        els.push(fit(text({
          x: m * 0.8, y: Math.round(t6.y + h(t6) + H * 0.04), w: W - m * 1.6,
          text: subtitle, family: theme.body, size: Math.round(W * 0.04),
          color: theme.muted, align: 'left', lineHeight: 1.45
        }), H * 0.16, 13));
      }
      if (author) {
        var a6 = authorLine(H - H * 0.055 - Math.round(W * 0.09), theme.ink);
        a6.align = 'left';
        a6.x = m * 0.8;
        a6.w = W - m * 1.6;
        els.push(a6);
      }
    }

    return d;
  }

  /* ── chapter opener ────────────────────────────────────────────────── */

  function makeChapterOpener(theme, size, index, title) {
    var W = size.w, H = size.h;
    var m = Math.round(W * 0.13);
    var dark = theme.cover === 'stack' || theme.cover === 'bold' || theme.cover === 'gradient';
    var bg = dark ? theme.bg : theme.pageBg;
    var ink = dark ? theme.ink : theme.pageInk;

    var d = design({
      kind: 'chapter', name: 'Chapter ' + index + ' opener', w: W, h: H,
      bg: { type: 'solid', color: bg }
    });

    d.elements.push(text({
      x: m, y: Math.round(H * 0.30), w: W - m * 2,
      text: 'Chapter ' + index, family: theme.ui, size: Math.round(W * 0.03),
      weight: 600, uppercase: true, letterSpacing: Math.round(W * 0.007),
      color: theme.accent, align: 'left'
    }));

    var t = fit(text({
      x: m, y: Math.round(H * 0.365), w: W - m * 2, text: title,
      family: theme.display, size: Math.round(W * 0.095), weight: 700,
      color: ink, align: 'left', lineHeight: 1.12
    }), H * 0.28, 22);
    d.elements.push(t);

    d.elements.push(rect({
      x: m, y: Math.round(t.y + h(t) + H * 0.045), w: Math.round(W * 0.16), h: 3,
      fill: theme.accent
    }));

    return d;
  }

  /* ── quote card ────────────────────────────────────────────────────── */

  function makeQuoteCard(theme, quote, attribution, name) {
    var W = 1080, H = 1350;
    var m = 110;
    var d = design({
      kind: 'quote', name: name || 'Quote card', w: W, h: H,
      bg: { type: 'solid', color: theme.bg }
    });

    d.elements.push(text({
      x: m, y: 150, w: 200, text: '“', family: theme.display,
      size: 260, weight: 700, color: theme.accent, align: 'left', lineHeight: 1
    }));

    var q = fit(text({
      x: m, y: 400, w: W - m * 2, text: quote, family: theme.display,
      size: 62, weight: 400, color: theme.cover === 'band' || theme.cover === 'minimal' || theme.cover === 'poster' ? theme.ink : '#ffffff',
      align: 'left', lineHeight: 1.28
    }), 620, 26);
    d.elements.push(q);

    d.elements.push(rect({ x: m, y: 1120, w: 70, h: 3, fill: theme.accent }));
    d.elements.push(text({
      x: m, y: 1160, w: W - m * 2, text: attribution || '',
      family: theme.ui, size: 30, weight: 600, uppercase: true, letterSpacing: 3,
      color: theme.muted, align: 'left'
    }));

    return d;
  }

  /* ── social card ───────────────────────────────────────────────────── */

  function makeSocialCard(theme, meta) {
    var W = 1080, H = 1080;
    var m = 96;
    var light = theme.cover === 'band' || theme.cover === 'minimal' || theme.cover === 'poster';
    var d = design({
      kind: 'social', name: 'Social card', w: W, h: H,
      bg: { type: 'solid', color: light ? theme.pageBg : theme.bg }
    });
    var ink = light ? theme.ink : '#ffffff';

    d.elements.push(rect({ x: m, y: m, w: 84, h: 6, fill: theme.accent }));
    d.elements.push(text({
      x: m, y: m + 40, w: W - m * 2, text: 'Out now', family: theme.ui,
      size: 28, weight: 700, uppercase: true, letterSpacing: 5,
      color: theme.accent, align: 'left'
    }));

    var t = fit(text({
      x: m, y: 300, w: W - m * 2, text: meta.title || 'Untitled',
      family: theme.display, size: 110, weight: 700, color: ink,
      align: 'left', lineHeight: 1.06
    }), 400, 34);
    d.elements.push(t);

    if (meta.subtitle) {
      d.elements.push(fit(text({
        x: m, y: Math.round(t.y + h(t) + 34), w: W - m * 2, text: meta.subtitle,
        family: theme.body, size: 36, color: light ? theme.muted : 'rgba(255,255,255,.75)',
        align: 'left', lineHeight: 1.4
      }), 150, 18));
    }

    d.elements.push(text({
      x: m, y: H - m - 40, w: W - m * 2, text: meta.author || '',
      family: theme.ui, size: 30, weight: 600, uppercase: true, letterSpacing: 3,
      color: light ? theme.ink : '#ffffff', align: 'left'
    }));

    return d;
  }

  function makeBlank(theme, size) {
    return design({
      kind: 'custom', name: 'Blank', w: size.w, h: size.h,
      bg: { type: 'solid', color: theme.pageBg }
    });
  }

  /* ── the whole set, in one go ──────────────────────────────────────── */

  /* Pulls the longest quotable line out of a chapter so the quote cards say
     something worth reading rather than the first sentence in the file. */
  function pickQuote(chapter) {
    var quotes = chapter.blocks.filter(function (b) { return b.type === 'quote'; });
    if (quotes.length) return quotes[0].text;

    var best = '';
    chapter.blocks.forEach(function (b) {
      if (b.type !== 'p') return;
      b.text.split(/(?<=[.!?])\s+/).forEach(function (s) {
        var t = s.trim();
        if (t.length > best.length && t.length >= 60 && t.length <= 190) best = t;
      });
    });
    return best;
  }

  function buildAll(project) {
    var theme = themeById(project.themeId);
    var size = trimPx(project.trimId);
    var meta = { title: project.title, subtitle: project.subtitle, author: project.author };
    var designs = [makeCover(theme, size, meta)];

    project.chapters.forEach(function (ch, i) {
      designs.push(makeChapterOpener(theme, size, i + 1, ch.title));
    });

    var quoted = 0;
    for (var i = 0; i < project.chapters.length && quoted < 4; i++) {
      var q = pickQuote(project.chapters[i]);
      if (!q) continue;
      designs.push(makeQuoteCard(theme, q, project.author || project.title,
        'Quote - ' + project.chapters[i].title));
      quoted++;
    }

    designs.push(makeSocialCard(theme, meta));
    return designs;
  }

  global.Templates = {
    PPI: PPI,
    TRIMS: TRIMS,
    THEMES: THEMES,
    trimById: trimById,
    trimPx: trimPx,
    themeById: themeById,
    text: text,
    rect: rect,
    ellipse: ellipse,
    image: image,
    design: design,
    makeCover: makeCover,
    makeChapterOpener: makeChapterOpener,
    makeQuoteCard: makeQuoteCard,
    makeSocialCard: makeSocialCard,
    makeBlank: makeBlank,
    pickQuote: pickQuote,
    buildAll: buildAll
  };
})(window);
