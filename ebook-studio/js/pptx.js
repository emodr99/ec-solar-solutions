/* Reading a .pptx.
 *
 * A deck is a zip of XML parts wired together by relationship files. We follow
 * that wiring rather than guessing at filenames: presentation.xml gives the
 * slide order, each slide's .rels points at its notes, its layout and its
 * pictures. Everything comes back as plain objects for the course builder.
 */
(function (global) {
  'use strict';

  var MEDIA_TYPES = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml'
  };

  function xml(bytes) {
    var doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
    return doc.getElementsByTagName('parsererror').length ? null : doc;
  }

  function tags(node, name) {
    return Array.prototype.slice.call(node.getElementsByTagName(name));
  }

  /* Zip paths are absolute; relationship targets are relative to the part's
     own folder and love a leading "../". */
  function resolvePath(base, target) {
    if (target.charAt(0) === '/') return target.slice(1);
    var parts = base.split('/').slice(0, -1);
    target.split('/').forEach(function (piece) {
      if (piece === '..') parts.pop();
      else if (piece !== '.') parts.push(piece);
    });
    return parts.join('/');
  }

  function relsPathFor(partPath) {
    var bits = partPath.split('/');
    var file = bits.pop();
    return bits.concat('_rels', file + '.rels').join('/');
  }

  function readRels(files, partPath) {
    var doc = files[relsPathFor(partPath)] && xml(files[relsPathFor(partPath)]);
    var map = {};
    if (!doc) return map;
    tags(doc, 'Relationship').forEach(function (rel) {
      map[rel.getAttribute('Id')] = {
        type: (rel.getAttribute('Type') || '').split('/').pop(),
        target: rel.getAttribute('Target') || '',
        external: rel.getAttribute('TargetMode') === 'External'
      };
    });
    return map;
  }

  /* ── text ──────────────────────────────────────────────────────────── */

  /* One <a:p> is one paragraph: runs of text, an indent level, and whether
     any of it was bold, which is the best hint a deck gives about key terms. */
  function paragraph(p) {
    var text = '';
    var bold = [];

    Array.prototype.forEach.call(p.childNodes, function (child) {
      if (child.nodeType !== 1) return;
      var name = child.nodeName;
      if (name === 'a:br') { text += ' '; return; }
      if (name !== 'a:r' && name !== 'a:fld') return;

      var piece = tags(child, 'a:t').map(function (t) { return t.textContent; }).join('');
      if (!piece) return;
      var props = child.getElementsByTagName('a:rPr')[0];
      if (props && props.getAttribute('b') === '1' && piece.trim().length > 2) bold.push(piece.trim());
      text += piece;
    });

    var props = p.getElementsByTagName('a:pPr')[0];
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      level: props ? (parseInt(props.getAttribute('lvl'), 10) || 0) : 0,
      bold: bold
    };
  }

  function placeholderType(shape) {
    var ph = shape.getElementsByTagName('p:ph')[0];
    if (!ph) return '';
    return ph.getAttribute('type') || 'body';
  }

  function tableRows(frame) {
    return tags(frame, 'a:tr').map(function (row) {
      return tags(row, 'a:tc').map(function (cell) {
        return tags(cell, 'a:p').map(function (p) { return paragraph(p).text; })
          .filter(Boolean).join(' ');
      }).filter(Boolean).join(' — ');
    }).filter(Boolean);
  }

  /* ── one slide ─────────────────────────────────────────────────────── */

  function readSlide(doc, rels, files, slidePath) {
    var slide = { title: '', bullets: [], bold: [], images: [], tables: [], notes: '' };
    var tree = doc.getElementsByTagName('p:cSld')[0] || doc;

    tags(tree, 'p:sp').forEach(function (shape) {
      var body = shape.getElementsByTagName('p:txBody')[0];
      if (!body) return;

      var kind = placeholderType(shape);
      var paras = tags(body, 'a:p').map(paragraph).filter(function (p) { return p.text; });
      if (!paras.length) return;

      if ((kind === 'title' || kind === 'ctrTitle') && !slide.title) {
        slide.title = paras.map(function (p) { return p.text; }).join(' ');
        return;
      }
      if (kind === 'sldNum' || kind === 'ftr' || kind === 'dt') return;

      paras.forEach(function (p) {
        slide.bullets.push({ text: p.text, level: p.level });
        p.bold.forEach(function (b) { slide.bold.push(b); });
      });
    });

    /* A deck with no title placeholder still usually opens with a heading. */
    if (!slide.title && slide.bullets.length) {
      var first = slide.bullets[0];
      if (first.level === 0 && first.text.length <= 70) {
        slide.title = first.text;
        slide.bullets.shift();
      }
    }

    tags(tree, 'p:graphicFrame').forEach(function (frame) {
      var rows = tableRows(frame);
      if (rows.length) slide.tables.push(rows);
    });

    tags(tree, 'p:pic').forEach(function (pic) {
      var blip = pic.getElementsByTagName('a:blip')[0];
      if (!blip) return;
      var id = blip.getAttribute('r:embed') || blip.getAttribute('embed');
      var rel = rels[id];
      if (!rel || rel.external) return;
      var ext = rel.target.split('.').pop().toLowerCase();
      if (!MEDIA_TYPES[ext]) return;      // skip EMF/WMF, which browsers cannot show
      slide.images.push(resolvePath(slidePath, rel.target));
    });

    Object.keys(rels).forEach(function (id) {
      var rel = rels[id];
      if (rel.type !== 'notesSlide') return;
      var path = resolvePath(slidePath, rel.target);
      var notesDoc = files[path] && xml(files[path]);
      if (!notesDoc) return;
      var text = [];
      tags(notesDoc, 'p:sp').forEach(function (shape) {
        if (placeholderType(shape) === 'sldNum') return;
        tags(shape, 'a:p').forEach(function (p) {
          var line = paragraph(p).text;
          if (line) text.push(line);
        });
      });
      slide.notes = text.join(' ').replace(/^\d+\s*/, '').trim();
    });

    return slide;
  }

  /* ── the deck ──────────────────────────────────────────────────────── */

  async function parse(arrayBuffer) {
    if (!Zip.supported()) {
      throw new Error('This browser cannot unpack .pptx files. Try Chrome or Edge.');
    }

    /* Everything except the heavy media, which is fetched later and only if
       a slide actually references it. */
    var parts = await Zip.read(arrayBuffer, function (name) {
      return !/\.(png|jpe?g|gif|bmp|webp|svg|emf|wmf|tiff?|ico|mp4|mov|avi|wmv|mpg|mp3|wav|m4a|ttf|otf|fntdata|bin|thmx)$/i.test(name);
    });

    /* The package says where its own main part lives. Following that rather
       than assuming "ppt/presentation.xml" keeps decks exported by Keynote,
       Google Slides and the rest working. */
    var rootRels = readRels(parts, '');        // resolves to _rels/.rels
    var presPath = '';
    Object.keys(rootRels).forEach(function (id) {
      if (rootRels[id].type === 'officeDocument') presPath = resolvePath('', rootRels[id].target);
    });
    if (!presPath || !parts[presPath]) presPath = 'ppt/presentation.xml';

    var presentation = parts[presPath] && xml(parts[presPath]);
    if (!presentation) throw new Error('That file has no readable presentation part. If it is a Word document, rename it with a .docx extension and try again.');

    var presRels = readRels(parts, presPath);
    var order = tags(presentation, 'p:sldId').map(function (node) {
      var id = node.getAttribute('r:id') || node.getAttribute('id');
      var rel = presRels[id];
      return rel ? resolvePath(presPath, rel.target) : null;
    }).filter(Boolean);

    /* A deck with no slide list at all: fall back to whatever slide parts
       the package contains, in filename order. */
    if (!order.length) {
      order = Object.keys(parts).filter(function (name) {
        return /\/slides\/slide\d+\.xml$/.test(name);
      }).sort(function (a, b) {
        return (parseInt(a.match(/(\d+)\.xml$/)[1], 10) - parseInt(b.match(/(\d+)\.xml$/)[1], 10));
      });
    }

    if (!order.length) throw new Error('That .pptx appears to have no slides.');

    var slides = [];
    var wantedMedia = {};

    order.forEach(function (path, index) {
      var doc = parts[path] && xml(parts[path]);
      if (!doc) return;

      var rels = readRels(parts, path);
      var slide = readSlide(doc, rels, parts, path);
      slide.index = index;
      slide.hidden = doc.documentElement.getAttribute('show') === '0';

      /* Section-header layouts are how a deck says "new topic". */
      slide.section = false;
      Object.keys(rels).forEach(function (id) {
        if (rels[id].type !== 'slideLayout') return;
        var layoutPath = resolvePath(path, rels[id].target);
        var layout = parts[layoutPath] && xml(parts[layoutPath]);
        if (!layout) return;
        var type = layout.documentElement.getAttribute('type') || '';
        if (type === 'secHead' || type === 'titleOnly' && !slide.bullets.length) slide.section = true;
        slide.layout = type;
      });

      slide.images.forEach(function (m) { wantedMedia[m] = true; });
      if (slide.title || slide.bullets.length || slide.images.length || slide.tables.length) {
        slides.push(slide);
      }
    });

    if (!slides.length) throw new Error('No readable text or pictures were found in that deck.');

    /* Second pass, now that we know which pictures are actually used. */
    var media = {};
    var names = Object.keys(wantedMedia);
    if (names.length) {
      var blobs = await Zip.read(arrayBuffer, names);
      names.forEach(function (name) {
        if (!blobs[name]) return;
        var ext = name.split('.').pop().toLowerCase();
        media[name] = URL.createObjectURL(new Blob([blobs[name]], { type: MEDIA_TYPES[ext] || 'image/png' }));
      });
    }

    return { slides: slides.filter(function (s) { return !s.hidden; }), media: media };
  }

  /* Object URLs are cheap to hold but we store data URLs in the project, so
     the pictures survive a reload. */
  function toDataUrl(objectUrl) {
    return fetch(objectUrl).then(function (r) { return r.blob(); }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
  }

  global.Pptx = { parse: parse, toDataUrl: toDataUrl };
})(window);
