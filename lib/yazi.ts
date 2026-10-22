// The alphabets the reader shows, kept in a cookie so the page comes rendered with them.

export const YAZI_COOKIE = "ete_yazi";
export const ALPHABETS = ["l", "o", "e"] as const;
export type Alphabet = (typeof ALPHABETS)[number];
export type Shown = Record<Alphabet, boolean>;

export function parseShown(value: string | undefined): Shown {
  const set = new Set((value ?? "l").split(","));
  const shown = { l: set.has("l"), o: set.has("o"), e: set.has("e") };
  return shown.l || shown.o || shown.e ? shown : { l: true, o: false, e: false };
}

export function shownValue(shown: Shown): string {
  return ALPHABETS.filter((a) => shown[a]).join(",");
}

/** Right to left: without Latin, or with Latin when the Arabic letters lead (Ayar.yon). */
export function rightToLeft(shown: Shown, yon: "ltr" | "rtl"): boolean {
  return !shown.l || (yon === "rtl" && (shown.o || shown.e));
}

/** The classes of the text: the alphabets shown, "cok" for more than one, "sag-sola" right to
 *  left, "arap-once" the Arabic letters above the Latin. */
export function yaziClass(shown: Shown, yon: "ltr" | "rtl" = "ltr"): string {
  const on = ALPHABETS.filter((a) => shown[a]);
  const rtl = rightToLeft(shown, yon);
  return ["yazi", ...on, on.length > 1 ? "cok" : "", rtl ? "sag-sola" : "", rtl && shown.l ? "arap-once" : ""]
    .filter(Boolean)
    .join(" ");
}
