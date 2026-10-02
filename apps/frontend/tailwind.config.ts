import type { Config } from "tailwindcss";

/**
 * The palette lives in CSS custom properties so it can be swapped per theme,
 * but a bare `var(--x)` cannot carry Tailwind's `/50` opacity modifier — the
 * modifier is silently dropped and the utility renders transparent. Routing
 * each colour through `color-mix` lets `<alpha-value>` do its job while the
 * variables stay usable directly as `bg-[var(--surface)]`.
 */
const alpha = (name: string) =>
  `color-mix(in oklch, var(${name}) calc(<alpha-value> * 100%), transparent)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        beet: {
          DEFAULT: alpha("--beet"),
          bright: alpha("--beet-bright"),
          dim: alpha("--beet-dim"),
          glow: "var(--beet-glow)",
          tint: alpha("--beet-tint"),
        },
        rose: alpha("--rose"),
        surface: {
          DEFAULT: alpha("--surface"),
          2: alpha("--surface2"),
          3: alpha("--surface3"),
        },
        border: {
          DEFAULT: alpha("--border"),
          strong: alpha("--border-strong"),
        },
        text: {
          DEFAULT: alpha("--text"),
          muted: alpha("--text-muted"),
          dim: alpha("--text-dim"),
        },
        success: alpha("--success"),
        warning: alpha("--warning"),
        danger: alpha("--danger"),
      },
      fontFamily: {
        sans: ["Assistant", "system-ui", "sans-serif"],
        serif: ["Frank Ruhl Libre", "Georgia", "serif"],
      },
      fontSize: {
        // A 14px base on a ~1.2 scale. Micro sizes get extra leading so the
        // Hebrew glyphs, which have no ascender relief, still breathe.
        micro: ["11px", { lineHeight: "1.45" }],
        label: ["12px", { lineHeight: "1.4" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["14px", { lineHeight: "1.55" }],
        lead: ["16px", { lineHeight: "1.5" }],
        title: ["20px", { lineHeight: "1.25" }],
        page: ["26px", { lineHeight: "1.18" }],
        hero: ["34px", { lineHeight: "1.1" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        pop: "var(--shadow-pop)",
        modal: "var(--shadow-modal)",
      },
      keyframes: {
        sheetIn: {
          from: { opacity: "0", transform: "translateY(12px) scale(0.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        sheetIn: "sheetIn 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        fadeIn: "fadeIn 140ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
