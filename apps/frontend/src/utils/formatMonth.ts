import type { Lang } from "@/contexts/langContext";

const LOCALE: Record<Lang, string> = { en: "en-GB", he: "he-IL" };

export function formatYM(
  ym: string,
  lang: Lang,
  format: "short" | "long" = "short",
): string {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(
    LOCALE[lang],
    {
      month: format,
      year: "numeric",
    },
  );
}

export function formatISODate(
  iso: string,
  lang: Lang,
  opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" },
): string {
  return new Date(iso).toLocaleDateString(LOCALE[lang], opts);
}
