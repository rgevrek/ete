"use client";

import { useEffect } from "react";

/** Marks the headline the page is in (the last one beginning on or before it) in the table of
 *  contents, opens the groups above it and scrolls to it. */
export function TocMark({ page }: { page: number }) {
  useEffect(() => {
    const toc = document.querySelector<HTMLDetailsElement>("details.icindekiler");
    if (!toc) return;
    // beside the page it is open, on a small screen closed
    if (matchMedia("(min-width: 961px)").matches) toc.open = true;
    let here: HTMLElement | undefined;
    for (const a of toc.querySelectorAll<HTMLElement>("a[data-i]")) {
      a.classList.remove("burada");
      if (Number(a.dataset.i) <= page) here = a;
    }
    if (!here) return;
    here.classList.add("burada");
    for (let d = here.closest("details"); d && d !== toc; d = d.parentElement?.closest("details") ?? null) d.open = true;
    const box = toc.getBoundingClientRect();
    const r = here.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) here.scrollIntoView({ block: "center" });
  }, [page]);
  return null;
}
