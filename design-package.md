# Design Package: EC Solar Solutions

Written before the build. Every line of copy here ships verbatim.

## 1. The brand premise

One word: **Araw**. The sun already lands on your roof every single day, for free, whether you catch it or not. The whole site teaches that one idea and sells it: the energy is already arriving, and the only question is whether your family keeps it or lets it go. Every section serves that. The hero is a descent from the sun down to a Filipino home, following the light. The Solar Journey section shows the light becoming current. The calculator asks the visitor what their roof is currently letting go. The closing line hands the sun back to them.

Positioning, from the client's own deck and kept verbatim: we do not sell solar panels, we help Filipino families take back control of their electricity.

## 2. The palette as CSS tokens

Sampled from the client's declared brand colors (dark green #0B4F43, gold #FFD700, orange #F28C28 / #FF4500) and from the world of the hero: a Philippine sky from first light to full day, seen from above a rooftop.

```css
:root{
  --canvas:#061713;        /* deep green-black, tinted toward the brand green, never pure black */
  --canvas-lift:#0A241D;   /* the next surface up */
  --panel:#0E3129;         /* cards and raised surfaces */
  --brand-green:#0B4F43;   /* the client's own dark green */
  --accent:#F28C28;        /* the CTA and rare emphasis */
  --accent-hover:#FF6B1A;
  --accent-muted:rgba(242,140,40,.22);
  --gold:#FFD700;          /* the current itself: traces, pulses, particles. whisper level */
  --gold-soft:rgba(255,215,0,.22);
  --text-primary:#F1F6F2;
  --text-secondary:#9FBAB0;
}
```

Deviation said out loud: a dark canvas with a warm accent is normally a banned default reach. Here the green, the gold and the orange are the client's own declared brand colors and they come from the logo, so committing to the subject's real world wins. The guard is that the canvas is green, not near-black, the display face is a grotesk and not a high-contrast serif, and the signature element below is unique to this brand.

## 3. The type trio

- **Display: Bricolage Grotesque**, weights 700 and 800. Real character, slightly irregular widths, holds a long Taglish headline at size.
- **Body: Instrument Sans**, weights 400 and 500.
- **Mono: IBM Plex Mono**, weight 500, for small labels, readouts and the calculator numbers. Its engineering register matches the circuit traces in the logo.

Never Inter, never Roboto.

## 4. The signature element

**The conductor.** One continuous hand-drawn SVG line, in the circuit-trace language of the client's own logo, that runs from the sun at the very top of the page all the way down to the footer. It draws itself as the visitor scrolls, and a gold pulse travels along it. Every section is physically attached to it. Remove it and the page becomes an ordinary stack of sections, which is the test of a real signature.

## 5. The band map (hero)

The hero is a pinned 420vh region holding a hand-built scroll-driven scene: a descent from the sun, down through the sky, onto a Philippine rooftop, into the panels, and down into a lit home. Scrolling down reads as going down, which is the first law.

| Band | Range | Scene moment | Copy (verbatim) | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.20 | High above. Pre-dawn sky, the sun low and hot, rooftops far below in silhouette. | Kicker: "Para sa mga pamilyang pagod nang kabahan sa bawat electricity bill" / Headline: "Pagod ka na bang kabahan tuwing dumarating ang electricity bill mo?" | Drift-down, word by word, echoing the descent |
| 2 | 0.24 to 0.46 | The camera falls. Light beams reach down through haze toward the roof. | "Imagine opening your next bill with relief instead of dread." | Blur to sharp, echoing haze clearing |
| 3 | 0.50 to 0.70 | Light lands on the panel array. Circuit traces ignite gold across the panels. | "Hindi lang ito tungkol sa solar panels. Tungkol ito sa perang puwedeng mapunta sa pamilya mo." | Scatter, echoing the traces igniting |
| 4 | 0.76 to 1.00 | Settle. Full daylight. The home below is lit and steady, current running in the conductor. | Headline: "Kunin ang araw na dumarating na sa bubong mo." / Subline: "EC Solar Solutions helps Filipino families take back control of their energy costs with a solar system designed around how your home actually uses electricity." / CTA: "See What Solar Could Do For My Home" / Secondary: "Panoorin Kung Paano Gumagana" | Word by word rise into a staged settle |

Ranges are starting points, validated by the flick test.

## 6. The static-hero copy block

For phones and reduced motion, over the composed settled scene:

