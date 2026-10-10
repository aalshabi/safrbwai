# PDF offer input — specification

## Status

- Decision status: **proposed**. Awaiting Product Owner decisions (see "Decisions required").
- Capability: `pdfInput` stays `disabled` until the activation gates below pass.
- This document does not authorize implementation, a new dependency, a deployment, or enabling the capability.

## Problem

Travellers often receive an offer as a PDF (agency quotation, package brochure, booking summary). Today the offer analyzer accepts pasted text only, and the PDF tab is marked "قريبًا". Retyping or copy-pasting from a PDF is slow, and copying from a PDF viewer on a phone often loses lines or reverses Arabic word order.

## Current state (verified 2026-10-10)

- The UI already has a PDF tab and a shared file field (`src/components/offer-input/offer-file-field.tsx`). It accepts `.pdf` / `application/pdf` up to 10 MB (`OFFER_LIMITS.fileMaxBytes`) and uploads nothing.
- The pipeline has a ready seam:
  - `RawOfferSource` already has a `{ type: "pdf"; file }` member;
  - the extractor registry maps `pdf` to an inert placeholder that returns `unsupported`;
  - the API refuses disabled sources with `501 SOURCE_NOT_SUPPORTED` before reading the payload.
- The API accepts JSON only, with a 100 KB body cap and a 15,000-character text limit.
- No PDF parsing library is installed.

## Recommended design: extract in the browser, review, then analyze as text

```text
User picks a PDF
  -> browser checks type and size (existing file field)
  -> browser extracts the text layer locally (pdf.js-based library, lazy-loaded)
  -> extracted text is normalized and shown in an editable review box
  -> user confirms or corrects the text
  -> existing text analysis runs unchanged (POST /api/offer/analyze, type "text")
```

Why this design:

1. **The file never leaves the device.** No upload endpoint, no server-side parsing of untrusted binaries, no change to request limits, and no new data transfer to disclose.
2. **The attack surface stays small.** A malicious PDF is parsed in the user's own browser sandbox, by a library that runs with script evaluation disabled. The server still receives plain text, exactly as today.
3. **Evidence integrity is preserved.** Every extracted fact quotes the text the user confirmed. Arabic PDFs often encode text in visual order or with presentation forms, and a silent extraction error could flip a fact. The review step lets the user see and fix the text before any fact is shown.
4. **No pipeline change.** Rules, analysis, the integrity gate and the regression suite apply unchanged.

### Alternative considered: server-side extraction

The browser would send the file (multipart or base64) to the server, which would parse it and run the pipeline. This was rejected for the first release:

- It needs a new upload contract and a body limit about 100 times larger.
- It needs server-side hardening against hostile PDFs (memory, CPU, decompression bombs) and a privacy disclosure for file transfer.
- It still needs the same review step for Arabic text order.

It can be reconsidered if a later phase needs server-side features.

## Library

Recommended: **`unpdf`**, a pdf.js distribution packaged for serverless and browser use (`extractText`, `getDocumentProxy`).

- Use it client-side only, loaded with a dynamic `import()` when the PDF tab is used, so the default page bundle does not grow.
- Pass `isEvalSupported: false`. Disable any remote loading of fonts or CMaps, or bundle the needed resources locally, so extraction makes no network request.
- Pin an exact version that is at least two weeks old, record it here, and re-check its license and security advisories before adding it.
- Verification before adoption: a proof of concept on the synthetic corpus below, measuring bundle cost, extraction quality and time.

## Scope

In scope:

- One PDF per analysis, up to 10 MB (the existing limit) and up to **20 pages**.
- The PDF's embedded text layer, in Arabic and English.
- Normalization:
  - Unicode NFKC, so Arabic presentation forms become base letters;
  - collapsing duplicated whitespace;
  - preserving line breaks between text blocks;
  - converting Arabic-Indic digits only where the text rules already accept them.
- An editable review box showing the extracted text, with the same 20–15,000 character bounds as pasted text.
- Clear refusal states (below), in Arabic and English.

Out of scope:

- Scanned or image-only PDFs (OCR).
- Password-protected or encrypted PDFs.
- Forms, annotations, attachments, embedded links, and images inside the PDF.
- Multiple files.
- Uploading or storing the file or its text.
- Server-side parsing.

## Behavior and refusal states

