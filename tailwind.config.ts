import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#101A2B",   // deep navy-charcoal text
          soft: "#42506B",      // secondary text
          faint: "#71809B",     // tertiary text
        },
        accent: {
          DEFAULT: "#0E7566",   // patina teal — calm, legal-grade
          hover: "#0A5F53",
          soft: "#E7F3F0",
          ring: "#B8DCD4",
        },
        line: "#E6E9EF",        // subtle gray borders
        canvas: "#F7F8FA",      // app background wash
        danger: "#B3372F",
        warn: "#9A6B15",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,26,43,0.05), 0 4px 16px rgba(16,26,43,0.05)",
        pop: "0 8px 30px rgba(16,26,43,0.12)",
      },
      borderRadius: { card: "14px" },
    },
  },
  plugins: [],
};
export default config;
