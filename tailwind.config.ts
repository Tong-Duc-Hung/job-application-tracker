import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/shared/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Renamed in spirit from "indigo brand" to "sky-blue brand" — same
        // token name (brand-*) so every existing Button/Sidebar/link that
        // already references it re-colors automatically, app-wide.
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        // New design-system tokens, introduced with the auth page redesign.
        // Kept alongside `brand` (not replacing it) so already-built pages
        // are unaffected until they get their own visual pass.
        ink: "#0F1524",
        "ink-soft": "#1A2236",
        "paper-muted": "#F6F7F9",
      },
      fontFamily: {
        // Overriding `sans` upgrades the whole app's base font to Inter
        // (previously just the browser default) — a safe, global quality
        // bump. `display` and `mono` are opt-in via font-display/font-mono.
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        // A restrained radius scale keeps controls, panels, and full-page
        // surfaces related without making every element pill-shaped.
        lg: "0.75rem",
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
