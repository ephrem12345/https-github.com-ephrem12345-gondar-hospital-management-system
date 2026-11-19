import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EAF3FC",
          100: "#D3E5F8",
          200: "#A8C8F0",
          300: "#7BA9E7",
          400: "#4D89DC",
          500: "#2C74CE",
          600: "#1565C0",
          700: "#10509A",
          800: "#0D3F79",
          900: "#12345A",
          DEFAULT: "#1565C0",
        },
        "dark-blue": "#12345A",
        "light-blue": "#EAF3FC",
        background: {
          light: "#F5F7FA",
          dark: "#0B1626",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#101E33",
        },
        success: {
          DEFAULT: "#16A34A",
          soft: "#E8F7EE",
          dark: "#14532D",
        },
        warning: {
          DEFAULT: "#F59E0B",
          soft: "#FEF5E4",
          dark: "#78350F",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FDECEC",
          dark: "#7F1D1D",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-ethiopic)",
          "system-ui",
          "sans-serif",
        ],
        amharic: [
          "var(--font-noto-ethiopic)",
          "var(--font-inter)",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)",
        "card-hover":
          "0 4px 8px rgba(16, 24, 40, 0.08), 0 8px 24px rgba(16, 24, 40, 0.12)",
        dropdown:
          "0 4px 6px rgba(16, 24, 40, 0.05), 0 12px 24px rgba(16, 24, 40, 0.14)",
      },
      borderRadius: {
        card: "0.875rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "slide-in-left": "slide-in-left 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
