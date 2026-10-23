"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Ayar } from "@/lib/ayar";
import { Ayarlar } from "./Ayarlar";

const LINKS = [
  { href: "/", name: "Kitaplar" },
  { href: "/cevirici", name: "Çevirici" },
  { href: "/sozluk", name: "Sözlük" },
  { href: "/ete-hakkinda", name: "ETE hakkında" },
];

/** The header; on a phone its links and buttons are behind "Menü". */
export function Ust({ email, ayar }: { email: string | null; ayar: Ayar }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // a link followed closes it
  useEffect(() => setOpen(false), [path]);

  const current = (href: string) => (href === "/" ? path === "/" || path.startsWith("/kitap") : path.startsWith(href));

  return (
    <header className={`ust${open ? " acik" : ""}`}>
      <Link href="/" className="marka">
        ETE<span lang="tr-Arab">أتە</span>
      </Link>
      <button
        type="button"
        className="dugme menu-dugme"
        aria-expanded={open}
        aria-controls="ust-menu"
        onClick={() => setOpen(!open)}
      >
        {open ? "Kapat" : "Menü"}
      </button>
      <div id="ust-menu" className="menu">
        <nav>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current(l.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.name}
            </Link>
          ))}
        </nav>
        <div className="eylemler">
          {email && <span className="kim">{email}</span>}
          <Ayarlar initial={ayar} />
          <form action="/api/cikis" method="post">
            <button className="dugme" type="submit">
              Çıkış
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
