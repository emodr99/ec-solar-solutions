/* Project state, persistence and undo.
 *
 * Everything lives in IndexedDB rather than localStorage because uploaded
 * images are stored as data URLs and blow past the 5 MB localStorage ceiling
 * almost immediately.
 */
(function (global) {
  'use strict';

  var DB_NAME = 'ebook-studio';
  var STORE = 'projects';
  var KEY = 'current';

  var listeners = {};
  var saveTimer = null;
  var undoStack = [];
  var redoStack = [];
  var UNDO_LIMIT = 80;

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9);
  }

  function emptyProject() {
    return {
      version: 1,
      id: uid('proj'),
      title: 'Untitled ebook',
      subtitle: '',
      author: '',
      themeId: 'midnight',
      trimId: 'trade',
      source: 'text',      // 'text' for prose imports, 'pptx' for decks
      deck: null,          // the parsed slides, kept so a rebuild can re-run
      learning: null,      // activity mix chosen on the dashboard
      chapters: [],
      designs: [],
      assets: {},
      activeDesignId: null,
      updatedAt: Date.now()
    };
  }

  var project = emptyProject();

  /* ── events ────────────────────────────────────────────────────────── */

  function on(name, fn) {
    (listeners[name] = listeners[name] || []).push(fn);
  }

  function emit(name, payload) {
    (listeners[name] || []).forEach(function (fn) { fn(payload); });
  }

  /* ── IndexedDB ─────────────────────────────────────────────────────── */

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function load() {
    try {
      var db = await openDb();
      var value = await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        tx.onsuccess = function () { resolve(tx.result); };
        tx.onerror = function () { reject(tx.error); };
      });
      if (value && value.version) {
        project = Object.assign(emptyProject(), value);
        emit('loaded', project);
        return true;
      }
    } catch (err) {
      console.warn('Could not read saved work:', err);
    }
    return false;
  }

  async function writeNow() {
    project.updatedAt = Date.now();
    try {
      var db = await openDb();
      await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put(project, KEY);
        tx.onsuccess = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
      emit('saved');
    } catch (err) {
      console.warn('Could not save:', err);
      emit('save-failed', err);
    }
  }

  function save() {
    emit('dirty');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 600);
  }

  /* ── undo ──────────────────────────────────────────────────────────── */

  /* Snapshot the designs before a change, so undo restores the previous
     state rather than the one we are about to create. */
  function commit() {
    undoStack.push(JSON.stringify(project.designs));
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0;
    emit('history');
  }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(JSON.stringify(project.designs));
    project.designs = JSON.parse(undoStack.pop());
    save();
    emit('history');
    emit('change');
    return true;
  }

  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(JSON.stringify(project.designs));
    project.designs = JSON.parse(redoStack.pop());
    save();
    emit('history');
    emit('change');
    return true;
  }

  /* ── helpers ───────────────────────────────────────────────────────── */

  function designById(id) {
    return project.designs.filter(function (d) { return d.id === id; })[0] || null;
  }

  function activeDesign() {
    return designById(project.activeDesignId) || project.designs[0] || null;
  }

  function replaceProject(next) {
    project = Object.assign(emptyProject(), next);
    undoStack.length = 0;
    redoStack.length = 0;
    save();
    emit('loaded', project);
    emit('change');
  }

  function reset() {
    replaceProject(emptyProject());
  }

  global.Store = {
    uid: uid,
    on: on,
    emit: emit,
    load: load,
    save: save,
    writeNow: writeNow,
    commit: commit,
    undo: undo,
    redo: redo,
    canUndo: function () { return undoStack.length > 0; },
    canRedo: function () { return redoStack.length > 0; },
    designById: designById,
    activeDesign: activeDesign,
    replaceProject: replaceProject,
    reset: reset,
    emptyProject: emptyProject,
    get project() { return project; }
  };
})(window);
