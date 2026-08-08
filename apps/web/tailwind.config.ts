import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#F7F4EE",
          dark: "#EFE9DF",
        },
        forest: {
          DEFAULT: "#1B4332",
          light: "#2D6A4F",
          dark: "#081C15",
        },
        gold: {
          DEFAULT: "#C4A35A",
          light: "#D4B86A",
          dark: "#A88B3D",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(27, 67, 50, 0.18)",
        card: "0 4px 24px -8px rgba(27, 67, 50, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
