import { cookies } from "next/headers";
import Link from "next/link";
import { Ayarlar } from "@/components/Ayarlar";
import { SESSION_COOKIE, sessionEmail } from "@/lib/auth/session";
import { AYAR_COOKIE, parseAyar } from "@/lib/ayar";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const email = await sessionEmail(jar.get(SESSION_COOKIE)?.value);
  const ayar = parseAyar(jar.get(AYAR_COOKIE)?.value);
  return (
    <>
      <header className="ust">
        <Link href="/" className="marka">
          ETE<span lang="tr-Arab">أتە</span>
        </Link>
        <nav>
          <Link href="/">Kitaplar</Link>
          <Link href="/cevirici">Çevirici</Link>
        </nav>
        {email && <span className="kim">{email}</span>}
        <Ayarlar initial={ayar} />
        <form action="/api/cikis" method="post">
          <button className="dugme" type="submit">
            Çıkış
          </button>
        </form>
      </header>
      {children}
    </>
  );
}
