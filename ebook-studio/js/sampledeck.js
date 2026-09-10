/* A small but genuine .pptx, assembled in the browser.
 *
 * It exists so the deck features can be tried without hunting for a file, and
 * it is a real OOXML package rather than a shortcut: same parts, same
 * relationship wiring, same placeholder types PowerPoint writes.
 */
(function (global) {
  'use strict';

  var NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
           'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

  var REL_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
  var BASE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function head() { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'; }

  /* One paragraph, optionally with a bold lead-in run. */
  function para(text, level) {
    var props = level ? '<a:pPr lvl="' + level + '"/>' : '';
    var bold = text.match(/^\*\*(.+?)\*\*(.*)$/);
    if (bold) {
      return '<a:p>' + props +
        '<a:r><a:rPr lang="en-US" b="1"/><a:t>' + esc(bold[1]) + '</a:t></a:r>' +
        '<a:r><a:rPr lang="en-US"/><a:t>' + esc(bold[2]) + '</a:t></a:r></a:p>';
    }
    return '<a:p>' + props + '<a:r><a:rPr lang="en-US"/><a:t>' + esc(text) + '</a:t></a:r></a:p>';
  }

  function shape(id, name, phType, paragraphs) {
    return '<p:sp><p:nvSpPr>' +
      '<p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>' +
      '<p:nvPr><p:ph type="' + phType + '" idx="' + (id - 1) + '"/></p:nvPr></p:nvSpPr>' +
      '<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>' + paragraphs + '</p:txBody></p:sp>';
  }

  function slideXml(slide) {
    var shapes = shape(2, 'Title 1', slide.big ? 'ctrTitle' : 'title', para(slide.title));
    if (slide.bullets && slide.bullets.length) {
      shapes += shape(3, 'Content 2', slide.big ? 'subTitle' : 'body',
        slide.bullets.map(function (b) { return para(b, 0); }).join(''));
    }

    return head() + '<p:sld ' + NS + '><p:cSld><p:spTree>' +
      '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' +
      shapes + '</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping/></p:clrMapOvr></p:sld>';
  }

  function notesXml(text) {
    return head() + '<p:notes ' + NS + '><p:cSld><p:spTree>' +
      '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' +
      shape(2, 'Notes Placeholder 1', 'body', para(text)) +
      '</p:spTree></p:cSld></p:notes>';
  }

  function layoutXml(type) {
    return head() + '<p:sldLayout ' + NS + ' type="' + type + '" preserve="1"><p:cSld><p:spTree>' +
      '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' +
      '</p:spTree></p:cSld></p:sldLayout>';
  }

  function rels(entries) {
    return head() + '<Relationships ' + REL_NS + '>' + entries.map(function (e, i) {
      return '<Relationship Id="rId' + (i + 1) + '" Type="' + BASE + e.type + '" Target="' + e.target + '"/>';
    }).join('') + '</Relationships>';
  }

  /* ── the deck ──────────────────────────────────────────────────────── */

  var SLIDES = [
    {
      big: true, layout: 'title',
      title: 'Solar Energy Basics',
      bullets: ['A short course for homeowners']
    },
    {
      layout: 'secHead',
      title: 'How sunlight becomes electricity'
    },
    {
      layout: 'obj',
      title: 'How solar works in four steps',
      bullets: [
        '1. Sunlight hits the panels and knocks electrons loose',
        '2. The panels send direct current down to the inverter',
        '3. The inverter turns that into the alternating current a house runs on',
        '4. Anything the house does not use flows back out to the grid'
      ],
      notes: 'The whole chain is silent and has no moving parts, which is why a well-installed array needs so little attention once it is up.'
    },
    {
      layout: 'obj',
      title: 'Key terms',
      bullets: [
        'Photovoltaic: the effect that turns light directly into electric current',
        'Inverter: the box that converts panel output into household current',
        'Net metering: the credit a utility gives you for electricity you export'
      ]
    },
    {
      layout: 'obj',
      title: 'More terms you will hear',
      bullets: [
        'Array: a group of panels wired together as one system',
        'Azimuth: the compass direction a roof face points towards',
        'Kilowatt: one thousand watts, the usual unit for system size',
        'Derate: the gap between a panel rating and its real output'
      ]
    },
    {
      layout: 'obj',
      title: 'Grid-tied vs off-grid',
      bullets: [
        'Cheaper to install, no batteries needed',
        'Shuts down in a blackout for line-worker safety',
        'Runs through a brownout on stored power',
        'Costs more and needs battery replacement'
      ],
      notes: 'Most homes start grid-tied and add storage later, once they know what their evening load actually looks like.'
    },
    {
      layout: 'secHead',
      title: 'Money and payback'
    },
    {
      layout: 'obj',
      title: 'By the numbers',
      bullets: [
        '30% typical drop in the first year bill',
        '5 years before the system has paid for itself',
        '25 years of manufacturer warranty on the panels'
      ]
    },
    {
      layout: 'obj',
      title: 'The install timeline',
      bullets: [
        'Week 1: site survey and roof measurement',
        'Week 2: permits filed with the local authority',
        'Week 4: panels and inverter installed',
        'Week 5: utility inspection and switch-on'
      ]
    },
    {
      layout: 'obj',
      title: 'The maintenance cycle',
      bullets: [
        'Check the monitoring app for output drops',
        'Rinse the panels after a dry dusty spell',
        'Book a yearly inspection of mounts and wiring',
        'Log the annual output and compare it to last year'
      ],
      notes: 'Almost every reported fault turns out to be dirt, shading from new growth, or a tripped breaker rather than a failed panel.'
    },
    {
      layout: 'obj',
      title: 'Three levels of system',
      bullets: [
        'Grid-tied only, the cheapest way in',
        'Grid-tied with a small battery for the evening peak',
        'Full hybrid that carries the house through an outage'
      ]
    }
  ];

  async function build() {
    var files = [];
    var presRels = [];

    files.push({
      name: '[Content_Types].xml',
      data: head() + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
        SLIDES.map(function (s, i) {
          return '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
        }).join('') +
        '</Types>'
    });

    files.push({
      name: '_rels/.rels',
      data: rels([{ type: 'officeDocument', target: 'ppt/presentation.xml' }])
    });

    files.push({ name: 'ppt/slideLayouts/layoutObj.xml', data: layoutXml('obj') });
    files.push({ name: 'ppt/slideLayouts/layoutSec.xml', data: layoutXml('secHead') });
    files.push({ name: 'ppt/slideLayouts/layoutTitle.xml', data: layoutXml('title') });

    SLIDES.forEach(function (slide, i) {
      var n = i + 1;
      files.push({ name: 'ppt/slides/slide' + n + '.xml', data: slideXml(slide) });

      var layoutFile = slide.layout === 'secHead' ? 'layoutSec.xml'
                     : slide.layout === 'title' ? 'layoutTitle.xml' : 'layoutObj.xml';
      var slideRels = [{ type: 'slideLayout', target: '../slideLayouts/' + layoutFile }];

      if (slide.notes) {
        files.push({ name: 'ppt/notesSlides/notesSlide' + n + '.xml', data: notesXml(slide.notes) });
        slideRels.push({ type: 'notesSlide', target: '../notesSlides/notesSlide' + n + '.xml' });
      }

      files.push({ name: 'ppt/slides/_rels/slide' + n + '.xml.rels', data: rels(slideRels) });
      presRels.push({ type: 'slide', target: 'slides/slide' + n + '.xml' });
    });

    files.push({
      name: 'ppt/presentation.xml',
      data: head() + '<p:presentation ' + NS + '><p:sldIdLst>' +
        SLIDES.map(function (_, i) {
          return '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 1) + '"/>';
        }).join('') +
        '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>'
    });

    files.push({ name: 'ppt/_rels/presentation.xml.rels', data: rels(presRels) });

    var blob = await Zip.write(files);
    return new File([blob], 'solar-energy-basics.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });
  }

  global.SampleDeck = { build: build };
})(window);
