/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fff1f3",
          100: "#ffe1e6",
          200: "#ffc7d1",
          300: "#ff9fb1",
          400: "#ff6d89",
          500: "#f8406a",
          600: "#e51d57",
          700: "#c20f49",
          800: "#a10f44",
          900: "#881040",
          950: "#4c041e",
        },
        accent: {
          50: "#fff8ed",
          100: "#ffefd4",
          200: "#ffdca8",
          300: "#ffc171",
          400: "#ff9d38",
          500: "#ff7d12",
          600: "#f36107",
          700: "#c94808",
          800: "#9f380f",
          900: "#812f10",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f4f6",
          200: "#e8e6ea",
          300: "#d4d1d8",
          400: "#a9a4b0",
          500: "#7d7786",
          600: "#5c5664",
          700: "#453f4c",
          800: "#2e2a35",
          900: "#1c1a21",
          950: "#100f13",
        },
      },
      fontFamily: {
        display: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      boxShadow: {
        soft: "0 20px 45px -15px rgba(197, 24, 73, 0.25)",
        card: "0 10px 30px -10px rgba(28, 26, 33, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
