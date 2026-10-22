// The preferences of the settings dialog (components/Ayarlar.tsx), kept in a cookie so the pages
// come rendered with them.

export const AYAR_COOKIE = "ete_ayar";
/** dispatched on window when a preference changes, with the new Ayar as detail */
export const AYAR_EVENT = "ete-ayar";

export type Ayar = {
  /** the font of the Ottoman */
  osmanlica: "husrev" | "seherazade";
  /** the direction of the lines when Latin and Ottoman or ETE are shown together */
  yon: "ltr" | "rtl";
};

export const DEFAULT_AYAR: Ayar = { osmanlica: "husrev", yon: "ltr" };

export function parseAyar(value: string | undefined): Ayar {
  const pairs = new Map((value ?? "").split(",").map((p) => p.split(":") as [string, string]));
  return {
    osmanlica: pairs.get("osmanlica") === "seherazade" ? "seherazade" : "husrev",
    yon: pairs.get("yon") === "rtl" ? "rtl" : "ltr",
  };
}

export function ayarValue(a: Ayar): string {
  return `osmanlica:${a.osmanlica},yon:${a.yon}`;
}

/** The class of <body> for the Ottoman font (app/globals.css). */
export function fontClass(a: Ayar): string {
  return `of-${a.osmanlica}`;
}
