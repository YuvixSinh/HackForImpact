import { afterEach, describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  saveTheme,
} from "@/lib/theme/theme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
});

describe("resolveTheme", () => {
  it("uses a valid stored theme over the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("falls back to the system preference when nothing valid is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
  });
});

describe("theme storage", () => {
  it("saves and reads back the chosen theme", () => {
    saveTheme(window.localStorage, "dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredTheme(window.localStorage)).toBe("dark");
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(readStoredTheme(window.localStorage)).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readStoredTheme(blocked)).toBeNull();
    expect(() => saveTheme(blocked, "light")).not.toThrow();
  });
});

describe("applyTheme", () => {
  it("toggles the dark class and colour scheme on the root element", () => {
    const root = document.documentElement;
    applyTheme(root, "dark");
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.colorScheme).toBe("dark");
    applyTheme(root, "light");
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });
});
