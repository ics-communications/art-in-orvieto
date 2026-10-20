---
target: 11x17 and letter posters
total_score: 25
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/workspace/transferportal/Github/art-in-orvieto/Perspective-F26/poster.html"
target_fingerprint: "sha256:2e31be554572d67b5a2c983650df6dea0f88803bb13847c67488645ce95fcbbc"
target_path: /workspace/transferportal/Github/art-in-orvieto/Perspective-F26/poster.html
timestamp: 2026-10-13T14-51-02Z
slug: perspective-f26-poster-html
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Deadlines in rust read as urgent |
| 2 | Match real world | 3 | "In residence" slightly insider; ART expansion small |
| 3 | User control | 3 | QR + typeable URL |
| 4 | Consistency | 4 | Matches back cover and site tokens exactly |
| 5 | Error prevention | 3 | Long hyphenated URL; QR backs it up |
| 6 | Recognition | 3 | URL largest element in lower half |
| 7 | Flexibility | n/a | static print |
| 8 | Aesthetic/minimal | 3 | Calm; painting under-used |
| 9 | Error recovery | 3 | URL fallback for QR |
| 10 | Help | n/a | persuasive poster |
| Total | | 25/32 | Good |

## Specificity
Authored: arch rhymes with the painting's domed niches; site lockup, cross-flory, rubric/gold kalendarium. Detector: 0 findings (CLI and in-page overlay, both sizes, both variants). No overflow; .url single line; all text >= 23.5 CSS px; QR quiet zone >= 4.6 modules.

## Priority issues
- [P1] Restacked painting repeats visibly in tabloid side strips (same cells at ~30% and ~80% height); lower strips skew brown/black. Fix: mirror or offset the third band; pull bluer rows lower.
- [P1] Painting reduced to wallpaper: 1.2 in / 0.95 in strips halve the domes; letter top band only 0.95 in. Fix: narrow arch (tabloid 1180px) and/or raise letter --arch-top to ~200px with a 700px text column.
- [P2] Hook arrives late at hallway distance: Art · Religion · Theology is 15.8pt on tabloid. Fix: .wm-expansion 26–28px.
- [P2] Letter standard: ~1 in gap between wordmark and season rule from margin-block:auto. Fix: cap the gap, send spare space to the foot / bigger QR.
- [P3] Gold hairlines at 70% alpha may vanish on office lasers. Fix: full-opacity gold in print. (Bleed: done in this run.)

## Minor
Standard-variant QR rule is dead on tabloid (214px wins). ICS logo small (0.4 in) on tabloid. Cities tracking 0.22em vs season 0.24em.

## Personas
Art teacher at 2–3 m: gets ART in ORVIETO Summer 2027, not who/what/cost. Grad student: QR scans fine; theology angle only in small expansion line. Office printing letter: margins clip strips unevenly, gold fades.
