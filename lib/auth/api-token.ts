// Tokens of other systems for the API (/api/v1), machine to machine: API_TOKENS lists each as
// "name:sha256-of-token", comma separated, so only the hashes are kept (in the cluster's secret).
// A system sends its token as "Authorization: Bearer <token>". No database.

import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (text: string) => createHash("sha256").update(text).digest();

/** The configured tokens as name and hash. */
export function parseTokens(value: string | undefined): { name: string; hash: Buffer }[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter((parts): parts is [string, string] => parts.length === 2 && /^[0-9a-f]{64}$/i.test(parts[1]))
    .map(([name, hex]) => ({ name, hash: Buffer.from(hex, "hex") }));
}

/** The name of the system whose token the request carries, else null. */
export function apiClientOf(request: Request, tokens = parseTokens(process.env.API_TOKENS)): string | null {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const hash = sha256(token);
  return tokens.find((t) => timingSafeEqual(t.hash, hash))?.name ?? null;
}
