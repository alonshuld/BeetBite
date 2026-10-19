import { Icon } from "@/components/atoms/Icon";
import { useTheme } from "@/contexts/useTheme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextLabel =
    theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text hover:border-border-strong"
      aria-label="Toggle theme"
      title={nextLabel}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
    </button>
  );
}
