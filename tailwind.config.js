/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'dark': {
          'primary': 'rgb(var(--color-dark-primary) / <alpha-value>)',
          'secondary': 'rgb(var(--color-dark-secondary) / <alpha-value>)',
          'accent': 'rgb(var(--color-dark-accent) / <alpha-value>)',
          'border': 'rgb(var(--color-dark-border) / <alpha-value>)',
          'text': 'rgb(var(--color-dark-text) / <alpha-value>)',
          'text-light': 'rgb(var(--color-dark-text-light) / <alpha-value>)',
        },
        'brand': {
          'primary': '#3b82f6',
          'success': '#10b981',
          'warning': '#f59e0b',
          'danger': '#ef4444',
          'info': '#06b6d4',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
