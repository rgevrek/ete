"use client";

import { useState } from "react";

export function LoginForm({ sonra }: { sonra?: string }) {
  const [state, setState] = useState<"bos" | "gonderiliyor" | "gonderildi">("bos");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("gonderiliyor");
    setError(null);
    const email = new FormData(e.currentTarget).get("email");
    const res = await fetch("/api/giris", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, sonra }),
    }).catch(() => null);
    if (res?.ok) return setState("gonderildi");
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? "Bir hata oldu. Lütfen tekrar deneyin.");
    setState("bos");
  }

  if (state === "gonderildi") {
    return (
      <p className="tamam" role="status">
        Bu adres kayıtlıysa giriş bağlantısı gönderildi. E-postanızı kontrol edin; bağlantı 15 dakika geçerlidir.
      </p>
    );
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor="email">E-posta adresi</label>
      <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}
      <button className="dugme ana" type="submit" disabled={state === "gonderiliyor"}>
        {state === "gonderiliyor" ? "Gönderiliyor…" : "Giriş bağlantısı gönder"}
      </button>
    </form>
  );
}
