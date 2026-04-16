/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          bg: "#0A0D14",
          surface: "#111827",
          elevated: "#1C2333",
          accent: "#00D4AA",
          "accent-dim": "rgba(0,212,170,0.13)",
        },
      },
      borderRadius: { "2xl": "20px", "3xl": "28px" },
      boxShadow: {
        glow: "0 0 20px rgba(0,212,170,0.25)",
        lifted: "0 8px 40px rgba(0,0,0,0.6)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fadeUp 0.35s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}