// A book of risale-i-nur-kulliyati (README "Format of Books") as pages: split at its
// <page-break page="N">, its table of contents from the headlines, its markup made safe for the
// browser's HTML parser (which would close a <p> at a <details>: paragraphs become <div class="p">).
// The text stays Latin; the reader writes it in the other alphabets (lib/books/render.ts).

import { Parser } from "htmlparser2";

export type TocEntry = {
  level: number;
  label: string;
  /** element id on its page */
  anchor: string;
  page: number;
  description?: string;
};

export type Page = { label: string; html: string };

export type Book = {
  slug: string;
  title: string;
  pages: Page[];
  toc: TocEntry[];
  /** the ids of the book (link paths, "13/13") and the page they are on */
  ids: Map<string, number>;
  /** page label → index */
  labels: Map<string, number>;
};

/** Every Latin text of a book as tools/osmanlica.py forms() reads it: the text and the titles and
 *  descriptions of the elements, not the ornaments of the headlines. */
export type FormSink = (text: string) => void;

const KEEP = new Set([
  "div", "span", "a", "b", "i", "em", "strong", "small", "sup", "sub", "cite", "details",
  "summary", "h1", "h2", "h3", "h4", "h5", "h6", "figure", "figcaption", "img", "br", "ul", "ol",
  "li",
]);
const VOID = new Set(["br", "img", "hr", "wbr"]);
const SKIP = new Set(["html", "head", "body", "main", "link", "meta"]);
/** A book without page breaks is cut into pages of about this many letters, a longer stretch
 *  between two page breaks into pages of three times as many. */
const PAGE_LETTERS = 5000;