| Condition | Behavior |
| --- | --- |
| Not a PDF, or over 10 MB | Existing file-field error; nothing is read. |
| More than 20 pages | Refuse before extraction: «الملف أطول من 20 صفحة. انسخ جزء العرض فقط والصقه.» |
| Encrypted or password-protected | Refuse: «الملف محمي بكلمة مرور ولا يمكن قراءته.» |
| No text layer, or fewer than 20 characters after normalization | Refuse: «لا يحتوي الملف على نص قابل للقراءة (قد يكون صورة ممسوحة). الصق نص العرض بدلًا من ذلك.» Never guess and never run OCR. |
| More than 15,000 characters after normalization | Refuse with a request to paste only the offer part. **Never truncate silently**: truncation can drop an exclusion such as «غير شامل الطيران». |
| Parsing error or timeout (5 seconds) | Generic safe error; nothing is analyzed. |
| Success | The text appears in the review box. Analysis runs only after the user presses "Analyze". |

The UI labels the text "نص مستخرج من الملف — راجعه قبل التحليل" / "Text extracted from the file — review it before analysis". The result screen does not claim the PDF itself was verified.

## Privacy and security

- No network request carries the file. Only the confirmed text is sent, exactly as with pasted text.
- Nothing is stored or logged. The object URL and buffers are released after extraction.
- Privacy and Terms copy: one sentence noting that a PDF is read on the user's device and only its text is analyzed. This needs Product Owner approval.
- Security review checklist before activation:
  - script evaluation disabled;
  - no remote font or CMap fetch;
  - the page and size caps enforced before full parsing;
  - extraction runs off the main thread or with a time limit so a hostile file cannot freeze the page;
  - the dependency is pinned and audited.

## Implementation outline

1. Add the pinned dependency with a lazy loader in `src/lib/offer-input/pdf-text.ts`. It returns either `{ ok: true, text, pages }` or a typed refusal (`too_many_pages`, `encrypted`, `no_text`, `too_long`, `failed`).
2. Normalization in a pure, unit-tested function shared with the text path.
3. PDF tab: after a file is chosen, show extraction progress, then the review box, which reuses the text input component. Show the refusal states above.
4. Submit as `type: "text"`. The `pdf` registry entry stays a placeholder because the server never sees a PDF. The capability flag `pdfInput` controls the tab's availability.
5. Update the capability registry status and the «قريبًا» badge only at activation.

## Tests and acceptance

Synthetic corpus, committed as small fixtures:

- an Arabic PDF and an English PDF exported from a word processor;
- a mixed Arabic and English PDF;
- one with Arabic presentation forms;
- an image-only PDF;
- an encrypted PDF;
- a 21-page PDF;
- one whose text exceeds 15,000 characters;
- a malformed or truncated file.

Acceptance:

1. Arabic and English text-layer PDFs produce text that, after the review step, yields the same facts as pasting the same text.
2. Image-only, encrypted, oversized, over-long and malformed files each show their refusal state, and no request is sent to `/api/offer/analyze`.
3. No silent truncation: the over-long fixture is refused, not cut.
4. The file is never sent over the network; the only analysis request is the existing text request.
5. Extraction makes no third-party network request (font or CMap fetching disabled or bundled).
6. Default page bundle size is unchanged until the PDF tab is used.
7. Review box, progress and refusal states pass the RTL/LTR, keyboard, screen-reader, 390 px, 1440 px, light and dark review.
8. Lint, typecheck, full tests, regression suite and production build pass.

## Activation gates

- [ ] Product Owner approves the browser-side design and the review step.
- [ ] Dependency chosen, pinned, license and advisories checked; proof of concept results recorded here.
- [ ] Security review checklist passed.
- [ ] Privacy and Terms sentence approved.
- [ ] Acceptance criteria verified on a Preview deployment.
- [ ] Separate, explicit decision to enable `pdfInput` in Production.

## Decisions required

1. Approve extraction in the browser with a mandatory review step (recommended), or request server-side extraction.
2. Approve the page cap of 20 pages.
3. Approve refusing, not truncating, text over 15,000 characters.
4. Approve proceeding with a proof of concept using `unpdf` before committing to it.

Image and URL input are not covered here. Image input needs OCR and an external or on-device model. URL input needs server-side fetching with SSRF protection. Each needs its own specification.
