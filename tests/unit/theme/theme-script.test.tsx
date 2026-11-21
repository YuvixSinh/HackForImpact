import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeScript } from "@/components/theme-script";
import { themeInitScript } from "@/lib/theme/init-script";

afterEach(cleanup);

describe("ThemeScript", () => {
  it("renders an inert data block when React renders it in the browser", () => {
    // Browser-created scripts never execute; a non-JavaScript type also avoids React's
    // "Encountered a script tag" error after client navigations and server-action redirects.
    const { container } = render(<ThemeScript />);
    const script = container.querySelector("script");
    expect(script?.getAttribute("type")).toBe("text/plain");
    expect(script?.innerHTML).toBe(themeInitScript);
  });
});
