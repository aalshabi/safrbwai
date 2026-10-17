/**
 * Turns a fetched offer page into reviewable text. Scripts, styles, forms and
 * hidden content are dropped; navigation, header, footer and asides are
 * dropped when the page has a <main> or <article> with real content. The
 * title and meta description lead the text, since some offer pages put the
 * deal there. No script is ever executed: this is a plain text pass.
 */

import { Parser } from "htmlparser2";

const SKIP = new Set(["script", "style", "noscript", "template", "svg", "iframe", "object", "canvas", "select", "option", "button", "form"]);
const CHROME = new Set(["nav", "header", "footer", "aside"]);
const BLOCK = new Set([
  "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt", "figcaption", "figure", "footer", "h1",
  "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table", "td", "th",
  "tr", "ul",
]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

export interface PageText {
  title: string;
  description: string;
  text: string;
}

interface Collected {
  title: string;
  description: string;
  all: string;
  main: string;
}

function collect(html: string): Collected {
  let title = "";
  let description = "";
  let all = "";
  let main = "";
  // Each open element remembers what it switched on, so closing it (even
  // implicitly, for unclosed children) switches exactly that back off.
  const stack: { name: string; skip: boolean; chrome: boolean; main: boolean }[] = [];
  let skipDepth = 0;
  let chromeDepth = 0;
  let mainDepth = 0;
  let inTitle = false;

  const newline = () => {
    if (skipDepth > 0) return;
    all += "\n";
    if (mainDepth > 0) main += "\n";
  };

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (name === "meta") {
          const key = (attrs.name ?? attrs.property ?? "").toLowerCase();
          if (!description && (key === "description" || key === "og:description")) description = attrs.content ?? "";
          if (!title && key === "og:title") title = attrs.content ?? "";
          return;
        }
        if (VOID.has(name)) {
          if (name === "br" || name === "hr") newline();
          return;
        }
        const hidden =
          "hidden" in attrs || attrs["aria-hidden"] === "true" || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(attrs.style ?? "");
        const entry = {
          name,
          skip: SKIP.has(name) || name === "head" || hidden,
          chrome: CHROME.has(name),
          main: name === "main" || name === "article",
        };
        stack.push(entry);
        if (name === "title") inTitle = true;
        if (entry.skip) skipDepth++;
        if (entry.chrome) chromeDepth++;
        if (entry.main) mainDepth++;
        if (BLOCK.has(name)) newline();
      },
      ontext(text) {
        if (inTitle) {
          title += text;
          return;
        }
        if (skipDepth > 0) return;
        if (chromeDepth === 0) all += text;
        if (mainDepth > 0) main += text;
      },
      onclosetag(name) {
        if (VOID.has(name)) return;
        let index = -1;
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name === name) {
            index = i;
            break;
          }
        }
        if (index === -1) return;
        for (const open of stack.splice(index).reverse()) {
          if (open.name === "title") inTitle = false;
          if (BLOCK.has(open.name)) newline();
          if (open.skip) skipDepth--;
          if (open.chrome) chromeDepth--;
          if (open.main) mainDepth--;
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true }
  );
  parser.write(html);
  parser.end();
  return { title, description, all, main };
}

const tidy = (text: string) =>
  text
    .replace(/ /g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

/** Main content when the page marks it and it has substance; otherwise the page minus its chrome. */
export function htmlToPageText(html: string): PageText {
  const { title, description, all, main } = collect(html);
  const mainText = tidy(main);
  const body = mainText.replace(/\s/g, "").length >= 200 ? mainText : tidy(all);
  const t = tidy(title);
  const d = tidy(description);
  const lead = [t, d].filter((part) => part && !body.includes(part));
  // A blank line separates the title and description from the page body.
  return { title: t, description: d, text: [...lead, body].filter(Boolean).join("\n\n") };
}
