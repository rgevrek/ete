import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionEmail } from "@/lib/auth/session";

/** Everything but the sign-in needs a session: the books, the fonts, the images. */
export async function proxy(request: NextRequest) {
  if (await sessionEmail(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  const login = new URL("/giris", request.url);
  if (pathname !== "/") login.searchParams.set("sonra", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!giris|api/giris|api/saglik|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
