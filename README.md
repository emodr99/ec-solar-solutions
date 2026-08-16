# EC Solar Solutions

The website for EC Solar Solutions, a solar energy company serving Filipino homeowners.

**Full Blast Energy, Zero Worries on Electric Bill**

## What this is

A single-page site built as plain HTML, CSS and vanilla JavaScript. No framework, no build step, no server code. You can open it, edit it, and put it online without installing anything.

The hero is a scroll-driven film: drone footage of a real EC Solar installation that plays forward as you scroll down and backward as you scroll up. It is tied to scroll position rather than a timer, so it moves exactly as fast as the visitor does.

## Layout

```
ec-solar-solutions/        the site itself, this is what gets deployed
  index.html               everything: markup, styles, script
  assets/
    hero-scrub.mp4         the scroll film, 2560x1440, watermark removed
    hero-poster.jpg        holds the first frame while the film streams in
    hero-end.jpg           the still hero shown on phones
    reveal.jpg             an installation photo used in the Residential section
    logo.png               the full logo, original file, untouched
    mark.png               the sun mark alone, for the header

design-package.md          the design decisions: palette, type, band map, copy
Brand/                     original brand artwork
Website Contents.docx      the source copy deck
.claude/launch.json        config for the local preview server
```

## Running it locally

Double-clicking `index.html` works, but you will see the still hero instead of the scrolling one. That is expected: browsers block the file loading the video when a page is opened directly from disk. The page is designed to look complete in that state.

For the real thing, serve the folder over HTTP:

```bash
npx http-server ./ec-solar-solutions -p 8123 -c-1
```

Then open <http://localhost:8123> in a browser. Chrome shows scroll roughness first, so it is the best one to check in.

## How the hero works

- The film is fetched as a Blob and played from memory. Many hosts do not support partial downloads, which makes every seek snap back to zero on a live site while working perfectly on a laptop. Loading the whole file avoids that entirely.
- It streams behind a progress ring, so the page is usable immediately and the poster holds the frame until the film arrives.
- Scroll position eases toward its target rather than jumping, and only one seek is ever in flight at a time. Seeks smaller than half a frame are skipped.
- **Phones never download the film.** They get a composed still instead. This is enforced in the CSS and the JavaScript with five matching conditions covering small screens, portrait tablets, touch devices, phones held sideways, and reduced-motion preferences.
- If the film never loads, the page is still complete over the poster.

## Things worth knowing before changing content

- **The reviews are real customer quotes.** Verify any new one, and the figures in it, before publishing.
- **The calculator is an estimate, not a quotation.** It divides the bill by ₱14.7833 per kWh and assumes 4.8 hours of strong sun a day. Every assumption is printed on the page. If the rate changes, it is the `RATE` constant in the script.
- **The brownout answer in the FAQ is deliberately blunt.** A normal grid-tied system shuts off during a brownout for safety, and only a hybrid or off-grid system with a battery keeps a home running. Please keep that accurate.
- The lead form opens the visitor's email app addressed to the business. There is no backend.

## Contact

Phone: +63 994 025 7286
Email: ecsolarsolutions01@gmail.com
