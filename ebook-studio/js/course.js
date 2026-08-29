/* Assembling a deck into an active-learning book.
 *
 * The shape of every lesson is the same on purpose: look at the figure, then
 * do something with it. Slide bullets become the figure, not paragraphs, so a
 * page is a picture and a task rather than a wall of text.
 */
(function (global) {
  'use strict';

  var DENSITY = {
    light:     { perLesson: 0.5, chapterEnd: 1 },
    balanced:  { perLesson: 1,   chapterEnd: 2 },
    intensive: { perLesson: 2,   chapterEnd: 3 }
  };

  var DEFAULTS = {
    density: 'balanced',
    lessonsPerChapter: 5,
    types: { cloze: true, ask: true, recall: true, apply: true, match: true, order: true, puzzles: true }
  };

  function options(given) {
    var opts = Object.assign({}, DEFAULTS, given || {});
    opts.types = Object.assign({}, DEFAULTS.types, (given || {}).types || {});
    return opts;
  }

  /* ── grouping ──────────────────────────────────────────────────────── */

  function isTitleSlide(slide) {
    return !!slide.title && slide.bullets.length <= 2 && !slide.tables.length;
  }

  /* Section-header slides are the author's own chapter marks. Without them we
     fall back to fixed-size parts, which the user can rename afterwards. */
  function groupLessons(lessons, perChapter) {
    var marked = lessons.filter(function (l) { return l.section && l.title; });
    var groups = [];

    if (marked.length >= 2) {
      var current = null;
      lessons.forEach(function (lesson) {
        if (lesson.section && lesson.title) {
          current = { title: Learning.sentenceCase(lesson.title), lessons: [] };
          groups.push(current);
          return;
        }
        if (!current) {
          current = { title: 'Introduction', lessons: [] };
          groups.unshift(current);
        }
        current.lessons.push(lesson);
      });
      groups = groups.filter(function (g) { return g.lessons.length; });
      if (groups.length) return groups;
    }

    for (var i = 0; i < lessons.length; i += perChapter) {
      var slice = lessons.slice(i, i + perChapter);
      groups.push({
        title: 'Part ' + (groups.length + 1) + ': ' + Learning.sentenceCase(slice[0].title || 'Lessons'),
        lessons: slice
      });
    }
    return groups;
  }

  /* ── objectives ────────────────────────────────────────────────────── */

  function objective(title) {
    var t = Learning.sentenceCase(String(title).replace(/[.:]+$/, ''));
    if (/^how to\b/i.test(t)) return 'carry out ' + Learning.lower(t.replace(/^how to\s*/i, ''));
    if (/^(why|what|how|when|where|who)\b/i.test(t)) return 'answer: ' + t.replace(/\?+$/, '') + '?';
    if (/\b(steps?|stages?|process|procedure|workflow)\b/i.test(t)) return 'follow ' + Learning.lower(t);
    if (/\b(benefits?|advantages?|reasons?|importance)\b/i.test(t)) return 'give ' + Learning.lower(t);
    if (/\s+vs\.?\s+|\s+versus\s+/i.test(t)) return 'tell apart ' + Learning.lower(t.replace(/\s+vs\.?\s+|\s+versus\s+/i, ' and '));
    return 'explain ' + Learning.lower(t);
  }

  /* ── per-lesson activities ─────────────────────────────────────────── */

  function lessonActivities(lesson, terms, enabled, wanted) {
    if (wanted <= 0) return [];

    var makers = [];
    if (enabled.cloze)  makers.push(function () { return Learning.clozeActivity(lesson, terms); });
    if (enabled.ask)    makers.push(function () { return Learning.askActivity(lesson); });
    if (enabled.recall) makers.push(function () {
      return Learning.recallActivity(lesson, lesson.bullets.filter(function (b) { return b.level === 0; }).length);
    });
    if (enabled.apply)  makers.push(function () { return Learning.applyActivity(lesson); });
    if (!makers.length) return [];

    var out = [];
    var offset = lesson.index || 0;
    for (var i = 0; i < makers.length && out.length < wanted; i++) {
      var made = makers[(offset + i) % makers.length]();
      if (made) {
        made.source = lesson.title;
        out.push(made);
      }
    }
    return out;
  }

  /* ── build ─────────────────────────────────────────────────────────── */

  /* Pictures out of the deck become project assets, so they survive a reload
     and can be dropped into any other design later. Done once, at import. */
  async function absorbMedia(deck, project) {
    var assetFor = {};
    var names = Object.keys(deck.media || {});

    for (var i = 0; i < names.length; i++) {
      var id = Store.uid('asset');
      project.assets[id] = await Pptx.toDataUrl(deck.media[names[i]]);
      assetFor[names[i]] = id;
    }
    deck.slides.forEach(function (slide) {
      slide.assets = (slide.images || []).map(function (name) { return assetFor[name]; }).filter(Boolean);
    });
    delete deck.media;
    return deck;
  }

  async function build(deck, project, given) {
    var opts = options(given);
    var theme = Templates.themeById(project.themeId);
    var trim = Templates.trimPx(project.trimId);
    var slides = deck.slides.slice();

    /* Title slide, if the deck opens with one. */
    var meta = { title: project.title, subtitle: project.subtitle, author: project.author };
    if (slides.length > 1 && isTitleSlide(slides[0])) {
      var titleSlide = slides.shift();
      meta.title = Learning.sentenceCase(titleSlide.title);
      if (titleSlide.bullets.length) meta.subtitle = titleSlide.bullets[0].text;
    }

    var groups = groupLessons(slides, opts.lessonsPerChapter);
    var density = DENSITY[opts.density] || DENSITY.balanced;

    var designs = [Templates.makeCover(theme, trim, meta)];
    var chapters = [];
    var allTerms = [];
    var answerGroups = [];

    groups.forEach(function (group, groupIndex) {
      var opener = Templates.makeChapterOpener(theme, trim, groupIndex + 1, group.title);
      designs.push(opener);

      var blocks = [];
      var chapterTerms = [];
      var chapterActivities = [];

      blocks.push({
        type: 'objectives',
        label: 'By the end of this part you can',
        items: group.lessons.map(function (lesson) { return objective(lesson.title); })
      });

      group.lessons.forEach(function (lesson, lessonIndex) {
        var shape = Diagrams.choose(lesson);
        var terms = Learning.termsFromSlide(lesson, shape);
        terms.forEach(function (t) {
          if (!chapterTerms.some(function (x) { return x.term.toLowerCase() === t.term.toLowerCase(); })) {
            chapterTerms.push(t);
          }
        });

        var figure = Diagrams.build(theme, lesson, shape);
        figure.kind = 'figure';
        lesson.shape = shape;
        designs.push(figure);

        /* The figure carries the lesson title in type, so the heading is kept
           for navigation but hidden on the page rather than printed twice. */
        blocks.push({ type: 'h2', text: Learning.sentenceCase(lesson.title || 'Lesson'), hidden: true });
        blocks.push({ type: 'figure', designId: figure.id });

        if (lesson.notes) {
          var brief = Learning.trimWords(Learning.sentences(lesson.notes).join(' '), 48);
          if (Learning.words(brief).length >= 12) {
            blocks.push({ type: 'callout', label: 'In brief', text: brief });
          }
        }

        (lesson.tables || []).forEach(function (rows) {
          blocks.push({ type: 'ul', text: rows.join(' '), items: rows.map(Importer.escapeHtml) });
        });

        var wanted = density.perLesson >= 1
          ? Math.round(density.perLesson)
          : (lessonIndex % 2 === 0 ? 1 : 0);

        lessonActivities(lesson, terms, opts.types, wanted).forEach(function (activity) {
          blocks.push({ type: 'activity', activity: activity });
          chapterActivities.push(activity);
        });
      });

      /* End-of-chapter work: the things that need more than one lesson. */
      var closers = [];
      if (opts.types.match) {
        var match = Learning.matchActivity(chapterTerms, 'g' + groupIndex);
        if (match) closers.push(match);
      }
      if (opts.types.order) {
        for (var i = 0; i < group.lessons.length && closers.length < density.chapterEnd; i++) {
          var ordered = Learning.orderActivity(group.lessons[i], 'g' + groupIndex);
          if (ordered) { ordered.source = group.lessons[i].title; closers.push(ordered); break; }
        }
      }
      if (opts.types.recall && closers.length < density.chapterEnd) {
        closers.push({
          id: Store.uid('act'), kind: 'checklist',
          title: 'Before you move on',
          prompt: 'Tick each one you could explain to someone else right now.',
          items: group.lessons.map(function (l) { return Learning.sentenceCase(l.title); })
        });
      }

      if (closers.length) {
        blocks.push({ type: 'h2', text: 'Practice', hidden: false });
        closers.slice(0, density.chapterEnd).forEach(function (activity) {
          blocks.push({ type: 'activity', activity: activity });
          chapterActivities.push(activity);
        });
      }

      chapters.push({ id: Store.uid('ch'), title: group.title, blocks: blocks });
      chapterTerms.forEach(function (t) {
        if (!allTerms.some(function (x) { return x.term.toLowerCase() === t.term.toLowerCase(); })) allTerms.push(t);
      });
      answerGroups.push({ chapter: group.title, activities: chapterActivities });
    });

    /* Review chapter: the puzzles that need the whole book's vocabulary. */
    if (opts.types.puzzles && allTerms.length >= 4) {
      var reviewBlocks = [];
      var reviewActivities = [];

      var glossaryDesign = null;
      var puzzles = [
        Learning.crosswordActivity(allTerms, project.id),
        Learning.wordsearchActivity(allTerms, project.id)
      ].filter(Boolean);

      if (puzzles.length) {
        var reviewOpener = Templates.makeChapterOpener(theme, trim, chapters.length + 1, 'Review');
        designs.push(reviewOpener);

        reviewBlocks.push({
          type: 'callout', label: 'How to use this',
          text: 'Work through these without turning back. Anything you cannot do points straight at the part worth rereading.'
        });
        puzzles.forEach(function (activity) {
          reviewBlocks.push({ type: 'activity', activity: activity });
          reviewActivities.push(activity);
        });

        reviewBlocks.push({ type: 'h2', text: 'Glossary', hidden: false });
        reviewBlocks.push({
          type: 'glossary',
          items: allTerms.slice(0, 40)
        });

        chapters.push({ id: Store.uid('ch'), title: 'Review', blocks: reviewBlocks });
        answerGroups.push({ chapter: 'Review', activities: reviewActivities });
      }
    }

    /* Answer key, last, so nothing is spoiled on the way there. */
    var keyGroups = answerGroups
      .map(function (group) {
        return { chapter: group.chapter, activities: group.activities.filter(hasAnswer) };
      })
      .filter(function (group) { return group.activities.length; });

    if (keyGroups.length) {
      chapters.push({
        id: Store.uid('ch'),
        title: 'Answer key',
        blocks: [
          { type: 'callout', label: 'Answer key', text: 'Check yourself here only after you have written something down. Looking first feels faster and teaches less.' },
          { type: 'answers', groups: keyGroups }
        ]
      });
    }

    designs.push(Templates.makeSocialCard(theme, meta));

    return {
      title: meta.title,
      subtitle: meta.subtitle,
      chapters: chapters,
      designs: designs,
      terms: allTerms,
      lessonCount: slides.length
    };
  }

  function hasAnswer(activity) {
    return activity.kind === 'cloze' || activity.kind === 'match' ||
           activity.kind === 'order' || activity.kind === 'crossword' ||
           activity.kind === 'wordsearch';
  }

  global.Course = {
    build: build,
    absorbMedia: absorbMedia,
    groupLessons: groupLessons,
    objective: objective,
    options: options,
    DENSITY: DENSITY
  };
})(window);
