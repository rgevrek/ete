import { apiClientOf } from "@/lib/auth/api-token";
import { spellingCards, vocabularyCards } from "@/lib/cards";

const KINDS = new Set(["vocabulary", "spelling"]);

/** Learning cards for other systems (lib/cards): `vocabulary`, a word of the lügat in its three
 *  alphabets with its meanings; `spelling`, a word of the books in Latin, Ottoman and ETE letters.
 *  For a system's token (lib/auth/api-token), not for a session. */
export async function GET(request: Request): Promise<Response> {
  if (!apiClientOf(request)) return Response.json({ error: "invalid token" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const count = Number(params.get("count") ?? 5);
  if (!KINDS.has(kind) || !Number.isInteger(count) || count < 1 || count > 20) {
    return Response.json({ error: "kind (vocabulary, spelling) and count (1–20) are needed" }, { status: 400 });
  }
  const cards = kind === "vocabulary" ? vocabularyCards(count) : spellingCards(count);
  return Response.json({ kind, cards }, { headers: { "Cache-Control": "no-store" } });
}
