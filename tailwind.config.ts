import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0A0E12", // fond
          800: "#0E141B",
          700: "#121A22",
          600: "#18222C",
          500: "#1F2C38",
        },
        line: "rgba(255,255,255,0.08)",
        lime: {
          DEFAULT: "#A3E635",
          soft: "#BEF264",
        },
        cyan: {
          DEFAULT: "#22D3EE",
        },
        rose: {
          DEFAULT: "#FB7185",
        },
        muted: "#8A97A6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(163,230,53,0.25), 0 8px 40px -8px rgba(163,230,53,0.35)",
        "glow-cyan": "0 0 0 1px rgba(34,211,238,0.3), 0 8px 40px -8px rgba(34,211,238,0.4)",
        "glow-rose": "0 0 0 1px rgba(251,113,133,0.3), 0 8px 40px -8px rgba(251,113,133,0.4)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px -20px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(163,230,53,0.10), transparent 60%)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
