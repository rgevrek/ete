import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, sessionToken, useLinkToken } from "@/lib/auth/session";
import { appUrl, secureCookies } from "@/lib/env";

/** The button of /giris/dogrula: uses the link's token and starts the session. A POST, so that
 *  mail scanners opening the link don't use it up. */
export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("t");
  const sonra = form.get("sonra");
  const email = typeof token === "string" ? await useLinkToken(token) : null;
  if (!email) return NextResponse.redirect(new URL("/giris?hata=baglanti", appUrl()), 303);

  const target = typeof sonra === "string" && sonra.startsWith("/") && !sonra.startsWith("//") ? sonra : "/";
  const res = NextResponse.redirect(new URL(target, appUrl()), 303);
  res.cookies.set(SESSION_COOKIE, await sessionToken(email), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}
