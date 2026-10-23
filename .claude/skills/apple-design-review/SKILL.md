---
name: apple-design-review
description: Reviews a website's or product's brand identity, logo, visual design and element layout against Apple's design principles (Human Interface Guidelines — hierarchy, harmony, consistency, clarity) and returns a prioritized, evidence-based report with concrete fixes. Use this skill whenever the user wants a design critique, UI/UX review, brand or logo evaluation, layout or spacing audit, "make it look like Apple" / "Apple-level polish", or asks whether a page, screenshot, mockup, landing page, homepage, Figma export, logo file or CSS looks professional — in any language, e.g. «راجع التصميم»، «قيّم الشعار»، «الهوية البصرية»، «ترتيب العناصر»، «هل الموقع احترافي؟»، «وفق مبادئ آبل». Works for any site, any brand, LTR or RTL, from a URL, screenshots, image files or code.
---

# Apple-principles design review

Review identity, logo, visual design and layout the way an Apple design reviewer would: start from what the person must understand or do, judge every element by whether it helps that, and remove or demote what competes. The output is a decision document, not a mood board: what is wrong, the evidence, why it matters, and the smallest fix.

## The principles you are judging against

Apple's current guidance (WWDC25 design system and the Human Interface Guidelines) organizes design around three principles; older HIG editions add clarity, deference and depth. Use them as the lens for every finding:

- **Hierarchy** — the most important content and the one primary action are unmistakable; hierarchy comes from layout, grouping, size and weight, not from decoration.
- **Harmony** — shapes, type, color, imagery and motion feel like one family; custom elements fit the system around them (concentric corner radii, consistent stroke weights, one icon style).
- **Consistency** — the same thing looks and behaves the same everywhere; standard patterns over novel ones, because they carry learned behavior and accessibility.
- **Clarity** — legible text at every size, precise icons, generous whitespace, nothing ambiguous.
- **Deference** — the interface steps back so content leads; chrome, gradients, shadows and effects are minimal and purposeful.
- **Depth** — layers and motion explain structure (what is on top, where something came from), never decorate.

Apple's guidance is a reference, not a law for websites. Label each finding's basis so the user can weigh it: **Apple guidance** (stated in the HIG/WWDC), **Accessibility standard** (WCAG), or **Design practice** (widely accepted craft, not an Apple rule). Never present taste as a rule.

## Workflow

### 1. Establish the context (briefly)

Infer from the request and materials; ask only if a missing answer would change the verdict:
- What is being reviewed (whole site, one page, logo, a component) and its **one job** (e.g. "get a visitor to paste a travel offer").
- Audience and language direction (LTR/RTL).
- Brand constraints that are fixed (existing logo, colors) versus open to change.

State your assumptions in one line at the top of the report.

### 2. Gather evidence before judging

Judge only what you can see or measure. Prefer, in order:
- **A URL and a browser tool**: capture the page at desktop (~1440px) and mobile (~390px) widths, above the fold and full page, light and dark mode if supported. Inspect computed styles for colors, font sizes, spacing and target sizes.
- **Screenshots/images**: read them directly; note the viewport if known.
- **Code (HTML/CSS/Tailwind/tokens)**: read the design tokens, type scale, spacing scale and component styles; this gives exact values.
- **Logo files (SVG/PNG)**: view at large size, then judge at 16, 32 and 64 px, on light and dark backgrounds, and in one color. If you can render, render those sizes; if you cannot, say the small-size judgment is visual estimation.

Measure contrast with the bundled script instead of guessing:

```bash
python <skill-dir>/scripts/contrast.py "#5a6478" "#ffffff"
python <skill-dir>/scripts/contrast.py "#e8401e/#f5f1e8" "#ffffff/#0a1628"
```

When a value is estimated from a screenshot (a color picked from pixels, a size judged by eye), mark it "≈" and say so. Never invent a measurement.

