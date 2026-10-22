import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Giriş" };

export default async function Login({ searchParams }: { searchParams: Promise<{ sonra?: string; hata?: string }> }) {
  const { sonra, hata } = await searchParams;
  return (
    <main className="giris">
      <h1>
        ETE<span lang="tr-Arab">أتە</span>
      </h1>
      <p>Risale-i Nur Külliyatı Latin, Osmanlıca ve ETE harfleriyle. Girmek için e-posta adresinize bir bağlantı gönderilir.</p>
      {hata === "baglanti" && (
        <p className="hata">Bu bağlantı geçersiz, süresi dolmuş veya daha önce kullanılmış. Yeni bir bağlantı isteyin.</p>
      )}
      <LoginForm sonra={sonra} />
    </main>
  );
}
