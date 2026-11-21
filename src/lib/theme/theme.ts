export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "autoship-theme";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** A valid stored choice wins; otherwise follow the operating-system preference. */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? "dark" : "light";
}

export function readStoredTheme(storage: ThemeStorage): Theme | null {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(storage: ThemeStorage, theme: Theme): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode, disabled site data); the theme still applies to this page.
  }
}

export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}
