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
  /** the Latin words in the colors of the origins of their roots */
  koken: boolean;
};

export const DEFAULT_AYAR: Ayar = { osmanlica: "husrev", yon: "ltr", koken: false };

export function parseAyar(value: string | undefined): Ayar {
  const pairs = new Map((value ?? "").split(",").map((p) => p.split(":") as [string, string]));
  return {
    osmanlica: pairs.get("osmanlica") === "seherazade" ? "seherazade" : "husrev",
    yon: pairs.get("yon") === "rtl" ? "rtl" : "ltr",
    koken: pairs.get("koken") === "1",
  };
}

export function ayarValue(a: Ayar): string {
  return `osmanlica:${a.osmanlica},yon:${a.yon},koken:${a.koken ? 1 : 0}`;
}

/** The class of <body> for the Ottoman font (app/globals.css). */
export function fontClass(a: Ayar): string {
  return `of-${a.osmanlica}`;
}
