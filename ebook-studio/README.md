# Ebook Studio

Drop in a slide deck or a manuscript, get back a finished ebook and a set of matching graphics
you can keep editing.

It is a browser app with no build step, no server and no accounts. Everything runs on the page:
the file is read locally, the work is saved to this computer, and nothing is uploaded anywhere.

## Slides in, active-learning ebook out

Upload a `.pptx` and every slide becomes a lesson. The point is that **the bullets do not come
out as paragraphs** — they come out as a drawing.

Each slide is read, and the layout its content is already shaped like gets chosen for it:

| The slide looks like | It is drawn as |
| --- | --- |
| Bullets numbered, or a title about steps or a process | A numbered step flow |
| Dates, weeks or phases leading each bullet | A timeline |
| "X vs Y", or two sides of an argument | A side-by-side comparison |
| Figures and percentages | Big-number stat cards |
| A title about a cycle or a loop | A ring of numbered stages |
| A title about levels, tiers or a hierarchy | A pyramid |
| One idea, or "Term: meaning" | A full-bleed definition card |
| A picture | A framed figure with its caption |
| Anything else | Numbered key-point cards |

Then it builds the things that make it a course rather than a slide dump:

- **Objectives** at the start of each part, phrased from the lesson titles
- **Fill the gap** — a key term blanked out of one of your own sentences
- **Check yourself** — a question turned from the lesson title
- **Cover and recall** — retrieval practice, with ruled lines to write on
- **Make it yours** — an application prompt
- **Matching** — terms against shuffled meanings
- **Put them in order** — the steps from a lesson, scrambled
- **A crossword** built from your terms, clued with your own definitions
- **A word search**, a **glossary**, and an **answer key** at the back

How much of this appears is up to you: a density setting and a chip for each activity type.

Speaker notes become a short "In brief" panel, capped at 48 words. Nothing else becomes prose.

### What it does not do

It does not write new subject matter. Every question, gap and clue is derived from wording that
is already in your deck. That keeps it accurate and keeps it yours, but it means a generated
question is a retrieval prompt rather than an exam paper — and it is all editable afterwards.

### If a file will not upload

The file picker deliberately has **no type filter**, so nothing is ever greyed out — pick any file
and the app works out what it is by reading the first bytes, not the name. That means `.pptx`,
`.pptm`, a deck renamed to `.zip`, and a file with no extension at all are all handled.

Old `.ppt` is the one real exception. It is not a zip at all but a binary OLE compound document
from the 1990s, and no browser can read it. The app detects it by its signature and says exactly
how to convert: open it in PowerPoint and use File › Save As → *PowerPoint Presentation (\*.pptx)*.
Google Slides and LibreOffice convert it for free too.

Anything that cannot be opened explains itself in a panel under the dropzone that stays put until
dismissed, rather than a toast that vanishes before it is read. Empty files get their own message,
because a deck that is still syncing from OneDrive or Google Drive arrives as zero bytes.

## Manuscripts too

Upload a `.docx`, `.md`, `.txt` or `.html` file instead. It reads the headings, works out which
level marks a chapter, splits the book, counts the words, then builds:

- a cover
- a chapter opener for every chapter
- up to four quote cards, pulled from real blockquotes or the most quotable sentence it can find
- a square social card

Pick one of six themes first — each is a palette, a font pairing and its own cover layout — and
everything is generated in that look. Change your mind later and hit **Rebuild all graphics**.

**The Canva-ish half.** Everything it generated is a normal editable design. Click to select,
drag to move, corner handles to resize, the round handle above to rotate, double-click text to
retype it. Elements snap to the artboard's edges and centre and to each other; hold `Alt` while
dragging to ignore snapping. Shapes, colours, image uploads, layer order, alignment, undo and
redo are all in the toolbar and side panels.

## Layout

```
ebook-studio/
  index.html          markup for the three views: dashboard, design, book
  styles.css          the chrome, plus the print stylesheet at the bottom
  js/
    text.js           line breaking, shared by the screen and the exporter
    zip.js            a small ZIP reader and writer (.docx/.pptx in, .epub out)
    store.js          project state, IndexedDB persistence, undo history
    templates.js      themes, trim sizes, and the cover/opener recipes
    import.js         .docx / .md / .txt / .html -> chapters
    pptx.js           .pptx -> slides, notes, pictures
    diagrams.js       a slide's bullets -> a figure worth looking at
    learning.js       terms, gaps, questions, crossword, word search
    course.js         slides -> lessons -> parts -> a book with an answer key
    sampledeck.js     a real .pptx, assembled in the browser, for trying it out
    render.js         draws a design to DOM for editing, to canvas for export
    editor.js         select, drag, resize, rotate, type, restyle
    book.js           the reading preview and the hidden print sheet
    export.js         EPUB, single-file web page, PNG zip, project file
    app.js            wiring
  vercel.json         cache and security headers for deployment
```

