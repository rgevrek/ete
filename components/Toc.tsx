import Link from "next/link";
import type { Book, TocEntry } from "@/lib/books/parse";

type Node = TocEntry & { children: Node[] };

function tree(toc: TocEntry[]): Node[] {
  const roots: Node[] = [];
  const stack: Node[] = [];
  for (const entry of toc) {
    const node: Node = { ...entry, children: [] };
    while (stack.length && stack.at(-1)!.level >= node.level) stack.pop();
    (stack.at(-1)?.children ?? roots).push(node);
    stack.push(node);
  }
  return roots;
}

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

export function href(book: Book, e: TocEntry): string {
  return `/kitap/${book.slug}/${encodeURIComponent(book.pages[e.page].label)}#${encodeURIComponent(e.anchor)}`;
}

function Entries({ nodes, book }: { nodes: Node[]; book: Book }) {
  return (
    <ul>
      {nodes.map((n) => {
        const link = (
          <Link href={href(book, n)} data-i={n.page} title={n.description}>
            {n.label}
          </Link>
        );
        return (
          <li key={n.anchor}>
            {n.children.length ? (
              <details>
                <summary>{link}</summary>
                <Entries nodes={n.children} book={book} />
              </details>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The table of contents of the book; the page marks its headline (TocMark). */
export function Toc({ book }: { book: Book }) {
  return (
    <details className="icindekiler">
      <summary>İçindekiler</summary>
      <h2>{book.title}</h2>
      {book.toc.length ? (
        <Entries nodes={tree(book.toc)} book={book} />
      ) : (
        <p className="bos">Bu kitabın başlıkları yok.</p>
      )}
    </details>
  );
}
