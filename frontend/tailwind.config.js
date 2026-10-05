const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        brand: {
          50: v('brand-50'),
          100: v('brand-100'),
          200: v('brand-200'),
          400: v('brand-400'),
          500: v('brand-500'),
          600: v('brand-600'),
          700: v('brand-700'),
          900: v('brand-900'),
        },
        accent: {
          400: v('accent-400'),
          500: v('accent-500'),
          600: v('accent-600'),
        },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),
        night: { 800: '#111a2e', 900: '#0b1220' },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        lift: '0 12px 32px -8px rgb(8 145 178 / 0.35)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        drive: { '0%': { transform: 'translateX(-10%)' }, '100%': { transform: 'translateX(110%)' } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease both',
        pop: 'pop .2s ease both',
        drive: 'drive 6s linear infinite',
      },
    },
  },
  plugins: [],
}
