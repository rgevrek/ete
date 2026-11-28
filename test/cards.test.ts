import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { apiClientOf, parseTokens } from "@/lib/auth/api-token";
import { pick, spell, spellingCards, vocabularyCards } from "@/lib/cards";

const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe("learning cards for other systems", () => {
  it("write a word in its three alphabets", () => {
    expect(spell("hakikat")).toEqual({ latin: "hakikat", ottoman: "حقيقت", ete: "هاكىِكات" });
  });

  it("pick different items at random until enough fit", () => {
    expect(pick([1, 2, 3, 4], 2, (n) => (n % 2 ? null : n * 10), seq(0, 0.3, 0.5, 0.8))).toEqual([20, 40]);
  });

  it("give words of the lügat with their meanings and pages, and words of the books to spell", () => {
    const [vocabulary] = vocabularyCards(1, seq(0.42));
    expect(vocabulary.meanings.length).toBeGreaterThan(0);
    expect(vocabulary.ottoman).not.toBe("");
    const [spelling] = spellingCards(1, seq(0.42));
    expect(spelling.count).toBeGreaterThanOrEqual(20);
    expect(spelling.ottoman).not.toBe("");
  });

  it("take a system's token by its hash only", () => {
    const hash = createHash("sha256").update("ete_secret").digest("hex");
    const tokens = parseTokens(`tadil:${hash}, broken:xyz`);
    expect(tokens.map((t) => t.name)).toEqual(["tadil"]);
    const request = (token: string) => new Request("http://x/api/v1/cards", { headers: { authorization: `Bearer ${token}` } });
    expect(apiClientOf(request("ete_secret"), tokens)).toBe("tadil");
    expect(apiClientOf(request("other"), tokens)).toBeNull();
  });
});
