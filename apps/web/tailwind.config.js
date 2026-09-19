/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#071018",
        surface: "#0D1F2D",
        "surface-card": "#112738",
        "surface-border": "#19364C",
        "surface-hover": "#153046",
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#3BB48C", // Official MLite Mint/Teal
          500: "#2EB88A",
          600: "#249670",
          700: "#1A7456",
          800: "#13523D",
          900: "#0D3326",
          950: "#071F17",
        },
      },
    },
  },
  plugins: [],
};
