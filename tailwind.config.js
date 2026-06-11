/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        ink: "var(--ink)",
        sub: "var(--sub)",
        faint: "var(--faint)",
        line: "var(--line)",
        accent: "var(--accent)",
        income: "var(--income)",
        expense: "var(--expense)",
        neutral: "var(--neutral)",
      },
      fontFamily: {
        zen: ['"Zen Kaku Gothic New"', '"Anuphan"', "sans-serif"],
        mincho: ['"Shippori Mincho"', "serif"],
        thai: ['"Anuphan"', '"Zen Kaku Gothic New"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
