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
        // Calmer, more neutral primary than a consumer/marketing palette -
        // a desaturated indigo/slate that reads as "internal tool", not
        // "product landing page". Linear/Stripe-dashboard caliber.
        primary: {
          50: "#f5f6fa",
          100: "#eceef5",
          200: "#d6dbe8",
          300: "#b1bad6",
          400: "#8793bd",
          500: "#64719f",
          600: "#4c5780",
          700: "#3d4668",
          800: "#333a54",
          900: "#2c3147",
          950: "#1b1e2c",
        },
        // Distinct, unambiguous status colors - each status state
        // (pending/approved/rejected/refunded, open/resolved, active/
        // expired/cancelled, suspended) maps to exactly one of these so
        // badges stay visually distinguishable at a glance.
        status: {
          pending: "#b45309",
          "pending-bg": "#fef3c7",
          approved: "#15803d",
          "approved-bg": "#dcfce7",
          rejected: "#b91c1c",
          "rejected-bg": "#fee2e2",
          refunded: "#6d28d9",
          "refunded-bg": "#ede9fe",
          neutral: "#374151",
          "neutral-bg": "#e5e7eb",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
