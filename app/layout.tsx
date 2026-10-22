import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AYAR_COOKIE, fontClass, parseAyar } from "@/lib/ayar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ETE · Risale-i Nur", template: "%s · ETE" },
  description: "Risale-i Nur Külliyatı Latin, Osmanlıca ve ETE (Esas Türk Elifbası) harfleriyle",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ayar = parseAyar((await cookies()).get(AYAR_COOKIE)?.value);
  return (
    <html lang="tr">
      <body className={fontClass(ayar)}>{children}</body>
    </html>
  );
}
