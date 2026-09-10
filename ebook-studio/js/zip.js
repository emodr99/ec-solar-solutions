/* A small ZIP reader and writer.
 *
 * .docx and .epub are both ZIP files, so we need both directions. The browser
 * already ships deflate through CompressionStream, which means no library.
 */
(function (global) {
  'use strict';

  var SIG_EOCD = 0x06054b50;
  var SIG_CD   = 0x02014b50;
  var SIG_LFH  = 0x04034b50;

  var crcTable = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function hasStreams() {
    return typeof global.CompressionStream === 'function' &&
           typeof global.DecompressionStream === 'function';
  }

  async function through(bytes, stream) {
    var res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }

  var inflateRaw = function (bytes) { return through(bytes, new DecompressionStream('deflate-raw')); };
  var deflateRaw = function (bytes) { return through(bytes, new CompressionStream('deflate-raw')); };

  /* ── read ──────────────────────────────────────────────────────────── */

  /* Walks the central directory and reports what the archive holds, without
     inflating any of it. Cheap enough to run on a 100 MB file purely to work
     out what kind of file it is. */
  function entries(arrayBuffer) {
    var view = new DataView(arrayBuffer);
    var bytes = new Uint8Array(arrayBuffer);
    var eocd = -1;

    for (var i = view.byteLength - 22; i >= 0 && i > view.byteLength - 65558; i--) {
      if (view.getUint32(i, true) === SIG_EOCD) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Not a ZIP file (no end-of-directory record).');

    var count = view.getUint16(eocd + 10, true);
    var cursor = view.getUint32(eocd + 16, true);
    var decoder = new TextDecoder();
    var out = [];

    for (var n = 0; n < count; n++) {
      if (cursor + 46 > view.byteLength || view.getUint32(cursor, true) !== SIG_CD) break;

      var nameLen = view.getUint16(cursor + 28, true);
      out.push({
        name: decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen)),
        method: view.getUint16(cursor + 10, true),
        compSize: view.getUint32(cursor + 20, true),
        localAt: view.getUint32(cursor + 42, true)
      });

      cursor += 46 + nameLen + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    }
    return out;
  }

  function names(arrayBuffer) {
    return entries(arrayBuffer).map(function (e) { return e.name; });
  }

  /* Returns { 'path/in/zip': Uint8Array }. `wanted` is a list of names or a
     predicate; only matching entries are inflated, which keeps a 40 MB deck
     full of photos cheap to open twice.  */
  async function read(arrayBuffer, wanted) {
    var keep = typeof wanted === 'function' ? wanted
             : Array.isArray(wanted) ? function (n) { return wanted.indexOf(n) !== -1; }
             : null;
    var view = new DataView(arrayBuffer);
    var bytes = new Uint8Array(arrayBuffer);
    var list = entries(arrayBuffer);
    var out = {};

    for (var n = 0; n < list.length; n++) {
      var entry = list[n];
      if (keep && !keep(entry.name)) continue;
      if (view.getUint32(entry.localAt, true) !== SIG_LFH) continue;

      var lNameLen  = view.getUint16(entry.localAt + 26, true);
      var lExtraLen = view.getUint16(entry.localAt + 28, true);
      var start = entry.localAt + 30 + lNameLen + lExtraLen;
      var raw = bytes.subarray(start, start + entry.compSize);

      if (entry.method === 0) {
        out[entry.name] = raw;
      } else if (entry.method === 8 && hasStreams()) {
        out[entry.name] = await inflateRaw(raw);
      } else {
        throw new Error('This file uses a compression method this browser cannot read.');
      }
    }
    return out;
  }

  /* ── write ─────────────────────────────────────────────────────────── */

  function toBytes(data) {
    return typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  }

  /* files: [{ name, data, store }] - `store` skips compression, which the
     EPUB spec requires for the mimetype entry. */
  async function write(files) {
    var locals = [];
    var central = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var raw = toBytes(f.data);
      var name = new TextEncoder().encode(f.name);
      var crc = crc32(raw);

      var payload = raw;
      var method = 0;
      if (!f.store && hasStreams() && raw.length > 64) {
        var packed = await deflateRaw(raw);
        if (packed.length < raw.length) { payload = packed; method = 8; }
      }

      var lfh = new Uint8Array(30 + name.length);
      var lv = new DataView(lfh.buffer);
      lv.setUint32(0, SIG_LFH, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);      // UTF-8 names
      lv.setUint16(8, method, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0x2100, true);     // a fixed 1 Jan 2016 timestamp
      lv.setUint32(14, crc, true);
      lv.setUint32(18, payload.length, true);
      lv.setUint32(22, raw.length, true);
      lv.setUint16(26, name.length, true);
      lv.setUint16(28, 0, true);
      lfh.set(name, 30);

      locals.push(lfh, payload);

      var cd = new Uint8Array(46 + name.length);
      var cv = new DataView(cd.buffer);
      cv.setUint32(0, SIG_CD, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, method, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x2100, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, payload.length, true);
      cv.setUint32(24, raw.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      cd.set(name, 46);
      central.push(cd);

      offset += lfh.length + payload.length;
    }

    var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, SIG_EOCD, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    return new Blob(locals.concat(central, [eocd]), { type: 'application/zip' });
  }

  global.Zip = {
    read: read,
    write: write,
    entries: entries,
    names: names,
    crc32: crc32,
    supported: hasStreams
  };
})(window);
