// Who may sign in: ALLOWED_EMAILS, addresses and domains ("@rgevrek.de") separated by commas;
// "*" for everyone who can receive mail at their address. Empty: no one (except in development).

export function normalizeEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 ? e : null;
}

export function allowed(email: string, list = process.env.ALLOWED_EMAILS ?? ""): boolean {
  const entries = list
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!entries.length) return process.env.NODE_ENV !== "production";
  return entries.some((a) => a === "*" || a === email || (a.startsWith("@") && email.endsWith(a)));
}
