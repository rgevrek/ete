"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** The arrow keys turn the pages; right to left (without Latin) the left arrow is the next page. */
export function PageKeys({ prev, next }: { prev?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      const rtl = document.querySelector(".yazi")?.getAttribute("dir") === "rtl";
      const forward = e.key === (rtl ? "ArrowLeft" : "ArrowRight");
      const back = e.key === (rtl ? "ArrowRight" : "ArrowLeft");
      const target = forward ? next : back ? prev : undefined;
      if (target) {
        e.preventDefault();
        router.push(target);
      }
    }
    window.addEventListener("keydown", onKey);
    if (next) router.prefetch(next);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prev, next]);
  return null;
}
