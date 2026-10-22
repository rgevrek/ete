import { notFound } from "next/navigation";
import { Toc } from "@/components/Toc";
import { book } from "@/lib/books/library";
import "../../../kitap.css";
import "../../../yazi.css";

/** The table of contents stays while the pages of the book are turned. */
export default async function BookLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const b = book(slug);
  if (!b) notFound();
  return (
    <div className="okuyucu">
      <Toc book={b} />
      {children}
    </div>
  );
}
