import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";
import { themeInitScript } from "@/lib/theme/init-script";

function mockSystemDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark && query === "(prefers-color-scheme: dark)",
  }));
}

function runInitScript() {
  // The script is inlined in <head> so it runs before first paint (no flash).
  new Function(themeInitScript)();
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
});

describe("themeInitScript", () => {
  it("applies a stored dark theme before React loads", () => {
    mockSystemDark(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps a stored light theme even when the system prefers dark", () => {
    mockSystemDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("follows the system preference when nothing is stored", () => {
    mockSystemDark(true);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not throw when storage access is blocked", () => {
    mockSystemDark(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runInitScript).not.toThrow();
    vi.restoreAllMocks();
  });
});
