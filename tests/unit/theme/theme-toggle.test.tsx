import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeToggle", () => {
  it("switches to dark, persists the choice, and switches back", async () => {
    render(<ThemeToggle />);
    const button = await screen.findByRole("button", { name: /switch to dark theme/i });

    act(() => fireEvent.click(button));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    // The label follows the <html> class via a MutationObserver, which fires asynchronously.
    const back = await screen.findByRole("button", { name: /switch to light theme/i });
    act(() => fireEvent.click(back));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("starts from the theme already applied by the init script", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: /switch to light theme/i })).toBeTruthy();
  });
});
