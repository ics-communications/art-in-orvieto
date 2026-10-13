# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: prospective participants in the ART in Orvieto summer program — practicing artists, K-12 art teachers, graduate students in art/theology/religion, and adult learners interested in the intersection of art, religion, and theology. They arrive from ICS communications (Substack, email, Perspective newsletter, poster runs, word of mouth), often on a first visit, deciding whether a three-week residency in Italy is for them and what it costs.

Secondary: people who already inquired by email and are sent the site link as the authoritative source of program details (the site must carry the same information staff would send individually).

## Product Purpose

The recruitment website for ART in Orvieto, an advanced summer studies program in Art, Religion, and Theology run by the Institute for Christian Studies (ICS), Toronto, an affiliate of the Toronto School of Theology. The site replaces an old multi-page Google Sites sub-site. Success = roughly 10 confirmed participants for the next cycle; the site is the primary public recruitment tool, ready before the public announcement in early fall.

## Positioning

A seminar-plus-studio residency housed in a renovated 13th-century Servite monastery in the hill town of Orvieto, Italy (space shared with Gordon College's Studio for Art, Faith, and History), with graduate credit available through ICS (MWS-ART) or the Toronto School of Theology. The combination of serious theological study, working studio practice, and the place itself is the claim no neighboring program can copy.

## Operating Context

- Program: ~3 weeks each summer (Summer 2027: July 18 – August 5; Seminar and Studio Residency begin Monday, July 19). Two components: the Graduate Seminar "Art, Religion, and Theology: Theologies of Art in the Christian Tradition" (led by Rebekah Smick) and the Artists' Studio Residency (led by David Holt). Credit or audit options; both-components applicants get admission priority.
- Excursions to Rome, Assisi, and Florence in weeks 1–2 are integral; everyone participates.
- Lodging and meals at the Convento Dei Servi (single/shared en-suite rooms; continental breakfast daily; communal lunch and dinner Mon–Sat).
- Application: on-site form (index.html #application + application.js) with the CAD $90 fee paid by PayPal (ICS's live PayPal app, shared with F2BF) before the application is sent; received by a Google Apps Script owned by ics-communications@ (_scripts/, setup in _scripts/SETUP.md) that verifies payment, saves a per-applicant Drive folder (uploads + PDF) and Sheet row, and emails the Registrar and haceroferrer@. Early Bird scholarship (8 × $500 Ruth and Inès Memorial Scholarship) and $500 financial-need grants exist.
- 2027 cycle (confirmed by Héctor Acero Ferrer, Director of Lifelong Learning, in "ART in Orvieto (Website Updates, 2027)", Oct 2026): Early Bird deadline Jan 31, final application + waitlist Mar 31, decisions by Apr 15, confirm by Apr 30, remaining fees by May 15, 2027. Fees: tuition $3,000 / $1,500 credit, $2,500 / $1,250 audit; shared room $2,700 ($150 × 18 nights), single $4,050 ($225 × 18, only three); application $90; registration $25 per course; excursion $2,200. Program questions go to haceroferrer@icscanada.edu.

## Capabilities and Constraints

- Static one-page site (anchor-navigated sections), hostable on GitHub Pages; no server or CMS of its own (the application form posts to the Apps Script above). Content edits happen directly in HTML by staff/maintainer.
- All fees in CAD. Cancellation policy, visa/ETIAS notes, and airfare/insurance exclusions are required legal/practical content.
- ICS contact block: 59 St. George Street, Toronto, ON M5S 2E6; 1-416-979-2331; toll free 1-888-326-5347; info@icscanada.edu; www.icscanada.edu.

## Brand Commitments

- Name styled "ART in Orvieto"; ART = Art, Religion, Theology.
- Binding palette (Palette.txt): background #FDFDFC, text #2D373C, headings #35596D, primary/links #6089A9, large sections #B0C4D4, warm sections #DADBC5, secondary/eyebrows #869B92 (or #668583), scarce accents only #C1AA5B (gold) and #A65A38 (rust).
- Binding typography: Futura, self-hosted from local families (Futura PT, Futura LT Pro, Tw Cen MT available in Futura-Font-main/).
- The old magenta/orange/teal wordmark is retired; identity re-expressed in the new palette.
- Parent institution attribution (Institute for Christian Studies / Toronto School of Theology) must remain visible.

## Evidence on Hand

- Full prior site copy in old/*.html (program description, seminar & residency descriptions, personnel bios, spaces, accommodation & meals, fees, application process, cancellation policy).
- Film: "Orvieto" (3:20), made by a past participant during a month in the town: https://www.youtube.com/watch?v=c9cxcmQOyDE (poster frame saved as assets/orvieto-film.jpg).
- Photos in old/*_files/: Orvieto Duomo facade, Orvieto streetscape (stone wall/flowers), monastery interior strip, meals strip, St. Patrick's Well interior (in old wordmark), leader headshots (Smick, Holt; McIntire was removed from the site for 2027).
- No testimonials, enrollment statistics, or press on hand — do not fabricate any.

## Product Principles

1. One link answers everything — an inquirer should never need a follow-up email for basic facts (components, credit options, lodging, fees, how to apply).
2. The place does the persuading — Orvieto, the monastery, and the excursions are the emotional core; lead with them honestly (real photos only).
3. Costs and commitments stated plainly — full CAD fee table, deadlines, exclusions, and cancellation terms, unhidden.
4. Editable by non-developers — dates and fees will change yearly; keep markup simple and clearly commented where TBA values live.
5. Scarce accents, airy ground — the palette's gold/rust stay rare; the site stays light and lets imagery carry richness.
