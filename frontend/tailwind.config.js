/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F0F9F8',
          100: '#D8F0EE',
          200: '#B2E2DE',
          300: '#83CEC8',
          400: '#4EB5AD',
          500: '#2A9A92',
          600: '#177F78',
          700: '#065F5B',
          800: '#054F4C',
          900: '#04403F',
          950: '#022828',
        },
        yellow: {
          signal: '#FFD60A',
          hover: '#E5C000',
          tint: '#FFF9D6',
        },
        'signal-yellow': '#FFD60A',
        ink: {
          DEFAULT: '#0F1B1B',
          light: '#243434',
          dark: '#0A0F0F',
        },
        surface: {
          light: '#F8FAFA',
          band: '#F3F5F5',
          dark: '#022828',
          cardDark: '#043433',
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Oswald"', 'sans-serif'],
        condensed: ['"Oswald"', 'sans-serif'],
        sans: ['"Poppins"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(4, 64, 63, 0.08)',
        'soft-lg': '0 10px 30px -4px rgba(4, 64, 63, 0.12)',
        'yellow-glow': '0 0 25px -3px rgba(255, 214, 10, 0.4)',
      }
    },
  },
  plugins: [],
}
