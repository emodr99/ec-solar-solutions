/* The book itself: on-screen preview, and the hidden sheet the printer uses.
 *
 * PDF comes out of the browser's own print engine. That means real font
 * rendering, real hyphenation and real page breaks, with no PDF library.
 */
(function (global) {
  'use strict';

  var artCache = {};

  function esc(s) { return Importer.escapeHtml(s); }

  function lines(count) {
    var out = '';
    for (var i = 0; i < (count || 3); i++) out += '<span></span>';
    return '<div class="rule-lines">' + out + '</div>';
  }

  /* ── activities ────────────────────────────────────────────────────── */

  function clozeHtml(activity) {
    return '<ol class="cloze">' + activity.items.map(function (item) {
      return '<li>' + esc(item.before) + '<span class="blank"></span>' + esc(item.after) + '</li>';
    }).join('') + '</ol>';
  }

  function matchHtml(activity) {
    var rows = Math.max(activity.terms.length, activity.meanings.length);
    var body = '';
    for (var i = 0; i < rows; i++) {
      body += '<tr><td class="mt-term">' + (activity.terms[i] ? (i + 1) + '. ' + esc(activity.terms[i]) : '') + '</td>' +
              '<td class="mt-def">' + (activity.meanings[i] ? String.fromCharCode(65 + i) + '. ' + esc(activity.meanings[i]) : '') + '</td></tr>';
    }
    return '<table class="match"><tbody>' + body + '</tbody></table>';
  }

  function boxListHtml(items, className) {
    return '<ul class="' + className + '">' + items.map(function (item) {
      return '<li><span class="box"></span>' + esc(item) + '</li>';
    }).join('') + '</ul>';
  }

  function crosswordHtml(activity) {
    var puzzle = activity.puzzle;
    var grid = '<table class="xword"><tbody>';

    for (var r = 0; r < puzzle.height; r++) {
      grid += '<tr>';
      for (var c = 0; c < puzzle.width; c++) {
        if (!puzzle.grid[r][c]) { grid += '<td class="x-void"></td>'; continue; }
        var number = puzzle.numbers[r + ',' + c];
        grid += '<td>' + (number ? '<i>' + number + '</i>' : '') + '</td>';
      }
      grid += '</tr>';
    }
    grid += '</tbody></table>';

    /* Crossword convention: a two-word answer is enumerated "(3,9)". */
    function enumeration(entry) {
      var parts = String(entry.term).split(/\s+/)
        .map(function (w) { return w.replace(/[^A-Za-z]/g, '').length; })
        .filter(Boolean);
      return parts.length > 1 ? parts.join(',') : String(entry.answer.length);
    }

    function clueList(across) {
      var items = puzzle.entries.filter(function (e) { return e.across === across; });
      if (!items.length) return '';
      return '<div class="clue-col"><h4>' + (across ? 'Across' : 'Down') + '</h4><ol>' +
        items.map(function (e) {
          return '<li><b>' + e.number + '.</b> ' + esc(e.clue) + ' <em>(' + enumeration(e) + ')</em></li>';
        }).join('') + '</ol></div>';
    }

    return grid + '<div class="clues">' + clueList(true) + clueList(false) + '</div>';
  }

  function wordsearchHtml(activity) {
    var puzzle = activity.puzzle;
    var grid = '<table class="wsearch"><tbody>';
    puzzle.grid.forEach(function (row) {
      grid += '<tr>' + row.map(function (letter) { return '<td>' + letter + '</td>'; }).join('') + '</tr>';
    });
    grid += '</tbody></table>';
    return grid + '<ul class="ws-words">' + puzzle.words.map(function (w) {
      return '<li>' + esc(w) + '</li>';
    }).join('') + '</ul>';
  }

  function activityHtml(activity) {
    var body = '';

    switch (activity.kind) {
      case 'cloze':      body = clozeHtml(activity); break;
      case 'match':      body = matchHtml(activity); break;
      case 'order':      body = boxListHtml(activity.items, 'order'); break;
      case 'checklist':  body = boxListHtml(activity.items, 'checklist'); break;
      case 'crossword':  body = crosswordHtml(activity); break;
      case 'wordsearch': body = wordsearchHtml(activity); break;
      case 'ask':
        body = '<ol class="ask">' + activity.items.map(function (item) {
          return '<li>' + esc(item.question) + lines(item.lines) + '</li>';
        }).join('') + '</ol>';
        break;
      default:
        body = lines(activity.lines);
    }

    return '<section class="activity act-' + activity.kind + '">' +
      '<h4 class="act-title">' + esc(activity.title) + '</h4>' +
      (activity.prompt ? '<p class="act-prompt">' + esc(activity.prompt) + '</p>' : '') +
      body + '</section>';
  }

  /* ── answer key ────────────────────────────────────────────────────── */

  function answerLines(activity) {
    if (activity.kind === 'cloze') {
      return activity.items.map(function (item, i) { return (i + 1) + '. ' + item.answer; });
    }
    if (activity.kind === 'order') {
      return activity.answer.map(function (text, i) { return (i + 1) + '. ' + text; });
    }
    if (activity.kind === 'match') {
      return activity.answer.map(function (pair) { return pair.term + ' — ' + pair.letter; });
    }
    if (activity.kind === 'crossword') {
      return activity.puzzle.entries.map(function (e) {
        return e.number + ' ' + (e.across ? 'across' : 'down') + ': ' + e.answer;
      });
    }
    if (activity.kind === 'wordsearch') {
      return [activity.puzzle.words.join(', ')];
    }
    return [];
  }

  function answersHtml(block) {
    return block.groups.map(function (group) {
      var items = group.activities.map(function (activity) {
        var found = answerLines(activity);
        if (!found.length) return '';
        return '<div class="answer-item"><h4>' + esc(activity.title) +
          (activity.source ? ' <span>— ' + esc(Learning.sentenceCase(activity.source)) + '</span>' : '') +
          '</h4><ul>' + found.map(function (line) {
            return '<li>' + esc(line) + '</li>';
          }).join('') + '</ul></div>';
      }).join('');
      return items ? '<div class="answer-group"><h3>' + esc(group.chapter) + '</h3>' + items + '</div>' : '';
    }).join('');
  }

  /* ── blocks to HTML ────────────────────────────────────────────────── */

  function blockHtml(block, ctx) {
    var figures = (ctx && ctx.figures) || {};
    var html = block.html || esc(block.text || '');

    switch (block.type) {
      case 'h2':
        return block.hidden
          ? '<h2 class="sr">' + esc(block.text) + '</h2>'
          : '<h2>' + html + '</h2>';
      case 'h3':    return '<h3>' + html + '</h3>';
      case 'quote': return '<blockquote><p>' + html + '</p></blockquote>';
      case 'hr':    return '<hr>';
      case 'code':  return block.html || ('<pre>' + esc(block.text) + '</pre>');

      case 'figure':
        var src = figures[block.designId];
        if (!src) return '';
        return '<figure class="fig"><img src="' + src + '" alt="' +
          esc(block.caption || 'Figure') + '"></figure>';

      case 'callout':
        return '<aside class="callout"><b>' + esc(block.label) + '</b>' +
          '<p>' + esc(block.text) + '</p></aside>';

      case 'objectives':
        return '<aside class="objectives"><b>' + esc(block.label) + '</b><ul>' +
          block.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></aside>';

      case 'glossary':
        return '<dl class="glossary">' + block.items.map(function (t) {
          return '<dt>' + esc(t.term) + '</dt><dd>' + esc(t.meaning) + '</dd>';
        }).join('') + '</dl>';

      case 'activity': return activityHtml(block.activity);
      case 'answers':  return answersHtml(block);

      case 'ul':
      case 'ol':
        var tag = block.type;
        return '<' + tag + '>' + (block.items || []).map(function (i) {
          return '<li>' + i + '</li>';
        }).join('') + '</' + tag + '>';

      default: return '<p>' + html + '</p>';
    }
  }

  function chapterHtml(chapter, index, includeHeading, ctx) {
    var out = includeHeading ? '<h1>' + esc(chapter.title) + '</h1>' : '';
    return out + chapter.blocks.map(function (block) {
      return blockHtml(block, ctx);
    }).join('\n');
  }

  /* ── typography ────────────────────────────────────────────────────── */

  /* Figures, callouts, activities and puzzles. Kept apart from the page
     typography because the EPUB needs these rules but sets its own type. */
  function componentCss(theme, forPrint) {
    var faint = Diagrams.mix(theme.pageInk, '#ffffff', 0.72);
    var pale = Diagrams.tint(theme.accent, 0.92);

    return [
      '.sr { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }',

      /* figures */
      '.fig { margin: 0 0 1.4em; text-align: center; break-inside: avoid; page-break-inside: avoid; }',
      '.fig img { max-width: 100%; ' + (forPrint ? 'max-height: 6.3in;' : 'max-height: 640px;') + ' width: auto; height: auto; display: block; margin: 0 auto; }',

      /* callouts */
      '.callout, .objectives { background: ' + pale + '; border-left: 4px solid ' + theme.accent + '; padding: .9em 1.1em; margin: 0 0 1.4em; break-inside: avoid; page-break-inside: avoid; }',
      '.callout b, .objectives b { display: block; font-family: ' + theme.ui + '; font-size: 8.5pt; letter-spacing: .1em; text-transform: uppercase; color: ' + theme.accent + '; margin-bottom: .35em; }',
      '.callout p { margin: 0; }',
      '.objectives ul { margin: 0 0 0 1.1em; }',

      /* activities */
      '.activity { border: 1.5px solid ' + Diagrams.tint(theme.accent, 0.55) + '; border-radius: 8px; padding: 1em 1.15em 1.15em; margin: 1.6em 0; break-inside: avoid; page-break-inside: avoid; }',
      '.act-title { font-family: ' + theme.ui + '; font-size: 9pt; letter-spacing: .1em; text-transform: uppercase; color: ' + theme.accent + '; margin: 0 0 .5em; }',
      '.act-prompt { margin: 0 0 .8em; font-size: .95em; }',
      '.rule-lines { margin-top: .5em; }',
      '.rule-lines span { display: block; border-bottom: 1px solid ' + Diagrams.mix(theme.pageInk, '#ffffff', 0.78) + '; height: 1.55em; }',
      '.blank { display: inline-block; min-width: 5.5em; border-bottom: 1.5px solid ' + theme.accent + '; margin: 0 .25em; }',
      '.cloze, .ask { margin: 0 0 0 1.2em; padding: 0; }',
      '.cloze li, .ask li { margin: 0 0 .7em; }',
      '.order, .checklist { list-style: none; margin: 0; padding: 0; }',
      '.order li, .checklist li { margin: 0 0 .5em; }',
      '.box { display: inline-block; width: 1.05em; height: 1.05em; border: 1.5px solid ' + theme.accent + '; border-radius: 3px; margin-right: .6em; vertical-align: -.15em; }',
      '.match { width: 100%; border-collapse: collapse; }',
      '.match td { vertical-align: top; padding: .35em .6em .35em 0; font-size: .95em; }',
      '.match .mt-term { width: 38%; font-weight: 600; }',

      /* puzzles */
      '.xword { border-collapse: collapse; margin: .4em auto 1em; }',
      '.xword td { width: 1.55em; height: 1.55em; border: 1px solid ' + theme.pageInk + '; position: relative; }',
      '.xword td.x-void { border: 0; background: none; }',
      '.xword i { position: absolute; top: 0; left: 1px; font-size: 6.5pt; font-style: normal; line-height: 1; }',
      '.clues { display: flex; gap: 1.6em; font-size: .86em; }',
      '.clue-col { flex: 1; }',
      '.clue-col h4 { font-family: ' + theme.ui + '; font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: ' + theme.accent + '; margin: 0 0 .3em; }',
      '.clue-col ol { list-style: none; margin: 0; padding: 0; }',
      '.clue-col li { margin: 0 0 .3em; }',
      '.wsearch { border-collapse: collapse; margin: .4em auto .9em; font-family: ui-monospace, Consolas, monospace; }',
      '.wsearch td { width: 1.45em; height: 1.45em; text-align: center; font-size: .82em; }',
      '.ws-words { list-style: none; display: flex; flex-wrap: wrap; gap: .5em 1.2em; margin: 0; padding: 0; font-size: .84em; letter-spacing: .04em; }',

      /* glossary and answers */
      '.glossary { margin: 0 0 1.2em; }',
      '.glossary dt { font-weight: 700; margin-top: .7em; }',
      '.glossary dd { margin: 0; color: ' + faint + '; }',
      '.answer-group { margin: 0 0 1.4em; break-inside: avoid; }',
      '.answer-group h3 { margin-top: 0; }',
      '.answer-item { margin: 0 0 .9em; }',
      '.answer-item h4 { font-family: ' + theme.ui + '; font-size: .92em; margin: 0 0 .2em; }',
      '.answer-item h4 span { color: ' + faint + '; font-weight: 400; }',
      '.answer-item ul { margin: 0 0 0 1.2em; font-size: .92em; }'
    ].join('\n');
  }

  function bookCss(theme, forPrint) {
    return [
      '.p-body { font-family: ' + theme.body + '; color: ' + theme.pageInk + '; font-size: 11.5pt; line-height: 1.62; }',
      '.p-body h1 { font-family: ' + theme.display + '; font-size: 26pt; line-height: 1.15; margin: 0 0 1.2em; font-weight: 700; }',
      '.p-body h2 { font-family: ' + theme.display + '; font-size: 15pt; margin: 1.8em 0 .6em; font-weight: 700; }',
      '.p-body h3 { font-family: ' + theme.ui + '; font-size: 11pt; letter-spacing: .06em; text-transform: uppercase; margin: 1.6em 0 .5em; color: ' + theme.accent + '; }',
      '.p-body p { margin: 0 0 .85em; }',
      '.p-body blockquote { margin: 1.5em 0; padding-left: 1em; border-left: 3px solid ' + theme.accent + '; font-style: italic; }',
      '.p-body blockquote p { margin: 0; }',
      '.p-body ul, .p-body ol { margin: 0 0 1em 1.3em; padding: 0; }',
      '.p-body li { margin: 0 0 .35em; }',
      '.p-body hr { border: 0; border-top: 1px solid ' + theme.accent + '; width: 30%; margin: 2em auto; }',
      '.p-body pre { font-family: ui-monospace, Consolas, monospace; font-size: 9.5pt; background: rgba(0,0,0,.04); padding: .8em; white-space: pre-wrap; }',
      componentCss(theme, forPrint),
      forPrint ? '.p-body h1 { break-before: avoid; }' : ''
    ].join('\n');
  }

  /* ── artwork ───────────────────────────────────────────────────────── */

  function designsOfKind(kind) {
    return Store.project.designs.filter(function (d) { return d.kind === kind; });
  }

  async function artUrl(designObj, scale) {
    if (!designObj) return null;
    var key = designObj.id + '@' + scale + ':' + JSON.stringify(designObj).length;
    if (!artCache[key]) artCache[key] = await Render.toDataUrl(designObj, scale);
    return artCache[key];
  }

  function clearArtCache() { artCache = {}; }

  /* Renders every figure a chapter refers to, once, and hands back a lookup
     the HTML builders can use synchronously. */
  async function resolveFigures(width) {
    var map = {};
    var chapters = Store.project.chapters || [];

    for (var i = 0; i < chapters.length; i++) {
      var blocks = chapters[i].blocks || [];
      for (var j = 0; j < blocks.length; j++) {
        var block = blocks[j];
        if (block.type !== 'figure' || map[block.designId]) continue;
        var design = Store.designById(block.designId);
        if (!design) continue;
        map[block.designId] = await artUrl(design, Math.min(2, (width || 1000) / design.w));
      }
    }
    return map;
  }

  /* ── on-screen preview ─────────────────────────────────────────────── */

  async function render() {
    var scroll = document.getElementById('bookScroll');
    var toc = document.getElementById('bookToc');
    var project = Store.project;
    var theme = Templates.themeById(project.themeId);

    toc.innerHTML = '';
    scroll.innerHTML = '';

    if (!project.chapters.length) {
      scroll.innerHTML = '<div class="page"><p class="hint">No manuscript loaded yet. Upload one from the dashboard and the book will appear here.</p></div>';
      return;
    }

    var style = document.getElementById('bookPreviewCss') || document.createElement('style');
    style.id = 'bookPreviewCss';
    style.textContent = bookCss(theme, false);
    document.head.appendChild(style);

    var figures = await resolveFigures(1000);
    var ctx = { figures: figures };

    var cover = designsOfKind('cover')[0];
    if (cover) {
      var page = document.createElement('div');
      page.className = 'page page-art';
      var img = document.createElement('img');
      img.alt = 'Cover';
      img.src = await artUrl(cover, 720 / cover.w);
      page.appendChild(img);
      scroll.appendChild(page);
    }

    var openers = designsOfKind('chapter');

    for (var i = 0; i < project.chapters.length; i++) {
      var chapter = project.chapters[i];

      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.textContent = (i + 1) + '. ' + chapter.title;
      btn.dataset.jump = 'ch-' + i;
      li.appendChild(btn);
      toc.appendChild(li);

      if (openers[i]) {
        var artPage = document.createElement('div');
        artPage.className = 'page page-art';
        artPage.id = 'ch-' + i;
        var artImg = document.createElement('img');
        artImg.alt = chapter.title;
        artImg.src = await artUrl(openers[i], 720 / openers[i].w);
        artPage.appendChild(artImg);
        scroll.appendChild(artPage);
      }

      var body = document.createElement('div');
      body.className = 'page p-body';
      if (!openers[i]) body.id = 'ch-' + i;
      body.innerHTML = chapterHtml(chapter, i, !openers[i], ctx);
      scroll.appendChild(body);
    }

    toc.addEventListener('click', function (evt) {
      var b = evt.target.closest('button');
      if (!b) return;
      var target = document.getElementById(b.dataset.jump);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ── print sheet ───────────────────────────────────────────────────── */

  async function buildPrintSheet() {
    var project = Store.project;
    var theme = Templates.themeById(project.themeId);
    var trim = Templates.trimById(project.trimId);
    var root = document.getElementById('printRoot');
    root.innerHTML = '';

    var style = document.getElementById('printCss') || document.createElement('style');
    style.id = 'printCss';
    style.media = 'print';
    style.textContent = [
      '@page { size: ' + trim.win + 'in ' + trim.hin + 'in; margin: 0.72in 0.66in 0.8in; }',
      '@page fullbleed { size: ' + trim.win + 'in ' + trim.hin + 'in; margin: 0; }',
      '.p-art { page: fullbleed; width: ' + trim.win + 'in; height: ' + trim.hin + 'in; }',
      bookCss(theme, true)
    ].join('\n');
    document.head.appendChild(style);

    var scale = Math.min(2, 1500 / (trim.win * Templates.PPI));
    var figures = await resolveFigures(1500);
    var ctx = { figures: figures };

    async function artPage(designObj) {
      if (!designObj) return;
      var div = document.createElement('div');
      div.className = 'p-page p-art';
      var img = document.createElement('img');
      img.src = await artUrl(designObj, scale);
      img.alt = '';
      div.appendChild(img);
      root.appendChild(div);
    }

    await artPage(designsOfKind('cover')[0]);

    var titlePage = document.createElement('div');
    titlePage.className = 'p-page p-body';
    titlePage.style.textAlign = 'center';
    titlePage.style.paddingTop = '2.2in';
    titlePage.innerHTML =
      '<h1 style="margin-bottom:.4em">' + esc(project.title) + '</h1>' +
      (project.subtitle ? '<p style="font-style:italic">' + esc(project.subtitle) + '</p>' : '') +
      (project.author ? '<p style="margin-top:2em;letter-spacing:.14em;text-transform:uppercase;font-size:9.5pt">' + esc(project.author) + '</p>' : '');
    root.appendChild(titlePage);

    var contents = document.createElement('div');
    contents.className = 'p-page p-body';
    contents.innerHTML = '<h1>Contents</h1><ol>' + project.chapters.map(function (c) {
      return '<li>' + esc(c.title) + '</li>';
    }).join('') + '</ol>';
    root.appendChild(contents);

    var openers = designsOfKind('chapter');

    for (var i = 0; i < project.chapters.length; i++) {
      await artPage(openers[i]);
      var body = document.createElement('div');
      body.className = 'p-page p-body';
      body.innerHTML = chapterHtml(project.chapters[i], i, !openers[i], ctx);
      root.appendChild(body);
    }
  }

  async function print() {
    App.toast('Preparing pages…');
    await buildPrintSheet();
    await new Promise(function (r) { setTimeout(r, 250); });
    window.print();
  }

  global.Book = {
    render: render,
    print: print,
    buildPrintSheet: buildPrintSheet,
    blockHtml: blockHtml,
    chapterHtml: chapterHtml,
    bookCss: bookCss,
    componentCss: componentCss,
    designsOfKind: designsOfKind,
    artUrl: artUrl,
    resolveFigures: resolveFigures,
    clearArtCache: clearArtCache,
    answerLines: answerLines
  };
})(window);