## Running it

```bash
npx http-server ./ebook-studio -p 8124 -c-1
```

Then open <http://localhost:8124>. Chrome or Edge is the right browser to use — see the note on
requirements below. Double-clicking `index.html` also works, but serving it is better: some
browsers restrict IndexedDB on `file://`, and saved work would be lost between sessions.

There are two sample links on the dashboard — a slide deck and a manuscript — if you want to see
each flow before committing real work to it. The sample deck is not a stored file; it is a real
`.pptx` package built in the browser when you click, which is also how the deck parser is tested.

## Exports

| Format | What you get |
| --- | --- |
| PDF | Opens the print dialog with the trim size and page breaks already set. Choose "Save as PDF". Chapter artwork prints full bleed; the body text uses proper inside margins. |
| EPUB | A real EPUB 3 file with a cover, a navigation document and reflowable chapters. Loads in Kindle, Apple Books and Kobo. |
| Web page | One self-contained `.html` file, images included. Nothing else to upload. |
| Graphics | Every design as a 2× PNG in a zip — at 300 ppi for a 6 × 9 book. |
| Project file | The whole project as JSON, to back up or move to another machine. Reopen it from the same dialog. |

## Requirements

Chrome or Edge (or any recent Chromium browser). Three things are load-bearing:

- `DecompressionStream` / `CompressionStream`, used to unpack `.docx` and `.pptx` and to write
  `.epub`. Without them those features are disabled and the app says so; the rest still works.
- Named print pages (`@page fullbleed`), which is what lets cover artwork print edge to edge
  while body text keeps its margins. Firefox supports this from version 110.
- IndexedDB, which is where your project is saved.

## How it fits together

**One line-breaking engine, two renderers.** The editor draws text as DOM nodes and the exporter
draws it with Canvas2D. If each broke lines its own way, the PNG would not match the screen. Both
ask `text.js` where the lines go, so they agree exactly — including letter spacing and the
half-leading that decides where a baseline sits.

**No PDF library.** The PDF comes from the browser's own print engine, driven by a hidden sheet
in `printRoot` and a `@page` rule generated from the chosen trim size. That buys real font
rendering, real hyphenation and real widow control for free.

**Auto-fitting type.** Chapter titles vary from two words to fifteen. Every generated layout
reserves a box and shrinks the type until the text clears it, so a long title reflows instead of
running off the artboard.

## Things worth knowing before changing it

- **`Store.commit()` goes before a mutation, not after.** It snapshots the previous state so undo
  has something to return to. A drag that never moves is rolled back on pointer-up so a plain
  click does not fill the history.
- **Uploaded images are data URLs inside the project.** That is why persistence is IndexedDB
  rather than localStorage, and why a project with many photos makes for a large `.json` export.
- **Chapter openers are matched to chapters by order**, not by id. If you delete one opener, the
  rest shift up. Rebuilding puts them back in sync. Figures are different — a `figure` block holds
  the design's id, so editing a figure in the Design tab changes the book too.
- **Chapter detection picks the shallowest heading level that appears at least twice.** A document
  with one `#` title and several `##` sections gets the `#` as the book title. Plain `.txt` has no
  markup to read, so headings are guessed from short standalone lines that say "Chapter" or are
  written in capitals.
- **A deck's parts come from its section-header slides.** With fewer than two of those it falls
  back to fixed-size parts, which you can rename in the chapter list.
- **The file input lives outside the dropzone on purpose.** Nested inside, its own click bubbles
  back to the zone's handler and the picker gets asked for twice, which reads as a browse button
  that does nothing.
- **Nothing routes on the file extension.** `Importer.sniff` reads the magic bytes, then the zip's
  entry list, and looks for `ppt/`, `word/` or `xl/`. The extension only breaks ties between
  markdown, HTML and plain text.
- **The deck parser follows `_rels/.rels`** to find the presentation part rather than assuming
  `ppt/presentation.xml`, so packages laid out differently by other tools still open.
- **The parsed deck is kept in the project** so that changing the theme or the activity mix can
  rebuild from the original slides rather than from the book it produced last time.
- **The answer key is generated, not maintained.** Edit an activity by hand and the key behind it
  goes stale until the next rebuild.
- **The lesson heading is hidden, not missing.** Each figure already carries its title in type, so
  printing the heading again would just repeat it. The `h2` is still there for navigation and for
  the EPUB's table of contents, marked `.sr`.
