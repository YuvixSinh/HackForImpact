import { THEME_STORAGE_KEY } from "./theme";

/**
 * Inlined in <head> so the saved theme is applied before first paint, avoiding a
 * light/dark flash on reload. It mirrors resolveTheme/applyTheme in theme.ts and
 * must stay dependency-free because it runs before any bundle loads.
 */
export const themeInitScript = `(function () {
  var theme = null;
  try {
    var stored = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (stored === "light" || stored === "dark") theme = stored;
  } catch (e) {}
  if (!theme) {
    var prefersDark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    theme = prefersDark ? "dark" : "light";
  }
  var root = document.documentElement;
  if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
  root.style.colorScheme = theme;
})();`;
