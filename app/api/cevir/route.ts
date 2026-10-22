import { convert, type Script } from "@/lib/convert";

const SCRIPTS = new Set<Script>(["latin", "ottoman", "ete"]);
const MAX = 20_000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { text?: unknown; from?: unknown };
  if (typeof body.text !== "string" || !SCRIPTS.has(body.from as Script)) {
    return Response.json({ error: "text and from (latin, ottoman, ete) are needed" }, { status: 400 });
  }
  if (body.text.length > MAX) {
    return Response.json({ error: `En fazla ${MAX} karakter.` }, { status: 413 });
  }
  return Response.json({ tokens: convert(body.text, body.from as Script) });
}
