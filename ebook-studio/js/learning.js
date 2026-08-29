/* Active-learning material, derived from the deck.
 *
 * Everything here is worked out from what the slides already say: terms and
 * their definitions, sentences worth blanking, steps worth re-ordering, words
 * worth putting in a grid. It does not invent new subject matter, and it says
 * so — a generated question is a retrieval prompt, not an exam paper.
 */
(function (global) {
  'use strict';

  var STOP = ('a an the and or but if then than that this these those of to in on at for from by with '
    + 'as is are was were be been being do does did have has had can could should would will shall may '
    + 'might must not no nor so such very more most much many some any each every other another it its '
    + 'they them their we our you your he she his her i me my us who whom which what when where why how '
    + 'about into over under between during before after above below up down out off again further once '
    + 'here there all both few own same too also just because while until').split(' ');

  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = true; });

  function words(text) {
    return String(text).toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  }

  function isStop(word) { return STOPSET[String(word).toLowerCase()] === true; }

  /* Deterministic shuffling: rebuilding a course twice gives the same book. */
  function rng(seed) {
    var s = 2166136261;
    String(seed).split('').forEach(function (c) {
      s ^= c.charCodeAt(0);
      s = Math.imul(s, 16777619);
    });
    return function () {
      s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  function shuffle(list, seed) {
    var out = list.slice();
    var next = rng(seed);
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(next() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  function sentences(text) {
    return String(text).split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function trimWords(text, limit) {
    var parts = String(text).trim().split(/\s+/);
    if (parts.length <= limit) return parts.join(' ');
    return parts.slice(0, limit).join(' ').replace(/[,;:]$/, '') + '…';
  }

  function sentenceCase(text) {
    var t = String(text).trim();
    if (!t) return t;
    /* Slide titles are often shouted; give them back their shape. */
    if (t === t.toUpperCase() && /[A-Z]{3}/.test(t)) {
      t = t.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    }
    return t;
  }

  function lower(text) {
    var t = sentenceCase(text);
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  /* ── terms and definitions ─────────────────────────────────────────── */

  function cleanTerm(text) {
    return String(text).replace(/^[\s"'“”(\[]+|[\s"'“”)\].,;:!?]+$/g, '').trim();
  }

  /* Ordinary scaffolding words. "Week 1" and "Step 3" label a position in a
     list; they are not vocabulary, and they poison a glossary if let through. */
  var GENERIC = /^(week|day|month|year|quarter|phase|step|stage|part|level|tier|section|chapter|lesson|figure|table|note|item|q)\b/i;

  /* A "term" is only worth teaching if it carries meaning on its own. */
  function usableTerm(term) {
    var t = cleanTerm(term);
    if (t.length < 3 || t.length > 34) return false;
    var parts = words(t);
    if (!parts.length || parts.length > 4) return false;
    if (parts.every(isStop)) return false;
    if (/\d/.test(t) && GENERIC.test(t)) return false;
    if (/^[\d\s.,%-]+$/.test(t)) return false;
    return true;
  }

  /* Pulls term/definition pairs out of a slide: first from bullets written as
     "Term: meaning", then from anything the author put in bold. Slides that
     are really a timeline or a run of figures are skipped — their leading
     words are labels, not definitions. */
  function termsFromSlide(slide, shape) {
    var found = [];
    var seen = {};

    if (shape === 'timeline' || shape === 'stats') return found;

    function push(term, meaning) {
      var key = cleanTerm(term).toLowerCase();
      if (!usableTerm(term) || seen[key] || !meaning) return;
      seen[key] = true;
      found.push({ term: cleanTerm(term), meaning: trimWords(meaning, 26) });
    }

    slide.bullets.forEach(function (bullet) {
      var pair = Diagrams.splitPair(bullet.text);
      if (pair) push(pair.head, pair.tail);
    });

    (slide.bold || []).forEach(function (bold) {
      var host = slide.bullets.filter(function (b) {
        return b.text.indexOf(bold) !== -1 && b.text.length > bold.length + 12;
      })[0];
      if (host) push(bold, host.text.replace(bold, '').replace(/^\W+/, ''));
    });

    return found;
  }

  /* ── cloze ─────────────────────────────────────────────────────────── */

  /* Blank the most information-bearing word: a known term if the sentence
     contains one, otherwise the longest content word that is not the opener. */
  function makeCloze(sentence, terms) {
    var text = String(sentence).trim().replace(/\s+/g, ' ');
    if (words(text).length < 8 || text.length > 190) return null;

    /* On a "Term: meaning" line the term is the thing worth recalling, even
       though it opens the sentence — the meaning that follows is the clue. */
    var pair = Diagrams.splitPair(text);
    if (pair && usableTerm(pair.head) && text.indexOf(pair.head) === 0) {
      return { before: '', after: text.slice(pair.head.length), answer: pair.head };
    }

    var target = null;
    for (var i = 0; i < terms.length; i++) {
      var idx = text.toLowerCase().indexOf(terms[i].term.toLowerCase());
      if (idx > 0) { target = { at: idx, length: terms[i].term.length }; break; }
    }

    if (!target) {
      var best = null;
      var re = /[A-Za-z][A-Za-z'-]{4,}/g;
      var match;
      while ((match = re.exec(text))) {
        if (match.index === 0 || isStop(match[0])) continue;
        if (!best || match[0].length > best[0].length) best = match;
      }
      if (!best) return null;
      target = { at: best.index, length: best[0].length };
    }

    return {
      before: text.slice(0, target.at),
      after: text.slice(target.at + target.length),
      answer: text.substr(target.at, target.length)
    };
  }

  /* ── questions from titles ─────────────────────────────────────────── */

  var COUNT_WORDS = /\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i;

  function questionFromTitle(title) {
    var t = sentenceCase(String(title).trim().replace(/[.:]+$/, ''));
    if (!t) return null;

    if (/^(what|why|how|when|where|who|which|do|does|is|are|can|should)\b/i.test(t)) {
      return t.replace(/\?+$/, '') + '?';
    }
    if (/^how to\b/i.test(t)) {
      return 'How do you ' + lower(t.replace(/^how to\s*/i, '')) + '?';
    }
    if (COUNT_WORDS.test(t) && /\b(steps?|stages?|types?|kinds?|reasons?|ways?|parts?|rules?|principles?|benefits?|factors?)\b/i.test(t)) {
      return 'What are ' + lower(t) + '?';
    }
    if (/\s+vs\.?\s+|\s+versus\s+/i.test(t)) {
      var sides = t.split(/\s+vs\.?\s+|\s+versus\s+/i);
      return 'What is the main difference between ' + sides[0].trim() + ' and ' + sides[1].trim() + '?';
    }
    if (/\b(benefits?|advantages?|importance|value)\b/i.test(t)) {
      return 'Why does ' + lower(t.replace(/^(the\s+)?(benefits?|advantages?|importance|value)\s+of\s+/i, '')) + ' matter?';
    }
    return 'In your own words, explain ' + lower(t) + '.';
  }

  /* ── crossword ─────────────────────────────────────────────────────── */

  function crosswordWord(term) {
    return String(term).toUpperCase().replace(/[^A-Z]/g, '');
  }

  /* Classic constructive fill: longest word first, then every later word is
     tried against every matching letter already on the grid. */
  function crossword(entries, seed) {
    var pool = entries
      .map(function (e) { return { letters: crosswordWord(e.term), term: e.term, clue: e.meaning }; })
      .filter(function (e) { return e.letters.length >= 3 && e.letters.length <= 13; });

    var unique = {};
    pool = pool.filter(function (e) {
      if (unique[e.letters]) return false;
      unique[e.letters] = true;
      return true;
    }).sort(function (a, b) { return b.letters.length - a.letters.length; }).slice(0, 12);

    if (pool.length < 3) return null;

    var cells = {};                       // "r,c" -> letter
    var placed = [];
    var key = function (r, c) { return r + ',' + c; };

    function fits(word, row, col, across) {
      var crossings = 0;
      for (var i = 0; i < word.length; i++) {
        var r = across ? row : row + i;
        var c = across ? col + i : col;
        var here = cells[key(r, c)];

        if (here) {
          if (here !== word[i]) return -1;
          crossings++;
        } else {
          // The cells to either side, across the word's direction, must be free
          // or we would create an unintended second word.
          var a = across ? cells[key(r - 1, c)] : cells[key(r, c - 1)];
          var b = across ? cells[key(r + 1, c)] : cells[key(r, c + 1)];
          if (a || b) return -1;
        }
      }
      var beforeCell = across ? cells[key(row, col - 1)] : cells[key(row - 1, col)];
      var afterCell = across ? cells[key(row, col + word.length)] : cells[key(row + word.length, col)];
      if (beforeCell || afterCell) return -1;
      return crossings;
    }

    function put(entry, row, col, across) {
      for (var i = 0; i < entry.letters.length; i++) {
        cells[key(across ? row : row + i, across ? col + i : col)] = entry.letters[i];
      }
      placed.push({ entry: entry, row: row, col: col, across: across });
    }

    put(pool[0], 0, 0, true);

    pool.slice(1).forEach(function (entry) {
      var best = null;

      placed.forEach(function (anchor) {
        for (var i = 0; i < entry.letters.length; i++) {
          for (var j = 0; j < anchor.entry.letters.length; j++) {
            if (entry.letters[i] !== anchor.entry.letters[j]) continue;

            var across = !anchor.across;
            var row = anchor.across ? anchor.row - i : anchor.row + j;
            var col = anchor.across ? anchor.col + j : anchor.col - i;
            if (across) { row = anchor.row + j; col = anchor.col - i; }
            else { row = anchor.row - i; col = anchor.col + j; }

            var score = fits(entry.letters, row, col, across);
            if (score < 1) continue;
            var spread = Math.abs(row) + Math.abs(col);
            if (!best || score > best.score || (score === best.score && spread < best.spread)) {
              best = { row: row, col: col, across: across, score: score, spread: spread };
            }
          }
        }
      });

      if (best) put(entry, best.row, best.col, best.across);
    });

    if (placed.length < 3) return null;

    /* Crop to what was used, then number the starting squares in reading order. */
    var rows = placed.map(function (p) { return p.row; });
    var cols = placed.map(function (p) { return p.col; });
    var minRow = Math.min.apply(null, rows.concat(Object.keys(cells).map(function (k) { return +k.split(',')[0]; })));
    var minCol = Math.min.apply(null, cols.concat(Object.keys(cells).map(function (k) { return +k.split(',')[1]; })));
    var maxRow = Math.max.apply(null, Object.keys(cells).map(function (k) { return +k.split(',')[0]; }));
    var maxCol = Math.max.apply(null, Object.keys(cells).map(function (k) { return +k.split(',')[1]; }));

    var height = maxRow - minRow + 1;
    var width = maxCol - minCol + 1;
    var grid = [];
    for (var r = 0; r < height; r++) {
      grid.push([]);
      for (var c = 0; c < width; c++) grid[r].push(cells[key(r + minRow, c + minCol)] || null);
    }

    var numbers = {};
    var counter = 0;
    for (var r2 = 0; r2 < height; r2++) {
      for (var c2 = 0; c2 < width; c2++) {
        if (!grid[r2][c2]) continue;
        var startsAcross = (c2 === 0 || !grid[r2][c2 - 1]) && c2 + 1 < width && grid[r2][c2 + 1];
        var startsDown = (r2 === 0 || !grid[r2 - 1][c2]) && r2 + 1 < height && grid[r2 + 1][c2];
        if (startsAcross || startsDown) numbers[r2 + ',' + c2] = ++counter;
      }
    }

    var clues = placed.map(function (p) {
      var row = p.row - minRow;
      var col = p.col - minCol;
      return {
        number: numbers[row + ',' + col] || 0,
        across: p.across,
        answer: p.entry.letters,
        term: p.entry.term,
        clue: p.entry.clue,
        row: row,
        col: col
      };
    }).filter(function (c) { return c.number; })
      .sort(function (a, b) { return a.number - b.number; });

    return { grid: grid, numbers: numbers, entries: clues, width: width, height: height };
  }

  /* ── word search ───────────────────────────────────────────────────── */

  var DIRECTIONS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function wordsearch(terms, seed) {
    var list = terms
      .map(function (t) { return crosswordWord(t.term || t); })
      .filter(function (w) { return w.length >= 3 && w.length <= 12; });

    var unique = [];
    list.forEach(function (w) { if (unique.indexOf(w) === -1) unique.push(w); });
    unique = unique.slice(0, 10);
    if (unique.length < 4) return null;

    var longest = unique.reduce(function (a, w) { return Math.max(a, w.length); }, 0);
    var size = Math.min(16, Math.max(12, longest + 2));
    var grid = [];
    for (var r = 0; r < size; r++) grid.push(new Array(size).fill(null));

    var next = rng(seed || unique.join(''));
    var placed = [];

    unique.forEach(function (word) {
      for (var attempt = 0; attempt < 220; attempt++) {
        var dir = DIRECTIONS[Math.floor(next() * DIRECTIONS.length)];
        var row = Math.floor(next() * size);
        var col = Math.floor(next() * size);
        var endRow = row + dir[0] * (word.length - 1);
        var endCol = col + dir[1] * (word.length - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

        var ok = true;
        for (var i = 0; i < word.length; i++) {
          var cell = grid[row + dir[0] * i][col + dir[1] * i];
          if (cell && cell !== word[i]) { ok = false; break; }
        }
        if (!ok) continue;

        for (var j = 0; j < word.length; j++) grid[row + dir[0] * j][col + dir[1] * j] = word[j];
        placed.push(word);
        return;
      }
    });

    if (placed.length < 4) return null;

    for (var r2 = 0; r2 < size; r2++) {
      for (var c2 = 0; c2 < size; c2++) {
        if (!grid[r2][c2]) grid[r2][c2] = ALPHABET[Math.floor(next() * 26)];
      }
    }

    return { grid: grid, words: placed.sort(), size: size };
  }

  /* ── activities ────────────────────────────────────────────────────── */

  var uid = function () { return Store.uid('act'); };

  function recallActivity(lesson, count) {
    return {
      id: uid(), kind: 'recall',
      title: 'Cover and recall',
      prompt: 'Cover the page opposite. From memory, write down the ' +
        (count > 1 ? count + ' points' : 'main point') + ' from “' + sentenceCase(lesson.title) + '”.',
      lines: Math.max(3, Math.min(6, count))
    };
  }

  function clozeActivity(lesson, terms) {
    var pool = lesson.bullets.map(function (b) { return b.text; })
      .concat(sentences(lesson.notes || ''));
    var items = [];

    for (var i = 0; i < pool.length && items.length < 3; i++) {
      var made = makeCloze(pool[i], terms);
      if (made) items.push(made);
    }
    if (!items.length) return null;

    return {
      id: uid(), kind: 'cloze',
      title: 'Fill the gap',
      prompt: 'Complete each line without looking back.',
      items: items
    };
  }

  function askActivity(lesson) {
    var question = questionFromTitle(lesson.title);
    if (!question) return null;
    return {
      id: uid(), kind: 'ask',
      title: 'Check yourself',
      prompt: '',
      items: [{ question: question, lines: 3 }]
    };
  }

  function applyActivity(lesson) {
    return {
      id: uid(), kind: 'apply',
      title: 'Make it yours',
      prompt: 'Pick one idea from “' + sentenceCase(lesson.title) +
        '” and write one sentence about where you would use it this week.',
      lines: 3
    };
  }

  function matchActivity(terms, seed) {
    if (terms.length < 3) return null;
    var picked = terms.slice(0, 6);
    var order = shuffle(picked.map(function (_, i) { return i; }), seed + 'match');

    return {
      id: uid(), kind: 'match',
      title: 'Match them up',
      prompt: 'Draw a line from each term to its meaning.',
      terms: picked.map(function (t) { return t.term; }),
      meanings: order.map(function (i) { return picked[i].meaning; }),
      answer: order.map(function (i, position) {
        return { term: picked[i].term, letter: String.fromCharCode(65 + position) };
      })
    };
  }

  function orderActivity(lesson, seed) {
    var items = lesson.bullets
      .filter(function (b) { return b.level === 0; })
      .map(function (b) { return Diagrams.stripOrdinal(b.text); })
      .filter(function (t) { return t.length <= 120; });

    if (items.length < 3 || items.length > 7) return null;
    var scrambled = shuffle(items, seed + lesson.title);
    if (scrambled.join('|') === items.join('|')) scrambled.reverse();

    return {
      id: uid(), kind: 'order',
      title: 'Put them in order',
      prompt: 'Number these from 1 to ' + items.length + ' in the right order.',
      items: scrambled,
      answer: items
    };
  }

  function crosswordActivity(terms, seed) {
    var puzzle = crossword(terms, seed);
    if (!puzzle) return null;
    return {
      id: uid(), kind: 'crossword',
      title: 'Crossword',
      prompt: 'Every answer is a term from this book.',
      puzzle: puzzle
    };
  }

  function wordsearchActivity(terms, seed) {
    var puzzle = wordsearch(terms, seed);
    if (!puzzle) return null;
    return {
      id: uid(), kind: 'wordsearch',
      title: 'Word search',
      prompt: 'Ten terms, hidden in any direction, including backwards.',
      puzzle: puzzle
    };
  }

  global.Learning = {
    words: words,
    isStop: isStop,
    shuffle: shuffle,
    sentences: sentences,
    trimWords: trimWords,
    sentenceCase: sentenceCase,
    lower: lower,
    termsFromSlide: termsFromSlide,
    usableTerm: usableTerm,
    makeCloze: makeCloze,
    questionFromTitle: questionFromTitle,
    crossword: crossword,
    wordsearch: wordsearch,
    recallActivity: recallActivity,
    clozeActivity: clozeActivity,
    askActivity: askActivity,
    applyActivity: applyActivity,
    matchActivity: matchActivity,
    orderActivity: orderActivity,
    crosswordActivity: crosswordActivity,
    wordsearchActivity: wordsearchActivity
  };
})(window);
