import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

/** A matchMedia stub whose answer can be flipped, firing change listeners. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    })),
  );
  return (next: boolean) => {
    matches = next;
    listeners.forEach((l) => l());
  };
}

describe("useMediaQuery", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("answers the fallback where matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useMediaQuery("(x)")).result.current).toBe(false);
    expect(renderHook(() => useMediaQuery("(x)", true)).result.current).toBe(
      true,
    );
  });

  it("follows the query as the viewport changes", () => {
    const set = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));
    expect(result.current).toBe(true);

    act(() => set(false));
    expect(result.current).toBe(false);
  });
});
