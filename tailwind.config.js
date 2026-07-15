/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-raised': 'rgb(var(--ink-raised) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        clay: 'rgb(var(--clay) / <alpha-value>)',
        'clay-strong': 'rgb(var(--clay-strong) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Golos Text"', 'system-ui', 'sans-serif'],
        display: ['"PT Serif"', 'Georgia', 'serif'],
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
