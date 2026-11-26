import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteMap } from "@/components/tracking/route-map";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 600 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
      unobserve() {}
    },
  );
});

describe("RouteMap", () => {
  it("supports keyboard panning and zooming from its accessible region", () => {
    render(
      <RouteMap
        origin="London"
        destination="Manchester"
        from={{ lat: 51.5072, lng: -0.1276 }}
        to={{ lat: 53.4808, lng: -2.2426 }}
        progress={0.4}
        label="In transit"
      />,
    );
    const map = screen.getByRole("region", { name: /route from London to Manchester/i });
    expect(map.getAttribute("tabindex")).toBe("0");
    const route = map.querySelector("line")!;
    const beforePan = route.getAttribute("x1");
    fireEvent.keyDown(map, { key: "ArrowRight" });
    expect(route.getAttribute("x1")).not.toBe(beforePan);

    const beforeZoom = map.querySelector("img")!.getAttribute("src");
    fireEvent.keyDown(map, { key: "+" });
    expect(map.querySelector("img")!.getAttribute("src")).not.toBe(beforeZoom);
  });
});
