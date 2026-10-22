import type { Metadata } from "next";
import { Converter } from "./Converter";
import "../../kitap.css";

export const metadata: Metadata = { title: "Çevirici" };

export default function ConverterPage() {
  return (
    <main className="sayfa">
      <h1>Çevirici</h1>
      <p style={{ color: "var(--soluk)", marginTop: 0 }}>
        Latin, Osmanlıca ve ETE arasında kelime kelime. Latin ile ETE harf harf birbirine denktir; Osmanlıca kelimeler
        Risale-i Nur sözlüğünden (ve ondan türetilerek) yazılır, Osmanlıcadan Latine ise kitaplarda en sık geçen okunuşla.
      </p>
      <Converter />
    </main>
  );
}
