import { cookies } from "next/headers";
import { Ust } from "@/components/Ust";
import { SESSION_COOKIE, sessionEmail } from "@/lib/auth/session";
import { AYAR_COOKIE, parseAyar } from "@/lib/ayar";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const email = await sessionEmail(jar.get(SESSION_COOKIE)?.value);
  return (
    <>
      <Ust email={email} ayar={parseAyar(jar.get(AYAR_COOKIE)?.value)} />
      {children}
    </>
  );
}