- Kicker: "Para sa mga pamilyang pagod nang kabahan sa bawat electricity bill"
- Headline: "Pagod ka na bang kabahan tuwing dumarating ang electricity bill mo?"
- Subline: "Imagine opening your next bill with relief instead of dread. EC Solar Solutions helps Filipino families take back control of their energy costs."
- CTA: "See What Solar Could Do For My Home"
- Secondary: "Panoorin Kung Paano Gumagana"

## 7. The below-fold outline

Every section funnels to one call to action: **Get My FREE Solar Assessment**, anchored at `#assessment`.

1. **Why This Matters.** Four cards: Mas Kaunting Stress / Mas Maraming Control / Mas Tahimik na Isip / Mas Maayos na Future, with the client's verbatim lines.
2. **Dahil Alam Namin ang Feeling.** The empathy stage, verbatim, ending on the before and after: "Magkano na naman ang bill?" becomes "Magkano ang natipid namin ngayong buwan?"
3. **Ang Paglalakbay ng Solar Energy.** The six nodes on the conductor, lighting in sequence as the visitor scrolls: Sikat ng Araw, Solar Panels, Inverter, Your Home, Battery (optional), Grid. Accuracy note honored: the battery node says storage depends on the system, and no node promises blackout protection.
4. **Imagine Your Home With Solar.** The possibility stage, verbatim, into the mid-page CTA.
5. **Trust marquee.** Libreng Site Assessment, Professional Installation, Warranty Support, Flexible Financing, After-Sales Support. Financing carries the client's own asterisk.
6. **Solusyon Para sa Bawat Tahanan.** Residential and Commercial, two cards, equal treatment.
7. **You Don't Have to Figure Solar Out Alone.** The guide positioning, with the real logo shown once on a light plate.
8. **The interactive moment: the Solar Potential Calculator.** A draggable monthly-bill dial. As the visitor drags, the sun above it climbs and the estimate builds. It enacts the premise: it shows what the roof is currently letting go. Every assumption is printed on screen. No system price is quoted, because the client has not given one. Reduced motion gets the final state with no dragging required.
9. **FAQ.** The client's ten real objections, answered honestly and generally, each one ending in what the free assessment confirms for their specific home. The brownout answer states plainly that an on-grid system shuts off during a brownout for safety and only a hybrid or off-grid system with a battery keeps power.
10. **Apat na Simpleng Hakbang.** Discover, Design, Install, Support, verbatim.
11. **The offer and the lead form.** "What Would You Do With the Money You Could Save?" into the form.
12. **The community moment and footer.** "Welcome to a Smarter Energy Future." Contact details verbatim: +63 994 025 7286, ecsolarsolutions01@gmail.com, Pilipinas.

**Proof, and what is deliberately absent.** The named testimonials in the client's document are marked unverified in that document. They do not ship. In their place the proof section carries what is verifiably the client's own (free assessment, professional installation, warranty support, after-sales support) and holds a clearly designed empty slot for real customer stories once permission is obtained.

**Form microcopy.** Labels: Buong Pangalan, Mobile Number, Email Address, City / Location, Average Monthly Electricity Bill, Property Type, Message / Question (Optional). Button: "See My Solar Potential". Microcopy: "We'll use your information to prepare your assessment and contact you about your solar inquiry." Handling: mailto to ecsolarsolutions01@gmail.com, because this is a real business taking real leads and a mailto needs no third-party account. The success state says plainly that the visitor's email app opens with the message ready, and the phone number sits right beside it as the faster route.

## 8. The vector layer plan

- The conductor: one long self-drawing SVG path down the whole page, gold pulse travelling on it, `stroke-dasharray` driven by scroll.
- The sun mark: the client's logo redrawn as inline SVG, used in the nav, as the favicon, and as the node markers in the Solar Journey.
- The hero scene: sky gradient, sun disc with corona, layered haze bands, rooftop silhouettes, panel array with igniting traces, and a lit home. All SVG plus one canvas particle layer at whisper level.
- Fixed background environment: one slow gold drift behind everything, cycling at 90 seconds.
- All of it honors reduced motion: final states shown, drives stopped.

## 9. The engineering list

The dt-normalized lerp on a rAF loop that rests, delta-gated DOM writes, band pacing validated by the flick test, the four-layer legibility system over the hero scene, the five static-hero gates kept live with change listeners, complete without any single asset, `overflow-x: clip` on html and body, reduced motion honored live in both directions, and the whole quality floor in `scrub-pipeline.md`. No video in this build, so the Blob loader and the seek gate are not needed; the scene is driven directly from scroll progress and every other rule stands.

## 10. The copy gate line

Every viewer-facing line above ships verbatim. The built page must pass the grep gate before anyone sees it: zero em dashes, zero stock words, plus the body-copy sweep for AI tells.
