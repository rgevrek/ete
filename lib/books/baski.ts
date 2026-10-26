// The printed book: a page or pages of it on A4 (app/kitap.css), above every sheet the headline and
// the page it belongs to (@page margin boxes, Chrome). Printed to a PDF by the browser.

import type { Book, TocEntry } from "./parse";
import { renderPage, type Writer } from "./render";

/** The headlines above the page's: the last one of every level before it. */
export function trail(toc: TocEntry[], page: number): TocEntry[] {
  const stack: TocEntry[] = [];
  for (const e of toc) {
    if (e.page > page) break;
    while (stack.length && stack.at(-1)!.level >= e.level) stack.pop();
    stack.push(e);
  }
  return stack;
}

/** A text as a CSS string, for the content of the margin boxes. */
export function cssString(text: string): string {
  return `"${text.replace(/[\\"<\n]/g, (c) => (c === "\n" ? "\\a " : c === "<" ? "\\3c " : `\\${c}`))}"`;
}

/** The margin boxes of the sheets of a page: its headline on the left, the book and the page on
 *  the right; `name` a named page, or the sheets of the document. */
export function marginBoxes(b: Book, index: number, name = ""): string {
  const headline = trail(b.toc, index).at(-1)?.label ?? b.title;
  return (
    `@page ${name}{ @top-left { content: ${cssString(headline)}; }` +
    ` @top-right { content: ${cssString(`${b.title} · sayfa ${b.pages[index].label}`)}; } }`
  );
}

/** The pages from `bas` to `son` (labels), the whole book without them; null for a label not in it. */
export function pageRange(b: Book, bas: string | null, son: string | null): [number, number] | null {
  const from = bas ? b.labels.get(bas) : 0;
  const to = son ? b.labels.get(son) : b.pages.length - 1;
  if (from === undefined || to === undefined) return null;
  return from <= to ? [from, to] : [to, from];
}

/** The name of the sheets of a page: every page of the book begins a sheet, with its own headline. */
export const sheetName = (index: number) => `s${index}`;

/** The pages from `from` to `to` for print, each a section on its named sheets, and their margin
 *  boxes. */
export function printedPages(b: Book, from: number, to: number, w: Writer): string {
  let style = "";
  let out = "";
  for (let i = from; i <= to; i++) {
    style += marginBoxes(b, i, `${sheetName(i)} `) + "\n";
    out +=
      `<section class="baski-sayfa" style="page: ${sheetName(i)}">` +
      `<p class="sayfa-ayrac">sayfa ${b.pages[i].label}</p>${renderPage(b.pages[i].html, w)}</section>`;
  }
  return `<style>${style}</style>${out}`;
}
