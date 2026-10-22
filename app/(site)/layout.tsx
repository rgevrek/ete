import { cookies } from "next/headers";
import Link from "next/link";
import { SESSION_COOKIE, sessionEmail } from "@/lib/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const email = await sessionEmail((await cookies()).get(SESSION_COOKIE)?.value);
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
