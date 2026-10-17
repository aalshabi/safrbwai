/**
 * Copies the on-device OCR assets (tesseract.js worker, WebAssembly core and
 * the Arabic and English models) into public/ocr, so image reading loads them
 * from this site only, never from a CDN. Runs before `dev` and `build`.
 * The copied files are generated and not committed (see .gitignore).
 */

import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const out = join(process.cwd(), "public", "ocr");

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "core"), { recursive: true });
mkdirSync(join(out, "lang"), { recursive: true });

copyFileSync(join(pkgDir("tesseract.js"), "dist", "worker.min.js"), join(out, "worker.min.js"));

// Only the LSTM builds are used (OEM.LSTM_ONLY); the worker picks the one the
// browser supports (plain, SIMD or relaxed SIMD).
const core = pkgDir("tesseract.js-core");
const lstm = readdirSync(core).filter((f) => /^tesseract-core(-simd|-relaxedsimd)?-lstm\.wasm\.js$/.test(f));
if (lstm.length !== 3) throw new Error(`expected 3 LSTM core builds, found ${lstm.join(", ")}`);
for (const f of lstm) copyFileSync(join(core, f), join(out, "core", f));

// "best_int" models: better accuracy than "fast" at a similar size.
for (const lang of ["ara", "eng"]) {
  copyFileSync(
    join(pkgDir(`@tesseract.js-data/${lang}`), "4.0.0_best_int", `${lang}.traineddata.gz`),
    join(out, "lang", `${lang}.traineddata.gz`)
  );
}

console.log(`[ocr] assets copied to public/ocr (${lstm.length} core builds, ara + eng)`);
