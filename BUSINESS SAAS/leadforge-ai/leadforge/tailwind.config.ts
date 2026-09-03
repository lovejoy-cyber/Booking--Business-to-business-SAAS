import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213A",
        paper: "#FAF8F4",
        charcoal: "#1C1F26",
        signal: "#E8A33D",
        moss: "#3E7C59",
        slate: {
          DEFAULT: "#8B93A1",
          light: "#E4E7EC"
        },
        rust: "#C1452D"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"]
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px"
      }
    }
  },
  plugins: []
};
export default config;
