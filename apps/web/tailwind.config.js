/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: "#FFFFFF",
        surface: "#FFFFFF",
        "surface-subtle": "#F8FAFC",
        "surface-border": "#E2E8F0",
        brand: {
          50: "#F0FDF9",
          100: "#DCFCE7",
          200: "#BCE9DA",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#3BB48C", // Official Emerald / Teal Hex
          600: "#2FA07B",
          700: "#248566",
          800: "#1C6B52",
          900: "#14513E",
          950: "#0B2D22",
        },
      },
    },
  },
  plugins: [],
};
