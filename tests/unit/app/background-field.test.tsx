import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundField } from "@/components/background-field";

// jsdom has no canvas; a chainable no-op context lets the drawing code run.
function fakeContext(): CanvasRenderingContext2D {
  const handler: ProxyHandler<object> = {
    get: (target, key) => (key in target ? Reflect.get(target, key) : () => proxy),
    set: (target, key, value) => Reflect.set(target, key, value),
  };
  const proxy = new Proxy({}, handler);
  return proxy as CanvasRenderingContext2D;
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => fakeContext() as unknown as ReturnType<HTMLCanvasElement["getContext"]>,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BackgroundField", () => {
  it("is a decorative layer hidden from assistive technology and the pointer", () => {
    mockReducedMotion(false);
    const { container } = render(<BackgroundField />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.className).toContain("fixed");
    expect(layer.querySelector("a, button, input, [tabindex]")).toBeNull();
  });

  it("animates when motion is allowed", () => {
    mockReducedMotion(false);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    render(<BackgroundField />);
    expect(raf).toHaveBeenCalled();
  });

  it("draws one static frame and never animates when reduced motion is requested", () => {
    mockReducedMotion(true);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    render(<BackgroundField />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });
});
