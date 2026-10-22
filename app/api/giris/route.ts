import { allowed, normalizeEmail } from "@/lib/auth/allow";
import { take } from "@/lib/auth/limit";
import { sendLink } from "@/lib/auth/mail";
import { linkToken } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";

/** Sends a sign-in link to an allowed address. The answer is the same for every address. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; sonra?: unknown };
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
  if (!email) return Response.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });

  const client = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!take(`ip:${client}`, 10) || !take(`mail:${email}`, 3)) {
    return Response.json({ error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
  }
  if (allowed(email)) {
    const link = new URL("/giris/dogrula", appUrl());
    link.searchParams.set("t", await linkToken(email));
    if (typeof body.sonra === "string" && body.sonra.startsWith("/") && !body.sonra.startsWith("//")) {
      link.searchParams.set("sonra", body.sonra);
    }
    try {
      await sendLink(email, link.toString());
    } catch (err) {
      console.error("sign-in mail failed", err);
      return Response.json({ error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 502 });
    }
  } else {
    console.log(`sign-in refused for ${email} (not in ALLOWED_EMAILS)`);
  }
  return Response.json({ ok: true });
}
