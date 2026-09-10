/* Everything that leaves the browser: EPUB, a self-contained web page,
   a zip of PNGs, and the project file. */
(function (global) {
  'use strict';

  function slug(s) {
    return String(s || 'ebook').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'ebook';
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function dataUrlToBytes(dataUrl) {
    var base64 = dataUrl.split(',')[1];
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function esc(s) { return Importer.escapeHtml(s); }

  /* XHTML is stricter than HTML: void elements have to close themselves. */
  function xhtml(html) {
    return String(html)
      .replace(/<(br|hr|img|col|input|source)\b([^>]*?)\s*\/?>/gi, function (all, tag, attrs) {
        return '<' + tag + attrs + '/>';
      })
      .replace(/&nbsp;/g, '&#160;');
  }

  /* ── EPUB ──────────────────────────────────────────────────────────── */

  async function buildEpub(onProgress) {
    var project = Store.project;
    var theme = Templates.themeById(project.themeId);
    var bookId = 'urn:uuid:' + project.id + '-' + Date.now();
    var files = [{ name: 'mimetype', data: 'application/epub+zip', store: true }];

    files.push({
      name: 'META-INF/container.xml',
      data: '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
        '</container>'
    });

    files.push({
      name: 'OEBPS/style.css',
      data: [
        'body { font-family: Georgia, serif; line-height: 1.6; margin: 5%; color: #1a1a1a; }',
        'h1 { font-size: 1.8em; line-height: 1.2; margin: 0 0 1em; }',
        'h2 { font-size: 1.25em; margin: 1.8em 0 .5em; }',
        'h3 { font-size: .95em; text-transform: uppercase; letter-spacing: .06em; color: ' + theme.accent + '; margin: 1.6em 0 .4em; }',
        'p { margin: 0 0 .8em; text-indent: 0; }',
        'blockquote { margin: 1.4em 0; padding-left: 1em; border-left: 3px solid ' + theme.accent + '; font-style: italic; }',
        'hr { border: 0; border-top: 1px solid #bbb; width: 30%; margin: 2em auto; }',
        'pre { white-space: pre-wrap; font-size: .85em; background: #f2f2f2; padding: .7em; }',
        'img.full { width: 100%; height: auto; display: block; }',
        '.artpage { margin: 0; padding: 0; text-align: center; }',
        Book.componentCss(theme, false),
        /* Reading systems size images themselves; a pixel cap fights them. */
        '.fig img { max-height: none; }',
        '.clues { display: block; }'
      ].join('\n')
    });

    var manifest = [];
    var spine = [];
    var navItems = [];

    /* Figures become their own image files, referenced by relative path. */
    var figureSrc = {};
    var figureIds = [];
    project.chapters.forEach(function (chapter) {
      (chapter.blocks || []).forEach(function (block) {
        if (block.type === 'figure' && figureIds.indexOf(block.designId) === -1) {
          figureIds.push(block.designId);
        }
      });
    });

    for (var f = 0; f < figureIds.length; f++) {
      var figure = Store.designById(figureIds[f]);
      if (!figure) continue;
      var figName = 'images/fig' + (f + 1) + '.png';
      files.push({
        name: 'OEBPS/' + figName,
        data: dataUrlToBytes(await Render.toDataUrl(figure, Math.min(1.4, 1200 / figure.w)))
      });
      manifest.push('<item id="fig' + (f + 1) + '" href="' + figName + '" media-type="image/png"/>');
      figureSrc[figureIds[f]] = figName;
    }
    var ctx = { figures: figureSrc };

    /* cover */
    var coverDesign = Book.designsOfKind('cover')[0];
    var coverId = null;
    if (coverDesign) {
      var coverPng = dataUrlToBytes(await Render.toDataUrl(coverDesign, 1400 / coverDesign.w));
      files.push({ name: 'OEBPS/images/cover.png', data: coverPng });
      manifest.push('<item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>');
      files.push({
        name: 'OEBPS/cover.xhtml',
        data: xhtmlDoc('Cover', '<div class="artpage"><img class="full" src="images/cover.png" alt="Cover"/></div>')
      });
      manifest.push('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
      spine.push('<itemref idref="cover" linear="yes"/>');
      coverId = 'cover';
    }

    /* chapters */
    var openers = Book.designsOfKind('chapter');

    for (var i = 0; i < project.chapters.length; i++) {
      var chapter = project.chapters[i];
      var id = 'chap' + (i + 1);
      var art = '';

      if (openers[i]) {
        var name = 'images/' + id + '.png';
        files.push({
          name: 'OEBPS/' + name,
          data: dataUrlToBytes(await Render.toDataUrl(openers[i], 1000 / openers[i].w))
        });
        manifest.push('<item id="' + id + '-img" href="' + name + '" media-type="image/png"/>');
        // The opener art carries the title visually; the hidden heading keeps
        // it navigable for readers with images off and for screen readers.
        art = '<div class="artpage"><img class="full" src="' + name + '" alt="' + esc(chapter.title) + '"/></div>' +
              '<h1 class="sr">' + esc(chapter.title) + '</h1>';
      }

      var body = art + xhtml(Book.chapterHtml(chapter, i, !openers[i], ctx));
      files.push({ name: 'OEBPS/' + id + '.xhtml', data: xhtmlDoc(chapter.title, body) });
      manifest.push('<item id="' + id + '" href="' + id + '.xhtml" media-type="application/xhtml+xml"/>');
      spine.push('<itemref idref="' + id + '"/>');
      navItems.push('<li><a href="' + id + '.xhtml">' + esc(chapter.title) + '</a></li>');

      if (onProgress) onProgress(i + 1, project.chapters.length);
    }

    files.push({
      name: 'OEBPS/nav.xhtml',
      data: xhtmlDoc('Contents',
        '<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>' + navItems.join('') + '</ol></nav>', true)
    });
    manifest.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
    manifest.push('<item id="css" href="style.css" media-type="text/css"/>');

    var opf = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
        '<dc:identifier id="book-id">' + esc(bookId) + '</dc:identifier>' +
        '<dc:title>' + esc(project.title) + '</dc:title>' +
        '<dc:language>en</dc:language>' +
        (project.author ? '<dc:creator>' + esc(project.author) + '</dc:creator>' : '') +
        (project.subtitle ? '<dc:description>' + esc(project.subtitle) + '</dc:description>' : '') +
        '<meta property="dcterms:modified">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</meta>' +
        (coverId ? '<meta name="cover" content="cover-image"/>' : '') +
      '</metadata>' +
      '<manifest>' + manifest.join('') + '</manifest>' +
      '<spine>' + spine.join('') + '</spine>' +
      '</package>';

    files.push({ name: 'OEBPS/content.opf', data: opf });

    return Zip.write(files);
  }

  function xhtmlDoc(title, body, withEpubNs) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml"' +
      (withEpubNs ? ' xmlns:epub="http://www.idpf.org/2007/ops"' : '') + ' lang="en">' +
      '<head><meta charset="utf-8"/><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" type="text/css" href="style.css"/></head>' +
      '<body>' + body + '</body></html>';
  }

  /* ── single-file web page ──────────────────────────────────────────── */

  async function buildHtml() {
    var project = Store.project;
    var theme = Templates.themeById(project.themeId);
    var parts = [];

    var cover = Book.designsOfKind('cover')[0];
    if (cover) {
      parts.push('<figure class="art"><img src="' + await Render.toDataUrl(cover, 1200 / cover.w) + '" alt="Cover"></figure>');
    }

    parts.push('<nav class="toc"><h2>Contents</h2><ol>' + project.chapters.map(function (c, i) {
      return '<li><a href="#ch' + i + '">' + esc(c.title) + '</a></li>';
    }).join('') + '</ol></nav>');

    var openers = Book.designsOfKind('chapter');
    var ctx = { figures: await Book.resolveFigures(1100) };

    for (var i = 0; i < project.chapters.length; i++) {
      var art = openers[i]
        ? '<figure class="art"><img src="' + await Render.toDataUrl(openers[i], 1000 / openers[i].w) + '" alt=""></figure>'
        : '';
      parts.push('<section id="ch' + i + '">' + art +
        Book.chapterHtml(project.chapters[i], i, !openers[i], ctx) + '</section>');
    }

    var css = [
      ':root { color-scheme: light dark; }',
      'body { margin: 0; background: #f1f2f5; color: ' + theme.pageInk + '; font-family: ' + theme.body + ', Georgia, serif; }',
      'main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem 6rem; }',
      'section, .toc { background: ' + theme.pageBg + '; padding: 2.5rem 3rem; margin: 0 0 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); line-height: 1.65; }',
      'h1 { font-family: ' + theme.display + '; font-size: 2rem; line-height: 1.15; margin: 0 0 1.2rem; }',
      'h2 { font-family: ' + theme.display + '; margin: 2rem 0 .6rem; }',
      'h3 { font-family: ' + theme.ui + '; text-transform: uppercase; letter-spacing: .07em; font-size: .8rem; color: ' + theme.accent + '; }',
      'p { margin: 0 0 .9em; }',
      'blockquote { margin: 1.5em 0; padding-left: 1em; border-left: 3px solid ' + theme.accent + '; font-style: italic; }',
      'pre { white-space: pre-wrap; background: rgba(0,0,0,.05); padding: .8em; font-size: .9em; }',
      '.art { margin: 0 0 2rem; }',
      '.art img { width: 100%; display: block; box-shadow: 0 1px 3px rgba(0,0,0,.1); }',
      'section .art { margin: -2.5rem -3rem 2rem; }',
      '.toc ol { padding-left: 1.2rem; }',
      '.toc a { color: inherit; }',
      Book.componentCss(theme, false),
      '.fig img { max-height: none; }',
      '@media (max-width: 640px) { section, .toc { padding: 1.6rem 1.3rem; } section .art { margin: -1.6rem -1.3rem 1.4rem; } .clues { display: block; } }'
    ].join('\n');

    var html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + esc(project.title) + '</title>' +
      (project.author ? '<meta name="author" content="' + esc(project.author) + '">' : '') +
      '<style>' + css + '</style></head><body><main>' + parts.join('\n') + '</main></body></html>';

    return new Blob([html], { type: 'text/html' });
  }

  /* ── graphics zip ──────────────────────────────────────────────────── */

  async function buildImagesZip(onProgress) {
    var designs = Store.project.designs;
    var files = [];
    var used = {};

    for (var i = 0; i < designs.length; i++) {
      var d = designs[i];
      var base = slug(d.name) || ('design-' + (i + 1));
      used[base] = (used[base] || 0) + 1;
      var name = String(i + 1).padStart(2, '0') + '-' + base + (used[base] > 1 ? '-' + used[base] : '') + '.png';
      files.push({ name: name, data: dataUrlToBytes(await Render.toDataUrl(d, 2)) });
      if (onProgress) onProgress(i + 1, designs.length);
    }
    return Zip.write(files);
  }

  /* ── project file ──────────────────────────────────────────────────── */

  function buildProjectFile() {
    return new Blob([JSON.stringify(Store.project, null, 2)], { type: 'application/json' });
  }

  function loadProjectFile(file) {
    return file.text().then(function (txt) {
      var data = JSON.parse(txt);
      if (!data || !data.version) throw new Error('That is not an Ebook Studio project file.');
      Store.replaceProject(data);
      return data;
    });
  }

  global.Exporter = {
    slug: slug,
    download: download,
    buildEpub: buildEpub,
    buildHtml: buildHtml,
    buildImagesZip: buildImagesZip,
    buildProjectFile: buildProjectFile,
    loadProjectFile: loadProjectFile,
    dataUrlToBytes: dataUrlToBytes
  };
})(window);
