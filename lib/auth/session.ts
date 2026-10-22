// Sign-in by a link sent by mail: the link holds a token valid for 15 minutes and used once, the
// session is a cookie with a token valid for 30 days. Both are JWTs signed with SESSION_SECRET; no
// database (the app is read-only).

import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "ete_oturum";
export const SESSION_DAYS = 30;
const LINK_MINUTES = 15;
const ISSUER = "ete";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (32+ characters) is not set");
    return new TextEncoder().encode("development-only-secret-of-32-characters!");
  }
  return new TextEncoder().encode(s);
}

export async function sessionToken(email: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer(ISSUER)
    .setAudience("oturum")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

/** The email of a valid session token, else null. */
export async function sessionEmail(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: "oturum" });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function linkToken(email: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer(ISSUER)
    .setAudience("giris")
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${LINK_MINUTES}m`)
    .sign(secret());
}

// The ids of the links used, until they expire. One replica (deploy/helm/ete): a link is used
// once as long as the process lives; after a restart, it is still valid for the rest of its
// 15 minutes.
const used = new Map<string, number>();

/** The email of a sign-in link's token, null when it is invalid, expired or used. */
export async function useLinkToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: "giris" });
    const now = Date.now();
    for (const [id, exp] of used) if (exp < now) used.delete(id);
    if (!payload.jti || !payload.sub || used.has(payload.jti)) return null;
    used.set(payload.jti, (payload.exp ?? 0) * 1000);
    return payload.sub;
  } catch {
    return null;
  }
}
