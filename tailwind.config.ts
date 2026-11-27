import type { Config } from "tailwindcss";
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), sunken: v("sunken"), ink: v("ink"),
        muted: v("muted"), line: v("line"), accent: v("accent"),
        "accent-strong": v("accent-strong"), "on-accent": v("on-accent"),
        warn: v("warn"), risk: v("risk"),
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
export default config;
