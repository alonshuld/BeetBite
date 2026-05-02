import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        beet: {
          DEFAULT: "var(--beet)",
          bright: "var(--beet-bright)",
          dim: "var(--beet-dim)",
          glow: "var(--beet-glow)",
        },
        rose: "var(--rose)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface2)",
          3: "var(--surface3)",
        },
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          dim: "var(--text-dim)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["DM Serif Display", "serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [],
} satisfies Config;
