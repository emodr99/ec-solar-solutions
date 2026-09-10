/* Wiring: views, the dashboard, the import-and-build flow, exports. */
(function (global) {
  'use strict';

  var toastTimer = null;

  function $(id) { return document.getElementById(id); }

  function toast(message, ms) {
    var node = $('toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.hidden = true; }, ms || 2600);
  }

  /* ── views ─────────────────────────────────────────────────────────── */

  var currentView = 'dashboard';

  function showView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + name);
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.view === name);
    });

    if (name === 'editor') {
      Editor.refresh();
      Editor.fitZoom();
    } else if (name === 'book') {
      Book.render();
    } else {
      renderDashboard();
    }
  }

  /* ── dashboard ─────────────────────────────────────────────────────── */

  function renderStats() {
    var project = Store.project;
    var words = 0;
    var activities = 0;
    var figures = 0;

    project.chapters.forEach(function (chapter) {
      chapter.blocks.forEach(function (block) {
        if (block.type === 'activity') { activities++; return; }
        if (block.type === 'figure') { figures++; return; }
        words += Importer.countWords(block.text || '');
        (block.items || []).forEach(function (item) {
          words += Importer.countWords(typeof item === 'string' ? item : (item.term || ''));
        });
      });
    });

    var stats = project.source === 'pptx'
      ? [
          ['Lessons', project.deck ? project.deck.slides.length : 0],
          ['Parts', project.chapters.length],
          ['Diagrams', figures],
          ['Things to do', activities],
          ['Graphics', project.designs.length]
        ]
      : [
          ['Chapters', project.chapters.length],
          ['Words', words.toLocaleString()],
          ['Reading time', Math.max(1, Math.round(words / 230)) + ' min'],
          ['Graphics', project.designs.length]
        ];

    $('importStats').innerHTML = stats.map(function (s) {
      return '<div class="stat"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>';
    }).join('');
  }

  /* ── learning options ──────────────────────────────────────────────── */

  var ACTIVITY_KINDS = [
    { key: 'cloze',   label: 'Fill the gap' },
    { key: 'ask',     label: 'Check yourself' },
    { key: 'recall',  label: 'Cover and recall' },
    { key: 'apply',   label: 'Make it yours' },
    { key: 'match',   label: 'Matching' },
    { key: 'order',   label: 'Put in order' },
    { key: 'puzzles', label: 'Crossword & word search' }
  ];

  function learningOptions() {
    var stored = Store.project.learning || {};
    return Course.options({
      density: stored.density,
      lessonsPerChapter: stored.lessonsPerChapter,
      types: stored.types
    });
  }

  function saveLearning(patch) {
    Store.project.learning = Object.assign(learningOptions(), patch);
    Store.save();
  }

  function renderLearning() {
    var opts = learningOptions();
    $('densitySelect').value = opts.density;
    $('groupSelect').value = String(opts.lessonsPerChapter);

    var row = $('activityChips');
    row.innerHTML = '';

    ACTIVITY_KINDS.forEach(function (kind) {
      var on = opts.types[kind.key] !== false;
      var chip = document.createElement('button');
      chip.className = 'chip' + (on ? ' is-on' : '');
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(on));
      chip.innerHTML = '<span class="tick">&#10003;</span>' + kind.label;
      chip.addEventListener('click', function () {
        var types = Object.assign({}, learningOptions().types);
        types[kind.key] = !(types[kind.key] !== false);
        saveLearning({ types: types });
        renderLearning();
      });
      row.appendChild(chip);
    });
  }

  function renderChapterList() {
    var list = $('chapterList');
    list.innerHTML = '';

    Store.project.chapters.forEach(function (chapter, i) {
      var row = document.createElement('div');
      row.className = 'chapter-row';

      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = i + 1;

      var input = document.createElement('input');
      input.value = chapter.title;
      input.addEventListener('change', function () {
        chapter.title = input.value.trim() || ('Chapter ' + (i + 1));
        Store.save();
      });

      var words = document.createElement('span');
      words.className = 'words';
      var count = chapter.blocks.reduce(function (a, b) {
        return a + Importer.countWords(b.text || '');
      }, 0);
      words.textContent = count.toLocaleString() + ' words';

      row.append(num, input, words);
      list.appendChild(row);
    });
  }

  async function renderThemeGrid() {
    var grid = $('themeGrid');
    grid.innerHTML = '';

    Templates.THEMES.forEach(function (theme) {
      var card = document.createElement('button');
      card.className = 'theme-card' + (theme.id === Store.project.themeId ? ' is-active' : '');
      card.innerHTML =
        '<div class="theme-swatch" style="background:' + theme.bg + ';color:' + theme.ink + ';font-family:' + theme.display + '">' +
          '<b>' + theme.name + '</b>' +
        '</div>' +
        '<div class="theme-meta"><strong>' + theme.name + '</strong><span>' + theme.mood + '</span></div>';
      card.addEventListener('click', function () {
        Store.project.themeId = theme.id;
        Store.save();
        renderThemeGrid();
      });
      grid.appendChild(card);
    });
  }

  async function renderDesignGrid() {
    var grid = $('designGrid');
    grid.innerHTML = '';

    for (var i = 0; i < Store.project.designs.length; i++) {
      var design = Store.project.designs[i];
      var card = document.createElement('div');
      card.className = 'design-card';

      var thumb = document.createElement('button');
      thumb.className = 'design-thumb';
      thumb.style.aspectRatio = design.w + ' / ' + design.h;

      var img = document.createElement('img');
      img.alt = design.name;
      img.src = await Render.toDataUrl(design, Render.thumbScale(design, 340));
      thumb.appendChild(img);

      var foot = document.createElement('div');
      foot.className = 'design-foot';
      var name = document.createElement('strong');
      name.textContent = design.name;
      var edit = document.createElement('button');
      edit.className = 'btn btn-ghost btn-sm';
      edit.textContent = 'Edit';
      foot.append(name, edit);

      (function (id) {
        function open() { Editor.openDesign(id); showView('editor'); }
        thumb.addEventListener('click', open);
        edit.addEventListener('click', open);
      })(design.id);

      card.append(thumb, foot);
      grid.appendChild(card);
    }
  }

  function renderDashboard() {
    var project = Store.project;
    var hasBook = project.chapters.length > 0;
    var hasDesigns = project.designs.length > 0;

    $('projectTitle').value = project.title;
    $('authorField').value = project.author || '';
    $('importSummary').hidden = !hasBook;
    $('themeSection').hidden = !hasBook;
    $('learningSection').hidden = project.source !== 'pptx';
    $('graphicsSection').hidden = !hasDesigns;
    $('emptyState').hidden = hasBook;

    if (hasBook) {
      renderStats();
      renderChapterList();
      renderThemeGrid();
      $('btnBuild').textContent = hasDesigns ? 'Rebuild my ebook' : 'Build my ebook';
    }
    if (project.source === 'pptx') renderLearning();
    if (hasDesigns) renderDesignGrid();
  }

  /* ── import ────────────────────────────────────────────────────────── */

  async function handleDeck(file, buffer) {
    var project = Store.project;
    var deck = await Course.absorbMedia(await Pptx.parse(buffer), project);

    project.source = 'pptx';
    project.deck = deck;
    project.title = deck.slides[0] && deck.slides[0].title
      ? Learning.sentenceCase(deck.slides[0].title)
      : file.name.replace(/\.pptx$/i, '');

    toast('Building ' + deck.slides.length + ' lessons…', 12000);
    await Render.ready();

    var course = await Course.build(deck, project, learningOptions());
    project.title = course.title;
    project.subtitle = course.subtitle || '';
    project.chapters = course.chapters;
    project.designs = course.designs;
    project.activeDesignId = course.designs[0].id;
    Store.save();
    Book.clearArtCache();

    renderDashboard();
    toast(course.lessonCount + ' lessons, ' + countActivities() + ' things to do. Tune it below and rebuild.');
    $('importSummary').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function countActivities() {
    return Store.project.chapters.reduce(function (total, chapter) {
      return total + chapter.blocks.filter(function (b) { return b.type === 'activity'; }).length;
    }, 0);
  }

  async function handleFile(file) {
    if (!file) {
      showUploadError('Nothing arrived', 'No file came through. Try the browse button instead of dragging, or drag a single file rather than a folder.');
      return;
    }

    clearUploadError();
    toast('Reading ' + file.name + '…', 10000);

    try {
      if (!file.size) {
        showUploadError('That file is empty', file.name + ' is 0 bytes. It may still be syncing from OneDrive or Google Drive — wait for it to finish downloading, then try again.');
        return;
      }

      var buffer = await file.arrayBuffer();
      var detected = Importer.sniff(buffer, file.name);
      var why = Importer.refusal(detected);

      if (why) {
        showUploadError('Cannot open ' + file.name, why);
        return;
      }

      if (detected.kind === 'pptx') {
        await handleDeck(file, buffer);
        return;
      }

      var result = await Importer.readFile(file, buffer, detected);
      var project = Store.project;
      project.source = 'text';
      project.deck = null;
      project.title = result.title;
      project.chapters = result.chapters;
      project.designs = [];
      project.activeDesignId = null;
      Store.save();
      renderDashboard();
      toast(result.chapters.length + ' chapters, ' + result.words.toLocaleString() + ' words. Pick a look and build.');
      $('themeSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      console.error(err);
      showUploadError('Could not read ' + file.name,
        (err && err.message) || 'Something went wrong reading that file.');
    }
  }

  function wireDropzone() {
    var zone = $('dropzone');
    var input = $('fileInput');

    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      var file = input.files[0];
      input.value = '';          // cleared first, so the same file can be retried
      handleFile(file);
    });

    ['dragenter', 'dragover'].forEach(function (name) {
      zone.addEventListener(name, function (evt) {
        evt.preventDefault();
        zone.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (name) {
      zone.addEventListener(name, function (evt) {
        evt.preventDefault();
        zone.classList.remove('is-over');
      });
    });
    zone.addEventListener('drop', function (evt) {
      handleFile(fromDrop(evt));
    });

    // Dropping anywhere on the dashboard works too.
    var dash = document.querySelector('.dash');
    dash.addEventListener('dragover', function (evt) { evt.preventDefault(); });
    dash.addEventListener('drop', function (evt) {
      evt.preventDefault();
      if (evt.target.closest('#dropzone')) return;
      handleFile(fromDrop(evt));
    });

    /* Without this, a file dropped anywhere else makes the browser navigate
       away from the app and the work in progress looks lost. */
    ['dragover', 'drop'].forEach(function (name) {
      document.addEventListener(name, function (evt) { evt.preventDefault(); });
    });

    $('uploadErrorClose').addEventListener('click', clearUploadError);
  }

  function fromDrop(evt) {
    var items = evt.dataTransfer;
    if (!items) return null;
    if (items.files && items.files.length) return items.files[0];
    return null;
  }

  /* ── upload errors ─────────────────────────────────────────────────── */

  function showUploadError(title, body) {
    $('uploadErrorTitle').textContent = title;
    $('uploadErrorBody').textContent = body || '';
    $('uploadError').hidden = false;
    $('uploadError').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearUploadError() { $('uploadError').hidden = true; }

  /* ── build ─────────────────────────────────────────────────────────── */

  async function buildEverything() {
    var project = Store.project;
    if (!project.chapters.length && !project.deck) { toast('Upload a file first.'); return; }

    project.author = $('authorField').value.trim();
    project.trimId = $('trimSelect').value;

    toast('Building…', 12000);
    await Render.ready();
    Store.commit();

    if (project.source === 'pptx' && project.deck) {
      var course = await Course.build(project.deck, project, learningOptions());
      project.title = course.title;
      project.subtitle = course.subtitle || '';
      project.chapters = course.chapters;
      project.designs = course.designs;
    } else {
      project.designs = Templates.buildAll(project);
    }

    project.activeDesignId = project.designs[0].id;
    Store.save();
    Book.clearArtCache();

    renderDashboard();
    toast(project.source === 'pptx'
      ? project.designs.length + ' graphics and ' + countActivities() + ' things to do. Open Book to read it through.'
      : project.designs.length + ' graphics ready. Open Design to tweak any of them.');
    $('graphicsSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── exports ───────────────────────────────────────────────────────── */

  function openExport() { $('exportModal').hidden = false; }
  function closeExport() { $('exportModal').hidden = true; $('exportStatus').textContent = ''; }

  async function runExport(kind) {
    var project = Store.project;
    var status = $('exportStatus');
    var name = Exporter.slug(project.title);

    function progress(done, total) { status.textContent = done + ' of ' + total + '…'; }

    try {
      if (kind === 'pdf') {
        if (!project.chapters.length) { toast('There is no book to print yet.'); return; }
        closeExport();
        await Book.print();
        return;
      }

      if (kind === 'project') {
        Exporter.download(Exporter.buildProjectFile(), name + '.json');
        closeExport();
        return;
      }

      if (!Zip.supported() && (kind === 'epub' || kind === 'images')) {
        toast('This browser cannot build zip files. Try Chrome or Edge.', 5000);
        return;
      }

      status.textContent = 'Working…';

      if (kind === 'epub') {
        if (!project.chapters.length) { toast('There is no book to export yet.'); return; }
        Exporter.download(await Exporter.buildEpub(progress), name + '.epub');
      } else if (kind === 'html') {
        if (!project.chapters.length) { toast('There is no book to export yet.'); return; }
        Exporter.download(await Exporter.buildHtml(), name + '.html');
      } else if (kind === 'images') {
        if (!project.designs.length) { toast('No graphics yet. Build them first.'); return; }
        Exporter.download(await Exporter.buildImagesZip(progress), name + '-graphics.zip');
      }

      status.textContent = 'Done.';
      toast('Saved to your downloads.');
    } catch (err) {
      console.error(err);
      status.textContent = '';
      toast(err.message || 'That export failed.', 5000);
    }
  }

  /* ── sample ────────────────────────────────────────────────────────── */

  var SAMPLE = [
    '# The Quiet Hours',
    '',
    '## Why mornings decide the day',
    '',
    'Most advice about mornings is really advice about willpower, and willpower is the least',
    'reliable tool in the box. The people who guard their mornings well are rarely the most',
    'disciplined. They are the ones who removed the decisions.',
    '',
    '> A morning you have to negotiate with is a morning you have already lost.',
    '',
    'Start with the night before. Pick the one thing that matters, write it on paper, and leave',
    'the paper where your hand will find it before your phone does.',
    '',
    '### What to remove',
    '',
    '- Notifications, all of them, until the first task is finished',
    '- Any decision that can be made the night before',
    '- The idea that the morning has to be long to count',
    '',
    '## The cost of a fragmented hour',
    '',
    'An hour cut into six pieces is not an hour. Attention has a warm-up cost, and every',
    'interruption charges it again. This is why a protected twenty-five minutes routinely beats',
    'a scattered ninety.',
    '',
    'Measure your week in unbroken blocks rather than hours logged. The number will be smaller',
    'than you expect, and far more honest.',
    '',
    '## Building a week that holds',
    '',
    'A good week is mostly a matter of shape. Put the demanding work where your energy actually',
    'is, not where the calendar has space, and let the shallow work fall into the gaps it fits.',
    '',
    '> Protect the first hour and the rest of the day negotiates with you instead of over you.',
    '',
    'Review on Friday, plan on Sunday, and keep both short enough that you will still do them in',
    'a bad week.'
  ].join('\n');

  async function loadSample() {
    var file = new File([SAMPLE], 'the-quiet-hours.md', { type: 'text/markdown' });
    await handleFile(file);
    Store.project.subtitle = 'Small habits for a day that holds together';
    Store.project.author = $('authorField').value.trim() || 'Sample Author';
    $('authorField').value = Store.project.author;
    Store.save();
    renderDashboard();
  }

  /* ── save indicator ────────────────────────────────────────────────── */

  function wireSaveState() {
    var label = $('saveState');
    Store.on('dirty', function () { label.textContent = 'Saving…'; });
    Store.on('saved', function () { label.textContent = 'Saved'; });
    Store.on('save-failed', function () { label.textContent = 'Not saved'; });
  }

  /* ── boot ──────────────────────────────────────────────────────────── */

  async function boot() {
    var trim = $('trimSelect');
    Templates.TRIMS.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      trim.appendChild(opt);
    });

    wireSaveState();
    wireDropzone();
    Editor.mount();

    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () { showView(tab.dataset.view); });
    });

    $('projectTitle').addEventListener('change', function () {
      Store.project.title = $('projectTitle').value.trim() || 'Untitled ebook';
      Store.save();
    });
    $('authorField').addEventListener('change', function () {
      Store.project.author = $('authorField').value.trim();
      Store.save();
    });
    trim.addEventListener('change', function () {
      Store.project.trimId = trim.value;
      Store.save();
    });

    $('btnBuild').addEventListener('click', buildEverything);
    $('btnSample').addEventListener('click', loadSample);
    $('btnSampleDeck').addEventListener('click', async function () {
      toast('Assembling a sample deck…', 6000);
      await handleFile(await SampleDeck.build());
    });
    $('densitySelect').addEventListener('change', function () {
      saveLearning({ density: $('densitySelect').value });
    });
    $('groupSelect').addEventListener('change', function () {
      saveLearning({ lessonsPerChapter: parseInt($('groupSelect').value, 10) });
    });
    $('btnClearImport').addEventListener('click', function () {
      if (!confirm('Clear this project and start over? The current text and graphics will be removed.')) return;
      Store.reset();
      renderDashboard();
      toast('Cleared.');
    });

    document.querySelectorAll('[data-new-design]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = Templates.themeById(Store.project.themeId);
        var kind = btn.dataset.newDesign;
        var design = kind === 'social' ? Templates.makeSocialCard(theme, Store.project)
                   : kind === 'quote'  ? Templates.makeQuoteCard(theme, 'Drop a line worth quoting here.', Store.project.author)
                   : Templates.makeBlank(theme, Templates.trimPx(Store.project.trimId));
        Editor.newDesign(design);
        showView('editor');
      });
    });

    $('btnExport').addEventListener('click', openExport);
    $('btnCloseExport').addEventListener('click', closeExport);
    $('exportModal').addEventListener('click', function (evt) {
      if (evt.target === $('exportModal')) closeExport();
    });
    document.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener('click', function () { runExport(btn.dataset.export); });
    });
    $('projectImport').addEventListener('change', async function () {
      var file = $('projectImport').files[0];
      if (!file) return;
      try {
        await Exporter.loadProjectFile(file);
        closeExport();
        renderDashboard();
        toast('Project opened.');
      } catch (err) {
        toast(err.message || 'That file could not be opened.', 4000);
      }
      $('projectImport').value = '';
    });

    $('btnPrintBook').addEventListener('click', function () { Book.print(); });

    document.addEventListener('keydown', function (evt) {
      if (evt.key === 'Escape' && !$('exportModal').hidden) closeExport();
    });

    Store.on('change', function () {
      if (currentView === 'dashboard') renderDashboard();
      Book.clearArtCache();
    });
    Store.on('loaded', function () {
      $('projectTitle').value = Store.project.title;
      $('trimSelect').value = Store.project.trimId;
    });

    await Store.load();
    await Render.ready();
    $('trimSelect').value = Store.project.trimId;
    renderDashboard();
    Editor.refresh();
  }

  global.App = { toast: toast, showView: showView, renderDashboard: renderDashboard };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
