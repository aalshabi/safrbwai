# Review checklist and scoring

Each dimension lists what to check, the usual failures, and the basis of each check:
**[A]** Apple guidance (HIG / WWDC), **[W]** WCAG accessibility standard, **[P]** design practice.
Figures marked [A] come from Apple's published guidance at the time of writing; the HIG is a living
document, so if a number is decisive for the verdict, say it should be confirmed on the current HIG page.

## Scoring rubric (per dimension, /5)

- **5** — Exemplary; nothing to fix beyond refinement.
- **4** — Solid; only Low findings.
- **3** — Works, but Medium findings make it feel unfinished.
- **2** — A High finding weakens the page's job.
- **1** — A Critical finding blocks the job or excludes users.

Score only what you assessed. Do not average into an overall score unless asked; the verdict and the
top 3 fixes carry the summary.

---

## 1. Brand identity

Check:
- The brand is recognizable without the logo: a consistent color role, type voice, shape language and imagery style across pages. [P]
- One primary brand color used with restraint for emphasis and actions; neutrals carry the rest. [P]
- Tone of copy, imagery and UI match the audience and promise (a trust-focused brand should not look like a flash sale). [P]
- The identity holds in dark mode and on small screens. [P]

Common failures: brand color used for everything (so nothing stands out); different reds/blues across pages; stock imagery in mixed styles; a "premium" claim with cluttered execution.

## 2. Logo

Check:
- Expresses a single, simple idea that is recognized at a glance. [A]
- Holds up small: judge at 16, 32 and 64 px (favicon, tab, app icon). Thin lines, fine details and small text inside the mark disappear first; prefer bolder weights and rounder joins at small sizes. [A]
- Works in one color (black, white) and on light, dark and brand-colored backgrounds. [P]
- Has defined clear space and a minimum size; is not stretched, recolored or placed on busy imagery. [P]
- Wordmark: legible letterforms, deliberate spacing (kerning), and for bilingual brands, Arabic and Latin parts balanced in weight and height. [P]
- An app or touch icon (if any) is a square, full-bleed artwork without baked-in rounded corners or text, because the platform applies the mask. [A]
- For a website, the icon set is complete: a favicon (SVG or 32 px), an `apple-touch-icon` PNG at 180×180 (full-bleed square, no transparency — iOS does not use SVG for the Home Screen), and web-manifest PNGs at 192 and 512 px, including one with `purpose: "maskable"` whose artwork sits inside the central ~80% safe zone. [A][P]

Common failures: logo with a tagline inside it; detailed illustration that becomes a blob at 32 px; low-contrast mark on the header background; favicon that is a scaled-down full lockup.

## 3. Visual hierarchy

Check:
- In 5 seconds a newcomer can say what the page is and what to do next. [P]
- One primary action per view; secondary actions are visibly secondary (outline/text style). [A]
- Size, weight, color and position rank content in the order the user needs it; no two elements fight for first place. [A]
- Hierarchy is created by layout and grouping, not by decoration (badges, gradients, borders, shadows). [A]
- Above the fold on mobile, the headline and primary action are visible without scrolling. [P]

Common failures: two equal-weight CTAs side by side; every section heading the same size as the hero; decorative badges and icons beside every line.

## 4. Layout, alignment and spacing