export function escapeText(text: string): string {
  return text.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

export function escapeAttr(text: string): string {
  return text.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

const isOrnament = (text: string) => /^\s*[ij]\s*$/.test(text);

type Open = {
  name: string;
  /** the element written for it, null for none */
  out: string | null;
  hoefler: boolean;
  heading?: Heading;
  /** its start tag on the next page, when a page break is within it */
  reopen: string;
};
type Heading = {
  level: number;
  label: string | null;
  text: string;
  anchor: string;
  page: number;
  description?: string;
  arabic: boolean;
};

/** Where a link of the books goes in the app: its book there, else nowhere (null). */
export function linkTarget(href: string, slugs: Set<string>): string | null {
  if (/^https?:\/\//.test(href)) return href;
  const m = /^\/([^/?#]+)(?:\/([^?#]+))?(?:\?sayfa=([^&#]+))?/.exec(href);
  if (!m || !slugs.has(m[1])) return null;
  if (m[2]) return `/kitap/${m[1]}?id=${encodeURIComponent(decodeURIComponent(m[2]))}`;
  if (m[3]) return `/kitap/${m[1]}/${encodeURIComponent(m[3])}`;
  return `/kitap/${m[1]}`;
}

export function parseBook(slug: string, source: string, slugs: Set<string>, forms?: FormSink): Book {
  const numbered = /<page-break page="/.test(source);
  const unnumbered = !numbered && /<page-break/.test(source);

  const pages: Page[] = [];
  const toc: TocEntry[] = [];
  const ids = new Map<string, number>();
  let title = slug;
  let html = "";
  let letters = 0;
  let label: string | null = null;
  let generated = 0;

  const stack: Open[] = [];
  let inBody = false;
  let inTitle = false;
  let titleText = "";
  let text = "";

  const hoefler = () => stack.some((o) => o.hoefler);
  /** within the body of a footnote: a <details> outside its <summary> */
  const footnote = () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].name === "summary") return false;
      if (stack[i].name === "details") return true;
    }
    return false;
  };

  function endPage(next: string | null) {
    // what was written before the first numbered break is the page before it
    if (label === null && next !== null && /^\d+$/.test(next)) label = String(Number(next) - 1);
    label ??= String(pages.length + 1);
    if (html.trim() || pages.length) {
      pages.push({ label, html });
    }
    html = "";
    letters = 0;
    label = next;
  }

  /** a page break within elements: they end on this page and go on on the next */
  function breakPage(next: string | null) {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].out) html += `</${stack[i].out}>`;
    endPage(next);
    // reopened without their ids; "devam" marks a paragraph that goes on (no indent)
    for (const o of stack) html += o.reopen;
  }

  function flush() {
    if (!text) return;
    const t = text;
    text = "";
    if (inTitle) {
      titleText += t;
      forms?.(t);
      return;
    }
    if (!inBody) return;
    const ornament = hoefler() && isOrnament(t);
    if (!ornament) {
      forms?.(t);
      letters += t.length;
    }
    if (!ornament && !footnote()) for (const o of stack) if (o.heading) o.heading.text += t;
    html += escapeText(t);
  }

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        flush();
        if (name === "title") {
          inTitle = true;
          return;
        }
        if (name === "body") inBody = true;
        if (!inBody) return;
        for (const a of ["title", "description"] as const) if (attrs[a]) forms?.(attrs[a]);

        if (name === "page-break") {
          const page = attrs.page ?? null;
          if (numbered) {
            // a break of no number among numbered ones: the page goes on ("57-2")
            breakPage(page ?? label);
          } else if (unnumbered) breakPage(String(pages.length + 2));
          stack.push({ name, out: null, hoefler: false, reopen: "" });
          return;
        }
        if (SKIP.has(name)) {
          stack.push({ name, out: null, hoefler: false, reopen: "" });
          return;
        }

        let out = name === "p" ? "div" : KEEP.has(name) ? name : "span";
        const classes = (attrs.class ?? "").split(/\s+/).filter(Boolean);
        if (name === "p") classes.unshift("p");
        // the explanation of a footnote is Turkish, also within Arabic
        const lang = attrs.lang ?? attrs["xml:lang"] ?? (name === "details" ? "tr" : undefined);
        const turkish = !!lang && lang.startsWith("tr");
        if (turkish) classes.push("tr");
        const kept: [string, string][] = [];
        if (lang) kept.push(["lang", lang]);
        if (attrs.dir && !turkish) kept.push(["dir", attrs.dir]);
        if (attrs.role) kept.push(["role", attrs.role]);
        if (attrs["aria-level"]) kept.push(["aria-level", attrs["aria-level"]]);

        if (name === "a") {
          const target = attrs.href ? linkTarget(attrs.href, slugs) : null;
          if (target) {
            kept.push(["href", target]);
            if (target.startsWith("http")) kept.push(["target", "_blank"], ["rel", "noopener"]);
          } else {
            out = "span";
            classes.push("ref");
          }
        }
        if (name === "img") {
          const src = attrs.src ?? "";
          kept.push(["src", src.startsWith("data:") ? src : `/resim/${slug}/${src.split("/").pop()}`]);
          kept.push(["alt", attrs.alt ?? ""], ["loading", "lazy"]);
        }

        // headlines of the table of contents
        let heading: Heading | undefined;
        const level = /^h([1-6])$/.exec(name)?.[1] ?? (attrs.role === "heading" ? attrs["aria-level"] : undefined);
        if (level && !("toc-ignore" in attrs)) {
          heading = {
            level: Number(level),
            label: attrs.title?.trim() || null,
            text: "",
            anchor: "",
            page: pages.length,
            description: attrs.description,
            arabic: !!lang && /^(ar|fa)/.test(lang),
          };
        }
        let id = attrs.id;
        if (id !== undefined) {
          if (!ids.has(id)) ids.set(id, pages.length);
          id = `k-${id}`;
        } else if (heading) {
          id = `b-${++generated}`;
        }
        if (heading) heading.anchor = id!;

        const attrText = (withId: boolean, extra: string[]) => {
          const cls = [...classes, ...extra];
          let s = "";
          if (withId && id) s += ` id="${escapeAttr(id)}"`;
          if (cls.length) s += ` class="${escapeAttr(cls.join(" "))}"`;
          for (const [k, v] of kept) s += ` ${k}="${escapeAttr(v)}"`;
          return s;
        };
        const isVoid = VOID.has(out);
        html += `<${out}${attrText(true, [])}${isVoid ? "/>" : ">"}`;
        stack.push({
          name,
          out: isVoid ? null : out,
          hoefler: classes.some((c) => c.includes("hoefler")),
          heading,
          reopen: isVoid ? "" : `<${out}${attrText(false, ["devam"])}>`,
        });
      },
      ontext(t) {
        text += t;
      },
      onclosetag(name) {
        flush();
        if (name === "title") {
          inTitle = false;
          title = titleText.replace(/\s+/g, " ").trim() || title;
          return;
        }
        if (!inBody) return;
        if (name === "body") inBody = false;
        const o = stack.pop();
        if (!o) return;
        if (o.out) html += `</${o.out}>`;
        const h = o.heading;
        if (h) {
          const labelText = h.label ?? h.text.replace(/\s+/g, " ").trim();
          if (labelText && !(h.arabic && !h.label)) {
            toc.push({ level: h.level, label: labelText, anchor: h.anchor, page: h.page, description: h.description });
          }
        }
        // a book without page breaks, or a long stretch: pages of whole top-level elements
        const paged = numbered || unnumbered;
        if (letters >= (paged ? 3 : 1) * PAGE_LETTERS && stack.every((s) => !s.out)) {
          endPage(numbered ? label : String(pages.length + 2));
        }
      },
      oncomment() {
        flush();
      },
    },
    { xmlMode: true, decodeEntities: true },
  );
  parser.write(source);
  parser.end();
  flush();
  if (html.trim() || !pages.length) endPage(null);

  // a page number twice gets a letter
  const labels = new Map<string, number>();
  pages.forEach((p, i) => {
    let l = p.label;
    for (let n = 2; labels.has(l); n++) l = `${p.label}-${n}`;
    p.label = l;
    labels.set(l, i);
  });
  return { slug, title, pages, toc, ids, labels };
}
