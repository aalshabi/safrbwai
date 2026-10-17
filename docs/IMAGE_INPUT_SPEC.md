# Image offer input — specification

## Status

- Product Owner decision (2026-10-17): enable PDF and image input, with images read **on the user's device**. Server-side vision models were considered and not chosen.
- Capability `imageInput`: `enabled`.

## Design

Same principle as PDF (docs/PDF_INPUT_SPEC.md): the file never leaves the device, the user reviews the extracted text, and only the confirmed text goes to the existing text analysis.

```text
User picks a PNG, JPG or WEBP (existing file field: type check, 10 MB)
  -> browser decodes it (createImageBitmap, EXIF orientation applied)
  -> refuse above 40 megapixels; scale the longest side down to 3000 px
  -> OCR in a tesseract.js worker, models served from this site (/ocr)
  -> pass 1: Arabic+English; pass 2 (mostly Arabic image only): Arabic-only, sparse-text mode
  -> words merged by position, lines rebuilt in logical order
  -> negation repair, normalization, length and confidence checks
  -> text moves to the text field with a review notice
  -> user corrects and confirms -> existing text analysis (POST /api/offer/analyze, type "text")
```

Code: `src/lib/offer-input/image-text.ts` (pure checks, merge, layout, repair), `ocr-passes.ts` (the two-pass sequence), `read-image-offer-text.ts` (browser reader, time limit), `scripts/copy-ocr-assets.mjs` (copies the engine and models into `public/ocr` before `dev` and `build`; not committed).

## Why two passes

Measured on offer screenshots: reading Arabic and English together, the engine sometimes takes an Arabic word beside Latin text for a Latin one («ليالٍ» → «Ju», «شامل» → «Joli») and can skip a one-word line («لشخصين»). Arabic alone reads those correctly but garbles Latin hotel names. The merge keeps the Arabic+English reading and, by position, replaces a Latin word on a line with Arabic only when the Arabic-only reading of that spot is confidently Arabic (≥ 70), and adds confident (≥ 80) Arabic words the first pass missed. English images skip the second pass.

## Negation repair

The engine sometimes reads «لا» as «لاا» or drops the space in «لاتشمل» / «غيرشامل». The analysis then misses the negation and reports flights or taxes as **included**. `repairOcrNegations` fixes exactly these patterns (not «لايت», «لايف»). The review notice asks the user to check numbers, prices and negations.

## Refusals

| Condition | Message (ar) |
| --- | --- |
| Not PNG/JPG/WEBP or over 10 MB | Existing file-field error |
| Over 40 megapixels | «أبعاد الصورة كبيرة جدًا…» |
| Under 20 characters read | «لم نجد في الصورة نصًا كافيًا للقراءة…» |
| Mean confidence under 45 | «الصورة غير واضحة بما يكفي…» |
| Over 15,000 characters | «نص الصورة أطول من الحد المسموح…» (never truncated) |
| Decode error, engine error, or 90 s time limit | «تعذّرت قراءة الصورة…» (worker terminated) |

## Privacy and security

- No request carries the image. The engine (`worker.min.js`, WebAssembly core) and the Arabic/English models load from `/ocr` on this site; no CDN.
- `cacheMethod: "none"`: nothing is written to browser storage; the model files rely on the HTTP cache.
- CSP adds `'wasm-unsafe-eval'` to `script-src` so WebAssembly can compile; JavaScript `eval` stays disallowed.
- Dependencies pinned: `tesseract.js@7.0.0`, `tesseract.js-core@7.0.0` (Apache-2.0), `@tesseract.js-data/ara@1.0.0`, `@tesseract.js-data/eng@1.0.0` (MIT; `4.0.0_best_int` models).
- First use downloads about 7.5 MB (engine ≈ 2.9 MB compressed, models 4.6 MB). The page bundle grows by about 2 kB; the engine loads only when an image is chosen.

## Verification (2026-10-17)

Production build, Chromium, 390 px. Synthetic chat-bubble screenshots of offers:

| Image | Character error rate | Analysis facts equal to the source text |
| --- | --- | --- |
| Arabic, 3× | 0 | 9/9 |
| Arabic, 1× | 0 | 9/9 |
| Arabic, 2×, light and dark | 0.6% | 8/8 |
| Arabic paragraph wrapped across lines with Latin names | ≈ 10% (Latin names at line wraps) | 8/8 |
| Arabic, JPEG quality 45 | 7.5% | 7/9 (two facts missing, none inverted) |
| English, 2× | 0 | 8/8 |

- Before the merge and repair, the Arabic error rate on the first image was 23%, and two images inverted an exclusion (flights, taxes).
- Every OCR request was to `/ocr/` on the site; no third-party request; no CSP violation; no analysis request before confirmation.
- About 1–2.5 s per image after the first load.
- `src/lib/offer-input/image-ocr.corpus.test.ts` runs the real engine in Node on four committed screenshots and requires the same analysis facts as the source text. It fails if the negation repair is removed.

## Limits

- Photos of printed paper, handwriting, heavy compression and small text read worse; the review step is mandatory.
- The analysis result does not claim the image was verified.
