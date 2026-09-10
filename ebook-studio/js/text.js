/* Shared text layout.
 *
 * The editor draws text with DOM nodes and the exporter draws it with Canvas2D.
 * If each of them broke lines its own way the PNG would not match the screen,
 * so both ask this module where the lines go. One measurer, one answer.
 */
(function (global) {
  'use strict';

  var measureCanvas = document.createElement('canvas');
  var mctx = measureCanvas.getContext('2d');
  var supportsLetterSpacing = 'letterSpacing' in mctx;

  var FONTS = [
    { label: 'Inter',             stack: '"Inter", "Segoe UI", Helvetica, Arial, sans-serif' },
    { label: 'Playfair Display',  stack: '"Playfair Display", Georgia, "Times New Roman", serif' },
    { label: 'DM Serif Display',  stack: '"DM Serif Display", Georgia, serif' },
    { label: 'Lora',              stack: '"Lora", Georgia, serif' },
    { label: 'Space Grotesk',     stack: '"Space Grotesk", "Segoe UI", sans-serif' },
    { label: 'Bebas Neue',        stack: '"Bebas Neue", Impact, "Arial Narrow", sans-serif' },
    { label: 'Georgia',           stack: 'Georgia, "Times New Roman", serif' },
    { label: 'Arial',             stack: 'Arial, Helvetica, sans-serif' },
    { label: 'Courier',           stack: '"Courier New", ui-monospace, monospace' }
  ];

  function fontString(el) {
    var style = el.italic ? 'italic ' : '';
    return style + (el.weight || 400) + ' ' + (el.size || 16) + 'px ' + (el.family || FONTS[0].stack);
  }

  function applyMeasureFont(el) {
    mctx.font = fontString(el);
    if (supportsLetterSpacing) mctx.letterSpacing = (el.letterSpacing || 0) + 'px';
  }

  function measure(str, el) {
    applyMeasureFont(el);
    var w = mctx.measureText(str).width;
    // Chrome adds trailing letter-spacing; browsers without the property need it added.
    if (!supportsLetterSpacing && el.letterSpacing) w += str.length * el.letterSpacing;
    return w;
  }

  function displayText(el) {
    var t = el.text == null ? '' : String(el.text);
    return el.uppercase ? t.toUpperCase() : t;
  }

  /* Greedy word wrap. Honours explicit newlines and breaks words that are
     wider than the box on their own, so a long URL cannot blow the layout. */
  function wrap(el) {
    var maxWidth = Math.max(1, el.w || 100);
    var out = [];
    var paragraphs = displayText(el).split('\n');

    for (var p = 0; p < paragraphs.length; p++) {
      var words = paragraphs[p].split(' ');
      var line = '';

      for (var i = 0; i < words.length; i++) {
        var word = words[i];
        var candidate = line ? line + ' ' + word : word;

        if (measure(candidate, el) <= maxWidth || !line) {
          if (measure(candidate, el) > maxWidth && !line) {
            // A single word too wide for the box: split it by character.
            var chunk = '';
            for (var c = 0; c < word.length; c++) {
              if (measure(chunk + word[c], el) > maxWidth && chunk) {
                out.push(chunk);
                chunk = word[c];
              } else {
                chunk += word[c];
              }
            }
            line = chunk;
          } else {
            line = candidate;
          }
        } else {
          out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  }

  function lineHeightPx(el) {
    return (el.size || 16) * (el.lineHeight || 1.25);
  }

  /* Height the element wants, given its wrapped lines. */
  function measuredHeight(el) {
    return wrap(el).length * lineHeightPx(el);
  }

  /* Fit text inside a fixed box by shrinking the size until it clears.
     Used by the auto-builder, where chapter titles vary wildly in length. */
  function fitSize(el, maxHeight, minSize) {
    var probe = Object.assign({}, el);
    var floor = minSize || 12;
    while (probe.size > floor && measuredHeight(probe) > maxHeight) {
      probe.size = Math.max(floor, probe.size - 1);
    }
    return probe.size;
  }

  global.TextLayout = {
    FONTS: FONTS,
    fontString: fontString,
    measure: measure,
    wrap: wrap,
    lineHeightPx: lineHeightPx,
    measuredHeight: measuredHeight,
    fitSize: fitSize,
    displayText: displayText
  };
})(window);
