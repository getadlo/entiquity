import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0D1B16",   // near-black with a green cast
          soft: "#44564E",      // secondary text
          faint: "#71837B",     // tertiary text
        },
        accent: {
          DEFAULT: "#08312A",   // deep pine green — brand anchor
          hover: "#052019",
          soft: "#E4F7EC",      // pale green tint for badges / active fills
          ring: "#8BEFBE",
        },
        bright: {
          DEFAULT: "#00E47C",   // electric green — highlights on dark surfaces
          soft: "#66F2AE",
          deep: "#00A65B",      // same green, deepened for large text on white
        },
        line: "#E3E9E5",        // subtle green-gray borders
        canvas: "#F5F8F6",      // app background wash
        danger: "#B3372F",
        warn: "#9A6B15",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(8,49,42,0.05), 0 4px 16px rgba(8,49,42,0.05)",
        pop: "0 8px 30px rgba(8,49,42,0.12)",
      },
      borderRadius: { card: "14px" },
    },
  },
  plugins: [],
};
export default config;
