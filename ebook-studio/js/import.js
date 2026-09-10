/* Reading a manuscript.
 *
 * .docx, .md, .txt and .html all get flattened to the same list of nodes
 * (level, type, text, html) and then cut into chapters at whichever heading
 * level the document actually uses for chapters.
 */
(function (global) {
  'use strict';

  /* ── shared helpers ────────────────────────────────────────────────── */

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Inline markdown, applied after escaping so raw tags stay inert. */
  function inline(s) {
    return esc(s)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }

  function stripMd(s) {
    return s.replace(/\*\*\*|\*\*|\*|`|_/g, '').trim();
  }

  function node(level, type, text, html, items) {
    return { level: level, type: type, text: text || '', html: html || esc(text || ''), items: items || null };
  }

  function countWords(s) {
    var m = String(s).trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  /* ── markdown ──────────────────────────────────────────────────────── */

  function parseMarkdown(src) {
    var lines = src.replace(/\r\n?/g, '\n').split('\n');
    var nodes = [];
    var para = [];
    var list = null;
    var listType = null;
    var quote = [];
    var inFence = false;
    var fence = [];

    function flushPara() {
      if (!para.length) return;
      var raw = para.join(' ').trim();
      if (raw) nodes.push(node(0, 'p', stripMd(raw), inline(raw)));
      para = [];
    }
    function flushList() {
      if (!list || !list.length) { list = null; return; }
      nodes.push(node(0, listType, list.map(stripMd).join(' '), '', list.map(inline)));
      list = null;
    }
    function flushQuote() {
      if (!quote.length) return;
      var raw = quote.join(' ').trim();
      nodes.push(node(0, 'quote', stripMd(raw), inline(raw)));
      quote = [];
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (/^\s*```/.test(line)) {
        if (inFence) {
          nodes.push(node(0, 'code', fence.join('\n'), '<pre>' + esc(fence.join('\n')) + '</pre>'));
          fence = []; inFence = false;
        } else {
          flushAll(); inFence = true;
        }
        continue;
      }
      if (inFence) { fence.push(line); continue; }

      var head = line.match(/^(#{1,6})\s+(.*)$/);
      if (head) {
        flushAll();
        var lvl = Math.min(3, head[1].length);
        nodes.push(node(lvl, 'h', stripMd(head[2]), inline(head[2])));
        continue;
      }

      if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushAll(); nodes.push(node(0, 'hr', '')); continue; }

      var q = line.match(/^\s*>\s?(.*)$/);
      if (q) { flushPara(); flushList(); quote.push(q[1]); continue; }

      var li = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
      if (li) {
        flushPara(); flushQuote();
        var kind = /\d/.test(li[1]) ? 'ol' : 'ul';
        if (list && listType !== kind) flushList();
        listType = kind;
        list = list || [];
        list.push(li[2]);
        continue;
      }

      if (!line.trim()) { flushAll(); continue; }

      flushList(); flushQuote();
      para.push(line.trim());
    }
    flushAll();
    return nodes;
  }

  /* ── plain text ────────────────────────────────────────────────────── */

  /* No markup to lean on, so headings are inferred: short standalone lines
     that either say "Chapter N" or are written in capitals. */
  function parseText(src) {
    var blocks = src.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
    var nodes = [];

    blocks.forEach(function (raw) {
      var block = raw.trim();
      if (!block) return;
      var oneLine = block.indexOf('\n') === -1;
      var looksLikeChapter = /^(chapter|part|section|prologue|epilogue|introduction|conclusion|appendix)\b/i.test(block);
      var shouty = block.length < 70 && block === block.toUpperCase() && /[A-Z]/.test(block);

      if (oneLine && block.length < 90 && (looksLikeChapter || shouty)) {
        nodes.push(node(1, 'h', block.replace(/\s+/g, ' ')));
      } else {
        nodes.push(node(0, 'p', block.replace(/\s+/g, ' ')));
      }
    });
    return nodes;
  }

  /* ── html ──────────────────────────────────────────────────────────── */

  var INLINE_OK = { STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', CODE: 'code', BR: 'br' };

  function serializeInline(el) {
    var out = '';
    el.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { out += esc(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      var tag = INLINE_OK[n.tagName];
      if (tag === 'br') { out += '<br>'; return; }
      var inner = serializeInline(n);
      out += tag ? '<' + tag + '>' + inner + '</' + tag + '>' : inner;
    });
    return out;
  }

  function parseHtml(src) {
    var doc = new DOMParser().parseFromString(src, 'text/html');
    var nodes = [];

    function walk(parent) {
      Array.prototype.forEach.call(parent.children, function (el) {
        var tag = el.tagName;
        if (/^H[1-6]$/.test(tag)) {
          nodes.push(node(Math.min(3, +tag[1]), 'h', el.textContent.trim(), serializeInline(el)));
        } else if (tag === 'P') {
          var t = el.textContent.trim();
          if (t) nodes.push(node(0, 'p', t, serializeInline(el)));
        } else if (tag === 'BLOCKQUOTE') {
          nodes.push(node(0, 'quote', el.textContent.trim(), serializeInline(el)));
        } else if (tag === 'UL' || tag === 'OL') {
          var items = Array.prototype.map.call(el.querySelectorAll(':scope > li'), serializeInline);
          if (items.length) nodes.push(node(0, tag.toLowerCase(), el.textContent.trim(), '', items));
        } else if (tag === 'PRE') {
          nodes.push(node(0, 'code', el.textContent, '<pre>' + esc(el.textContent) + '</pre>'));
        } else if (tag === 'HR') {
          nodes.push(node(0, 'hr', ''));
        } else if (el.children.length) {
          walk(el);
        } else {
          var txt = el.textContent.trim();
          if (txt) nodes.push(node(0, 'p', txt, esc(txt)));
        }
      });
    }
    walk(doc.body);
    return nodes;
  }

  /* ── docx ──────────────────────────────────────────────────────────── */

  function docxParagraphText(p) {
    var out = '';
    var runs = p.getElementsByTagName('w:r');
    for (var i = 0; i < runs.length; i++) {
      var run = runs[i];
      var texts = run.getElementsByTagName('w:t');
      for (var j = 0; j < texts.length; j++) out += texts[j].textContent;
      if (run.getElementsByTagName('w:br').length) out += ' ';
      if (run.getElementsByTagName('w:tab').length) out += ' ';
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function docxParagraphHtml(p) {
    var out = '';
    var runs = p.getElementsByTagName('w:r');
    for (var i = 0; i < runs.length; i++) {
      var run = runs[i];
      var props = run.getElementsByTagName('w:rPr')[0];
      var bold = props && props.getElementsByTagName('w:b').length > 0;
      var ital = props && props.getElementsByTagName('w:i').length > 0;
      var piece = '';
      var texts = run.getElementsByTagName('w:t');
      for (var j = 0; j < texts.length; j++) piece += esc(texts[j].textContent);
      if (!piece) continue;
      if (ital) piece = '<em>' + piece + '</em>';
      if (bold) piece = '<strong>' + piece + '</strong>';
      out += piece;
    }
    return out.trim();
  }

  async function parseDocx(arrayBuffer) {
    if (!Zip.supported()) {
      throw new Error('This browser cannot unpack .docx files. Save your manuscript as .md, .txt or .html and try again.');
    }
    var files = await Zip.read(arrayBuffer, ['word/document.xml']);
    if (!files['word/document.xml']) throw new Error('That .docx has no document body we can read.');

    var xml = new TextDecoder().decode(files['word/document.xml']);
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('That .docx could not be parsed.');

    var body = doc.getElementsByTagName('w:body')[0];
    if (!body) throw new Error('That .docx has no document body we can read.');

    var nodes = [];
    var paras = body.getElementsByTagName('w:p');

    for (var i = 0; i < paras.length; i++) {
      var p = paras[i];
      var text = docxParagraphText(p);
      if (!text) continue;

      var styleEl = p.getElementsByTagName('w:pStyle')[0];
      var style = styleEl ? (styleEl.getAttribute('w:val') || '') : '';
      var norm = style.toLowerCase().replace(/[\s_-]/g, '');
      var html = docxParagraphHtml(p) || esc(text);
      var listed = p.getElementsByTagName('w:numPr').length > 0;

      var headMatch = norm.match(/^heading([1-6])$/);
      if (norm === 'title') {
        nodes.push(node(1, 'h', text, html));
      } else if (headMatch) {
        nodes.push(node(Math.min(3, +headMatch[1]), 'h', text, html));
      } else if (norm.indexOf('quote') !== -1) {
        nodes.push(node(0, 'quote', text, html));
      } else if (listed) {
        var prev = nodes[nodes.length - 1];
        if (prev && prev.type === 'ul') prev.items.push(html);
        else nodes.push(node(0, 'ul', text, '', [html]));
      } else {
        nodes.push(node(0, 'p', text, html));
      }
    }
    return nodes;
  }

  /* ── nodes -> chapters ─────────────────────────────────────────────── */

  function chapterLevel(nodes) {
    var counts = { 1: 0, 2: 0, 3: 0 };
    nodes.forEach(function (n) { if (n.type === 'h' && counts[n.level] !== undefined) counts[n.level]++; });
    if (counts[1] >= 2) return 1;
    if (counts[2] >= 2) return 2;
    if (counts[1] === 1 && counts[2] === 0) return 1;
    if (counts[2] === 1) return 2;
    if (counts[3] >= 2) return 3;
    return counts[1] ? 1 : 0;
  }

  function structure(nodes, fallbackTitle) {
    var level = chapterLevel(nodes);
    var chapters = [];
    var front = [];
    var bookTitle = '';
    var current = null;

    /* A lone level-1 heading followed by level-2 chapters is the book title. */
    var firstHead = nodes.filter(function (n) { return n.type === 'h'; })[0];
    if (level === 2 && firstHead && firstHead.level === 1) bookTitle = firstHead.text;

    nodes.forEach(function (n) {
      if (n.type === 'h' && n.level === level) {
        current = { id: Store.uid('ch'), title: n.text, blocks: [] };
        chapters.push(current);
        return;
      }
      if (n.type === 'h' && bookTitle && n.text === bookTitle && !current) return;

      var block = n.type === 'h'
        ? { type: n.level <= 2 ? 'h2' : 'h3', text: n.text, html: n.html }
        : { type: n.type, text: n.text, html: n.html, items: n.items };

      (current ? current.blocks : front).push(block);
    });

    /* Anything above the first chapter heading is real content too. */
    var frontWords = front.reduce(function (a, b) { return a + countWords(b.text); }, 0);
    if (frontWords > 40) {
      chapters.unshift({ id: Store.uid('ch'), title: 'Introduction', blocks: front });
    } else if (!bookTitle && front.length) {
      var firstP = front.filter(function (b) { return b.text; })[0];
      if (firstP && firstP.text.length < 90) bookTitle = firstP.text;
    }

    if (!chapters.length) {
      chapters.push({ id: Store.uid('ch'), title: fallbackTitle || 'Chapter 1', blocks: front });
    }

    return {
      title: bookTitle || fallbackTitle || 'Untitled ebook',
      chapters: chapters
    };
  }

  /* ── working out what a file actually is ───────────────────────────── */

  var OLE_MAGIC = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];

  function startsWith(bytes, signature) {
    for (var i = 0; i < signature.length; i++) if (bytes[i] !== signature[i]) return false;
    return true;
  }

  /* Extensions lie: decks get renamed, saved as .pptm, or arrive with no
     extension at all. The bytes do not lie, so they decide the routing and
     the extension is only a tie-breaker for plain text. */
  function sniff(arrayBuffer, filename) {
    var head = new Uint8Array(arrayBuffer, 0, Math.min(8, arrayBuffer.byteLength));
    var ext = String(filename || '').split('.').pop().toLowerCase();

    if (startsWith(head, OLE_MAGIC)) {
      return { kind: 'legacy-office', ext: ext };
    }

    if (head[0] === 0x50 && head[1] === 0x4B) {          // "PK" - a zip
      var list;
      try {
        list = Zip.names(arrayBuffer);
      } catch (err) {
        return { kind: 'unknown-zip', ext: ext };
      }
      var has = function (prefix) {
        return list.some(function (n) { return n.indexOf(prefix) === 0; });
      };
      if (has('ppt/')) return { kind: 'pptx', ext: ext };
      if (has('word/')) return { kind: 'docx', ext: ext };
      if (has('xl/')) return { kind: 'xlsx', ext: ext };
      if (has('OEBPS/') || list.indexOf('mimetype') !== -1) return { kind: 'epub', ext: ext };
      return { kind: 'unknown-zip', ext: ext };
    }

    if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
      return { kind: 'pdf', ext: ext };
    }

    if (ext === 'html' || ext === 'htm') return { kind: 'html', ext: ext };
    if (ext === 'md' || ext === 'markdown') return { kind: 'markdown', ext: ext };
    return { kind: 'text', ext: ext };
  }

  /* Plain-language reasons, with the fix, for the kinds we cannot open. */
  var REFUSALS = {
    'legacy-office': function (ext) {
      var name = ext === 'doc' ? 'Word' : 'PowerPoint';
      return 'This is an old-format ' + name + ' file, which browsers cannot read. ' +
        'Open it in ' + name + ' and use File › Save As, choosing ' +
        (ext === 'doc' ? '"Word Document (*.docx)"' : '"PowerPoint Presentation (*.pptx)"') +
        '. Google Slides and LibreOffice can also convert it for free.';
    },
    xlsx: function () { return 'That is a spreadsheet. Ebook Studio reads slide decks and documents, not workbooks.'; },
    pdf: function () { return 'PDFs are not supported. Export from the original program as .pptx or .docx instead.'; },
    epub: function () { return 'That is already an ebook. Upload the slides or document it came from.'; },
    'unknown-zip': function () { return 'That zip is not a PowerPoint or Word file. If it holds your deck, unzip it and upload the .pptx inside.'; }
  };

  function refusal(detected) {
    var make = REFUSALS[detected.kind];
    return make ? make(detected.ext) : null;
  }

  /* ── entry point ───────────────────────────────────────────────────── */

  function baseName(name) {
    return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  }

  function titleCase(s) {
    return s.replace(/\b([a-z])/g, function (m, c) { return c.toUpperCase(); });
  }

  async function readFile(file, buffer, detected) {
    var name = file.name || 'manuscript';
    var data = buffer || await file.arrayBuffer();
    var kind = (detected || sniff(data, name)).kind;
    var nodes;

    if (kind === 'docx') {
      nodes = await parseDocx(data);
    } else if (kind === 'markdown') {
      nodes = parseMarkdown(new TextDecoder().decode(data));
    } else if (kind === 'html') {
      nodes = parseHtml(new TextDecoder().decode(data));
    } else {
      nodes = parseText(new TextDecoder().decode(data));
    }

    if (!nodes.length) throw new Error('That file looks empty.');

    var result = structure(nodes, titleCase(baseName(name)));
    result.words = result.chapters.reduce(function (total, ch) {
      return total + ch.blocks.reduce(function (a, b) {
        return a + countWords(b.text) + (b.items ? b.items.reduce(function (x, i) { return x + countWords(i); }, 0) : 0);
      }, 0);
    }, 0);
    return result;
  }

  global.Importer = {
    readFile: readFile,
    sniff: sniff,
    refusal: refusal,
    parseMarkdown: parseMarkdown,
    parseText: parseText,
    parseHtml: parseHtml,
    structure: structure,
    countWords: countWords,
    escapeHtml: esc
  };
})(window);