Check:
- A consistent grid and content width; text columns, cards and images align to shared edges. [P]
- One spacing scale (e.g. multiples of 4 or 8 px) used consistently; related items closer together than unrelated ones (proximity shows grouping). [P]
- Generous, consistent margins; content respects device safe areas and does not touch screen edges on mobile. [A]
- Reading order and visual order agree; nothing important is hidden by sticky headers or banners. [P]
- Corner radii are consistent and concentric (an inner element's radius is the outer radius minus the padding). [A]
- Responsive behavior: no horizontal scroll at ~390 px; tap targets do not crowd. [P]

Common failures: uneven gaps between sections; cards of slightly different widths; centered and left-aligned text mixed in one block; nested rounded boxes with identical radii.

## 5. Typography

Check:
- One or two type families; a short, deliberate type scale (about 5–7 sizes). [P]
- Body text comfortable for reading on the web (≈16 px or more; Apple's own minimum for any text is 11 pt) with line height ≈1.4–1.7 and line length ≈45–75 characters. [A][P]
- Weight and size create the hierarchy; avoid ALL CAPS for long text and avoid many weights. [P]
- Text scales: the page still works at 200% zoom / larger text settings. [A][W]
- Numerals, prices and dates are consistent (one numeral system per context) and tabular where they line up in columns. [P]
- For the web, use the system font stack or the brand's licensed typeface; do not recommend SF Pro on non-Apple contexts. [A]

Common failures: body at 13–14 px; light (300) weights in small gray text; four different heading styles; very long line length on desktop.

## 6. Color and contrast

Check (measure with `scripts/contrast.py`):
- Body text against its background ≥ 4.5:1; large text (≥24 px, or ≥18.66 px bold) ≥ 3:1. [W] (Apple cites the same 4.5:1 minimum.) [A]
- Icons, input borders, focus indicators and other meaningful non-text elements ≥ 3:1. [W][A]
- Color is never the only signal (errors also have text/icons; links are distinguishable). [W][A]
- A small, purposeful palette: brand color for emphasis and actions, semantic colors (success, warning, error) used consistently. [P]
- Dark mode (if offered) is designed, not inverted: contrast re-checked, brand color adjusted. [A]
- Text over images has a scrim or solid backing so contrast does not depend on the photo. [P]

Common failures: gray-on-gray secondary text below 4.5:1; brand color text on a tinted background; placeholder text used as labels.

## 7. Controls and interaction

Check:
- Touch targets at least 44×44 pt (≈44×44 CSS px) even when the visible control is smaller. [A]
- Every interactive element has visible hover (desktop), pressed, focus and disabled states; focus is visible for keyboard users. [A][W]
- Controls look like what they do: buttons look tappable, links look like links, inputs have persistent labels. [A]
- Feedback is immediate: loading, success and error states are designed and written in plain language. [A]
- Standard patterns over custom ones (native select, standard checkbox) unless there is a strong reason. [A]

Common failures: icon buttons of 24 px with no padding; disabled-looking primary buttons; forms that only show errors after submission without saying which field.

## 8. Imagery and iconography

Check:
- One icon family with consistent stroke weight, corner style and size; icons express one idea each. [A]
- Icons that imply direction are mirrored in RTL; icons that do not (e.g. media play, clocks, checkmarks) are not. [A]
- Back navigation in RTL: the back control sits on the right edge and its arrow points right (→), because "back" follows the reading direction. Recommend semantic icons that mirror automatically (SF Symbols `chevron.backward`, not a fixed `chevron.left`; on the web, flip with `[dir="rtl"]` or logical CSS) rather than hard-coding a direction. [A]
- Images are relevant, high quality, consistently treated (color, crop, style) and support the content rather than decorate it. [P]
- Decorative visuals do not compete with the primary action. [A]

Common failures: mixing outline and filled icons; emoji used as icons next to an icon set; stock photos with inconsistent color grading.

## 9. Motion and depth

Check (only if motion is observable):
- Motion explains structure (where something came from, what changed) and is quick and interruptible. [A]
- Respects reduced-motion preferences. [A][W]
- Shadows, blur and layering are minimal and consistent; one elevation system. [A]
- Translucent/glass effects do not reduce text legibility; avoid stacking translucent layers on each other. [A]

Common failures: scroll-triggered animations that delay reading; heavy drop shadows on every card; parallax that hurts performance.

## 10. Accessibility, RTL and localization

Check:
- Images have meaningful alt text; decorative ones are hidden from assistive tech. [W][A]
- Logical heading order (one h1), landmarks, and a focus order that follows the visual order. [W]
- RTL pages: layout direction, alignment, icon mirroring, form fields, and mixed Arabic/Latin text (numbers, prices, URLs) render correctly; Latin fragments stay LTR inside Arabic sentences. [A][P]
- Arabic typography often needs a slightly larger size and more line height than Latin to read equally well; check diacritics and descenders are not clipped. [P]
- Language attribute and direction set correctly; translated strings fit without truncation. [W][P]

Common failures: a top bar built left-to-right in an Arabic page (back arrow and title on the left); arrows pointing the wrong way; prices like "SAR 2,000" flipping order or being repeated in two formats; Arabic body text at the same small size as the Latin design.

---

## Sources (for the user, when they ask where a rule comes from)

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- WWDC25 "Get to know the new design system" (hierarchy, harmony, consistency): https://developer.apple.com/videos/play/wwdc2025/356/
- HIG App icons: https://developer.apple.com/design/human-interface-guidelines/app-icons
- HIG Icons: https://developer.apple.com/design/human-interface-guidelines/icons
- App Store Connect, Sufficient Contrast criteria (4.5:1 for text, 3:1 non-text): https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
