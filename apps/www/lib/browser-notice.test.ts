import { afterEach, expect, test, vi } from "vitest";
import { isRecognizedChromium } from "../app/browser-notice";

afterEach(() => vi.unstubAllGlobals());

const chromeUA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const safariUA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

for (const { name, ua, brands, visible, unavailable } of [
  {
    name: "Chromium client hints",
    ua: "",
    brands: ["Not A Brand", "Chromium"],
    visible: false,
  },
  { name: "Chrome user-agent fallback", ua: chromeUA, visible: false },
  {
    name: "Edge user-agent fallback",
    ua: `${chromeUA} Edg/142.0.0.0`,
    visible: false,
  },
  { name: "Safari identification", ua: safariUA, visible: true },
  {
    name: "Firefox identification",
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0",
    visible: true,
  },
  {
    name: "Chrome on iOS",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1",
    visible: true,
  },
  {
    name: "Chrome on iOS requesting a desktop site",
    ua: `${safariUA} CriOS/142`,
    visible: true,
  },
  {
    name: "iOS branding overrides Chromium hints",
    ua: "iPad CriOS/142",
    brands: ["Chromium"],
    visible: true,
  },
  { name: "unknown identification", ua: "", visible: true },
  {
    name: "unavailable identification",
    ua: "",
    unavailable: true,
    visible: true,
  },
]) {
  test(`browser identification: ${name}`, () => {
    vi.stubGlobal("navigator", {
      userAgent: ua,
      get userAgentData() {
        if (unavailable) throw new Error("Browser identification unavailable");
        return brands
          ? { brands: brands.map((brand) => ({ brand })) }
          : undefined;
      },
    });
    expect(isRecognizedChromium()).toBe(!visible);
  });
}
