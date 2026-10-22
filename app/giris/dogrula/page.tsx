import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giriş" };

/** The page of the link in the mail: a button, so that mail scanners opening the link don't use it. */
export default async function Confirm({ searchParams }: { searchParams: Promise<{ t?: string; sonra?: string }> }) {
  const { t, sonra } = await searchParams;
  return (
    <main className="giris">
      <h1>
        ETE<span lang="tr-Arab">أتە</span>
      </h1>
      {t ? (
        <form action="/api/giris/dogrula" method="post">
          <p>Girişi tamamlamak için düğmeye basın.</p>
          <input type="hidden" name="t" value={t} />
          {sonra && <input type="hidden" name="sonra" value={sonra} />}
          <button className="dugme ana" type="submit">
            Giriş yap
          </button>
        </form>
      ) : (
        <p className="hata">Bağlantı eksik. Lütfen e-postadaki bağlantıyı açın.</p>
      )}
    </main>
  );
}
