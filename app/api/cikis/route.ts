import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";

export async function POST() {
  const res = NextResponse.redirect(new URL("/giris", appUrl()), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
