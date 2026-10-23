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

type Part = { text: string; cls: string };

/** An Ottoman or ETE word in parts (a prefix, the root, a suffix, as that alphabet writes them),
 *  each in its color in turn from its beginning, the rest (the endings) black; the whole word in the
 *  color of the first when the root is the word, or the first part is not found in it. */
function arabic(word: string, parts: Part[], whole: boolean): string {
  if (!parts.length || !parts[0].cls) return escapeText(word);
  const same = (a: string, b: string) => a === b || (/[يى]/.test(a) && /[يى]/.test(b)) || (/[كگ]/.test(a) && /[كگ]/.test(b));
  if (whole && parts.length === 1) return `<span class="${parts[0].cls}">${escapeText(word)}</span>`;
  let out = "";
  let i = 0;
  for (const [k, part] of parts.entries()) {
    const r = part.text.replace(/‌/g, "");
    let at = i;
    let j = 0;
    // the common beginning, the ZWNJ between the parts not counted
    while (at < word.length && j < r.length && same(word[at], r[j])) {
      at++;
      j++;
      while (word[at] === "‌") at++;
    }
    if (j < (r.length <= 2 ? r.length : Math.max(2, r.length - 1))) {
      if (k === 0) return `<span class="${part.cls}">${escapeText(word)}</span>`;
      break;
    }
    out += `<span class="${part.cls}">${escapeText(word.slice(i, at))}</span>`;
    i = at;
  }
  return out + escapeText(word.slice(i));
}

/** The Latin of a word in parts (a prefix, the root, a suffix, as the letters of the word), each in
 *  its color, the endings black: "âciz" + "ler", "mâni" + "dâr" + "ı". */
function latin(word: string, parts: Part[]): string {
  if (!parts.length || !parts[0].cls) return escapeText(word);
  // the parts as the letters of the word (the form is the word in lower case, as long)
  const low = lower(word);
  const start = low.indexOf(parts[0].text);
  if (start < 0) return `<span class="${parts[0].cls}">${escapeText(word)}</span>`;
  let out = escapeText(word.slice(0, start));
  let i = start;
  for (const part of parts) {
    if (!low.startsWith(part.text, i)) break;
    out += `<span class="${part.cls}">${escapeText(word.slice(i, i + part.text.length))}</span>`;
    i += part.text.length;
  }
  return out + escapeText(word.slice(i));
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
  // the root in the Ottoman and the ETE: of the Latin root
  const whole = !kok.root || kok.root === form.replace(/^[’'-]+/, "").split("-")[0] && !form.includes("-");
  // the parts of the word: a Persian prefix or suffix apart from the root ("nâ" + "mütenâhî", "mâni" + "dâr")
  const cls = kok.origin ? ORIGIN_CLASS[kok.origin] : "";
  const fa = ORIGIN_CLASS.farsca;
  const affix = kok.affix;
  const root = kok.root ?? "";
  const lat: Part[] = !cls || !root ? [] : affix?.prefix
    ? [{ text: affix.text, cls: fa }, { text: root, cls }]
    : affix ? [{ text: root, cls }, { text: affix.text, cls: fa }] : [{ text: root, cls }];
  // (the Ottoman root as the word writes it before its suffix: "mâni" معنى of "mânidâr" معنيدار)
  const at = affix && !affix.prefix && o ? o.lastIndexOf(affix.ottoman) : -1;
  const otaRoot = at > 0 ? o!.slice(0, at) : w.ottoman(root) ?? root;
  const ota: Part[] = !cls || !root ? [] : affix?.prefix
    ? [{ text: affix.ottoman, cls: fa }, { text: w.ottoman(root) ?? root, cls }]
    : affix ? [{ text: otaRoot, cls }, { text: affix.ottoman, cls: fa }] : [{ text: w.ottoman(root) ?? "", cls }];
  const et: Part[] = !cls || !root ? [] : affix?.prefix
    ? [{ text: w.ete(affix.text) ?? "", cls: fa }, { text: w.ete(`-${root}`) ?? "", cls }]
    : affix ? [{ text: w.ete(root) ?? "", cls }, { text: w.ete(`-${affix.text}`) ?? "", cls: fa }] : [{ text: w.ete(root) ?? "", cls }];
  return (
    `<span class="w"><span class="l">${escapeText(before)}${latin(word, lat)}${escapeText(after)}</span>` +
    (o === null
      ? `<span class="o x">${escapeText(before + word + after)}</span>`
      : `<span class="o">${escapeText(ab)}${arabic(o, ota, whole && !affix)}${escapeText(aa)}</span>`) +
    (e === null
      ? `<span class="e x">${escapeText(before + word + after)}</span>`
      : `<span class="e">${escapeText(eb)}${arabic(e, et, whole && !affix)}${escapeText(aa)}</span>`) +
    `</span>`
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
