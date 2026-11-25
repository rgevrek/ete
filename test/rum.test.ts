import { afterEach, describe, expect, it, vi } from "vitest";

// The SDK as it really is before initializing: `faro.api` is already set (a no-op API).
const sdk = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock("@grafana/faro-web-sdk", () => ({
  faro: { api: {} },
  initializeFaro: sdk.init,
  getWebInstrumentations: () => [],
}));

const { startRum } = await import("@/lib/rum");
const at = (hostname: string) => vi.stubGlobal("location", { hostname, origin: `https://${hostname}` });

describe("real user monitoring", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts Faro once on the app's host, sending to /rum/collect there, and not on localhost", () => {
    at("localhost");
    startRum({ name: "ete", version: "1" });
    expect(sdk.init).not.toHaveBeenCalled();

    at("ete.example");
    startRum({ name: "ete", version: "1" });
    startRum({ name: "ete", version: "1" });
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init.mock.calls[0]![0]).toMatchObject({ url: "https://ete.example/rum/collect", app: { name: "ete" } });
  });
});
