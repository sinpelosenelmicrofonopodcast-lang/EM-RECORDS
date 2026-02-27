import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#FFFFFF",
        gold: "#C6A85B",
        muted: "#8D8D8D",
        surface: "#101010"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(198,168,91,0.35), 0 12px 48px rgba(198,168,91,0.18)"
      },
      backgroundImage: {
        "gold-fade":
          "linear-gradient(120deg, rgba(198,168,91,0.28), rgba(198,168,91,0.02) 45%, rgba(198,168,91,0.18) 100%)"
      },
      keyframes: {
        reveal: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(198,168,91,0.2)" },
          "50%": { boxShadow: "0 0 24px rgba(198,168,91,0.35)" }
        }
      },
      animation: {
        reveal: "reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        glowPulse: "glowPulse 2.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
