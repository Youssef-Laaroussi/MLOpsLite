/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Anthropic Sans"',
          '"Styrene B"',
          '"Plus Jakarta Sans"',
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          '"Anthropic Serif"',
          '"Copernicus"',
          '"Galaxie Copernicus"',
          '"Tiempos Headline"',
          '"Tiempos Text"',
          '"Newsreader"',
          '"Lora"',
          'Georgia',
          'serif',
        ],
        display: [
          '"Anthropic Serif"',
          '"Copernicus"',
          '"Galaxie Copernicus"',
          '"Tiempos Headline"',
          '"Newsreader"',
          '"Lora"',
          'Georgia',
          'serif',
        ],
        mono: [
          '"Anthropic Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
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
