import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept live as the viewport changes.
 *
 * Where `matchMedia` is missing (jsdom in unit tests) it answers `fallback`,
 * so a layout switch can default to the desktop layout there.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () =>
    typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : fallback,
  );
}
