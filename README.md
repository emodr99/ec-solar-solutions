# EC Solar Energy Solutions

The website for EC Solar Energy Solutions, a solar energy company serving Filipino homeowners.

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

- **The reviews section is photo-led.** The five job photos in `assets/jobs/` are real photos from
  Engr Emil Caina's posts, each matched to the post it came from, so every caption names the place
  that post named. **Do not move a photo to a different job.**
- **The customer electricity bills are deliberately not published.** The photos of them show the
  account holder's name, address and account number. If you ever want the savings proof on the
  site, the identifying fields have to be cropped or redacted first, and the customer has to agree.
- **The written quotes are still unverified.** Verify each name and figure before relying on them.
- **The calculator implements `solar_energy_potential_system.md`** (the Solar Energy Potential System spec).
  One chain drives everything, so the picture, the equipment list and the pesos cannot disagree:
  `consumption = bill ÷ RATE` (or the customer typed real kWh) → `kWp = daily × goal offset ÷ (PSH × EFF)`
  → rounded up to whole 550 W panels → `production = kWp × PSH × EFF × 30` → savings split into
  self-consumption at the full rate and export at the net-metering credit.
  Constants sit at the top of the calculator script: `RATE` ₱12.14/kWh, `PSH` 4.5, `EFF` 0.80,
  `PANEL_W` 550, `DOD` 0.80, `EXPORT_RATE` ₱6.50 **(needs confirming)**, `MAX_CUT` 0.90.
  The three goal buttons map to Options A, B and C in the spec (target offsets 0.85 / 1.00 / 1.15).
  **`MAX_CUT` exists on purpose:** part of a electricity bill is fixed charges, and the spec forbids
  promising a zero bill, so the displayed saving is held below the full amount.
- **The Recent installations section is evidence, not marketing.** Every row comes from a real
  post by Engr Emil Caina, logged in `docs/emil_caina_solar_posts.csv`. Dates are approximate
  because Facebook shows relative ages. **Do not add a row that is not backed by a real post.**
  The two photos there are frames from the drone footage of one installation, so no town is
  claimed for them.
- **The brownout answer in the FAQ is deliberately blunt.** A normal grid-tied system shuts off during a brownout for safety, and only a hybrid or off-grid system with a battery keeps a home running. Please keep that accurate.
- The lead form opens the visitor's email app addressed to the business. There is no backend.

## Contact

Phone: +63 994 025 7286
Email: ecsolarsolutions01@gmail.com

Last content update: About section added September 2026.
