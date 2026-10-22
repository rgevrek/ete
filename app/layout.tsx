import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ETE · Risale-i Nur", template: "%s · ETE" },
  description: "Risale-i Nur Külliyatı Latin, Osmanlıca ve ETE (Esas Türk Elifbası) harfleriyle",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