**Count, don't estimate.** Any number you state about the material (words in a headline, characters per line, number of fonts, colors, buttons or badges) must be counted from the source, not recalled from a skim. For text in code, count it with a one-line script (`python3 -c "print(len('''...'''.split()))"`); for text in an image, count the words you transcribed. A wrong count in an otherwise correct review costs the reviewer's credibility.

**One unit per medium, stated once.** Use CSS px for websites and pt for native iOS/macOS; Apple's 44×44 pt hit target corresponds to about 44×44 CSS px on the web. For screenshots, state the device scale once (e.g. "390 pt wide at @2x") and convert every measurement the same way; never give the same value in px in one place and pt in another (16 px at @2x is 8 pt, not 16 pt).

### 3. Review across the dimensions

Work through the dimensions in `references/checklist.md` (read it now if you have not). Cover all that apply to the material; skip the rest explicitly ("Motion: not assessable from static screenshots"). The dimensions:

1. Brand identity
2. Logo
3. Visual hierarchy
4. Layout, alignment and spacing
5. Typography
6. Color and contrast
7. Controls and interaction
8. Imagery and iconography
9. Motion and depth
10. Accessibility and RTL/localization

### 4. Rate severity and confidence

- **Critical** — blocks the page's one job or excludes users (primary action invisible or unreadable, contrast far below 3:1 on key text, layout broken on mobile).
- **High** — clearly weakens comprehension, trust or conversion (competing primary actions, logo illegible at favicon size, inconsistent brand color).
- **Medium** — noticeable lack of polish (uneven spacing, mixed icon styles, too many type sizes).
- **Low** — refinement (optical alignment, minor radius mismatch).

Confidence: **Measured** (computed value or script), **Observed** (clearly visible), **Inferred** (likely, but needs a check). Do not mark something Measured unless you measured it.

### 5. Write the report

Write in the user's language (Arabic for an Arabic request, with Latin terms such as CSS values kept LTR). Use this structure:

```
# Design review: <what was reviewed>
Assumptions: <one line — job of the page, audience, direction, what was available>

## Verdict
<2–3 sentences: overall level, the single biggest problem, the single biggest strength>

## Top 3 fixes (highest impact first)
1. <fix> — <why, in user terms> — <effort: S/M/L>
2. …
3. …

## Scorecard
| Dimension | Score /5 | One-line reason |
(only dimensions you assessed; scoring rubric in references/checklist.md)

## Findings
### <Dimension>
- **[Severity · Confidence · Basis]** <what is wrong> — Evidence: <screenshot area / selector / value> — Fix: <specific change, with values where possible>

## What already works
<3–5 concrete strengths to keep; reviews that only criticize get ignored>

## Not assessed
<what you could not judge and what would let you>
```

Keep fixes specific and minimal: "Raise body text from 14px to 16px and line-height to 1.6" beats "improve typography". Prefer removing and demoting over adding. When a fix touches the logo or brand colors, offer it as an option with its trade-off, because those are the owner's decision.

#### Short report (when the user asks for brevity)

If the user asks for a short, quick or summary review («مختصر»، «باختصار»، «سريع», "quick", "brief", "TL;DR"), honour it: length is part of the request, and a long report the user asked to be short goes unread. Use this format instead, about one screen (roughly 250–350 words):

```
# <what was reviewed> — <one-line verdict>
Assumptions: <one line>

## Fix first
1. <fix> — <evidence in a few words> — <effort>
… (3 to 5 items, highest impact first)

## Other findings
| Severity | Finding | Fix |
(at most 8 rows, one line each)

Kept: <the 1–2 strengths worth keeping, one line>
Not assessed: <one line>
```

Drop the scorecard and long evidence in this mode; keep the measurements that justify the top fixes. Offer the full report in one closing line.

Even in the full format, say each finding once: do not repeat a top fix in full again under Findings — refer to it ("see Fix 1") and add only what is new.

## Judgment guidelines

- **Start from the one job.** Count how many elements compete for attention above the fold. Apple-quality pages usually have one headline, one supporting line, one primary action and one visual. More is the most common failure.
- **Whitespace is structure, not emptiness.** Crowding is a hierarchy problem; recommend removing content before shrinking it.
- **Consistency beats novelty.** Three button styles, four radii or two icon families signal a missing system. Recommend a token (one radius scale, one spacing scale, one icon set) rather than fixing instances.
- **Do not recommend copying Apple's look.** The goal is the principles, not SF Pro, frosted glass or Apple-style product shots. SF Pro is licensed for Apple-platform UI, so for the web recommend the system font stack (`-apple-system, system-ui, …`) or the brand's own typeface. Liquid Glass-style translucency on a website usually hurts legibility; mention it only if the site already uses it.
- **Respect the brand.** A warm, playful brand can follow these principles without becoming minimal and grey. Critique execution, not personality, unless the identity itself fails its audience.
- **RTL is not mirrored LTR by accident.** For Arabic/Hebrew sites check that layout, icons with direction (arrows, back), progress and number formatting are deliberate, and that Arabic type has adequate size and line height (Arabic often needs a slightly larger size and more line height than Latin to read equally well).
- **Be honest about limits.** A static screenshot cannot show hover, focus, motion or responsive behavior; say so rather than guessing.
