// A page of a book in the three alphabets at once: every Latin word is a stack of its Latin, its
// Ottoman (the dictionary, lib/script/ottoman.ts) and its ETE (letter by letter, lib/script/ete.ts),
// one under the other. The reader shows the rows that are chosen (app/kitap/yazi.css). The Arabic
// and Persian of the books stays as it is.

import { Parser } from "htmlparser2";
import { ete } from "../script/ete";
import { lower, marks, splitWords } from "../script/latin";
import { explain, type Explained, type Origin } from "../script/koken";
import { ottoman } from "../script/ottoman";
import { escapeAttr, escapeText } from "./parse";

const VOID = new Set(["br", "img", "hr", "wbr"]);

export type Writer = {
  /** the Ottoman of a lower case form, null when it is not known */
  ottoman: (form: string) => string | null;
  /** the ETE of a lower case form, a suffix after an apostrophe beginning with "-" */
  ete: (form: string) => string | null;
  /** the origin of the root of a lower case form and the root, for the colors of the Latin (settings) */
  origin?: (form: string) => Explained;
};

export function writer(known: Map<string, string>, more?: (form: string) => string | null): Writer {
  return {
    ottoman: (form) => ottoman(form, known, more),
    ete: (form) => ete(form),
    origin: (form) => explain(form, (f) => known.get(f)),
  };
}

/** the class of the root in the Latin row by its origin (app/kitap.css); today's Turkish is black */
const ORIGIN_CLASS: Record<Origin, string> = { arapca: "ka", farsca: "kf", eski: "kt", turkce: "", bati: "kb" };

/** The Latin of a word, its root in the color of its origin and its endings black: "âciz" + "ler". */
function latin(word: string, root: string | null, origin: Origin | null): string {
  const cls = origin ? ORIGIN_CLASS[origin] : "";
  if (!cls || !root) return escapeText(word);
  // the root as the letters of the word (the form is the word in lower case, as long)
  const start = lower(word).indexOf(root);
  if (start < 0) return `<span class="${cls}">${escapeText(word)}</span>`;
  const end = start + root.length;
  return (
    escapeText(word.slice(0, start)) +
    `<span class="${cls}">${escapeText(word.slice(start, end))}</span>` +
    escapeText(word.slice(end))
  );
}

/** A Latin word as the stack of its three writings, with the marks that touch it (`before`,
 *  `after`: "“", ","). An apostrophe right before it begins a suffix ("</a>’un"): ETE writes it
 *  apart from its word, without the apostrophe. */
/** Whether `word` is the m- echo of the word before it, "and such": "kumara mumara", "ilaç milaç". */
export function echoes(word: string, previous: string): boolean {
  const w = lower(word);
  const p = lower(previous);
  if (!w.startsWith("m") || p.startsWith("m") || p.length < 2) return false;
  return w === "m" + p.slice(1) || (/^[aeıioöuü]/.test(p) && w === "m" + p);
}

export function cell(word: string, w: Writer, before = "", after = "", previous = ""): string {
  const form = lower(word);
  const suffix = /[’']$/.test(before);
  const o = w.ottoman(form);
  const e = w.ete(suffix ? `-${form}` : form);
  // a suffix written apart has no root of its own; an m- echo the root of the word it echoes, "m"
  // and the letters of that root ("kumar-a mumar-a")
  let kok: Explained = { origin: null, root: null };
  if (!suffix && w.origin) {
    if (previous && echoes(word, previous)) {
      const p = w.origin(lower(previous));
      const r = p.root && (/^[aeıioöuü]/.test(lower(previous)) ? "m" + p.root : "m" + p.root.slice(1));
      kok = { origin: p.origin, root: r };
    } else kok = w.origin(form);
  }
  const ab = marks(before);
  const aa = marks(after);
  const eb = suffix ? ab.slice(0, -1) : ab;
  return (
    `<span class="w"><span class="l">${escapeText(before)}${latin(word, kok.root, kok.origin)}${escapeText(after)}</span>` +
    `<span class="o${o === null ? " x" : ""}">${escapeText(o === null ? before + word + after : ab + o + aa)}</span>` +
    `<span class="e${e === null ? " x" : ""}">${escapeText(e === null ? before + word + after : eb + e + aa)}</span></span>`
  );
}

/** What is between the words: digits and , ? ; are Arabic in the Arabic letters. */
function between(text: string): string {
  if (!text) return "";
  const arabic = marks(text);
  if (arabic === text) return escapeText(text);
  return `<span class="nl">${escapeText(text)}</span><span class="na">${escapeText(arabic)}</span>`;
}

export function writeText(text: string, w: Writer): string {
  const parts = splitWords(text);
  // the marks of a stretch between words that touch a word go with it: "gibi," "“Ben"
  const before: string[] = parts.map(() => "");
  const after: string[] = parts.map(() => "");
  const rest = parts.map((p) => (p.word ? "" : p.text));
  // the word before each word, when only a space is between them (for the m- echo)
  const previous = parts.map((p, i) => (p.word && i >= 2 && parts[i - 2].word && /^\s+$/.test(parts[i - 1].text) ? parts[i - 2].text : ""));
  parts.forEach((p, i) => {
    if (p.word) return;
    const prev = parts[i - 1]?.word;
    const next = parts[i + 1]?.word;
    const m = /^(\S*)([\s\S]*?)(\S*)$/.exec(p.text)!;
    if (!/\s/.test(p.text)) {
      // no space: with the word before, else the one after
      if (prev) [after[i - 1], rest[i]] = [p.text, ""];
      else if (next) [before[i + 1], rest[i]] = [p.text, ""];
      return;
    }
    if (prev) after[i - 1] = m[1];
    if (next) before[i + 1] = m[3];
    rest[i] = (prev ? "" : m[1]) + m[2] + (next ? "" : m[3]);
  });
  return parts.map((p, i) => (p.word ? cell(p.text, w, before[i], after[i], previous[i]) : between(rest[i]))).join("");
}

/** The interlinear HTML of a page (the HTML of lib/books/parse.ts). */
export function renderPage(html: string, w: Writer): string {
  let out = "";
  let text = "";
  const stack: { hoefler: boolean; arabic: boolean }[] = [];
  const flush = () => {
    if (!text) return;
    const ornament = stack.some((s) => s.hoefler) && /^\s*[ij]\s*$/.test(text);
    const arabic = stack.at(-1)?.arabic;
    out += ornament || arabic ? escapeText(text) : writeText(text, w);
    text = "";
  };
  const parser = new Parser(
    {
      onopentag(name, attrs) {
        flush();
        let s = `<${name}`;
        for (const [k, v] of Object.entries(attrs)) s += ` ${k}="${escapeAttr(v)}"`;
        out += VOID.has(name) ? `${s}/>` : `${s}>`;
        const lang = attrs.lang;
        // within Arabic or Persian an element of no language is of it
        const parent = stack.at(-1)?.arabic ?? false;
        stack.push({
          hoefler: (attrs.class ?? "").includes("hoefler"),
          arabic: lang ? /^(ar|fa)/.test(lang) : parent,
        });
      },
      ontext(t) {
        text += t;
      },
      onclosetag(name) {
        flush();
        stack.pop();
        if (!VOID.has(name)) out += `</${name}>`;
      },
    },
    { xmlMode: true, decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  flush();
  return out;
}
