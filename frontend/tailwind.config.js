/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:          '#F97316',
          'orange-dark':   '#EA6A0A',
          'orange-light':  '#FED7AA',
          charcoal:        '#1C1C1E',
          'charcoal-light':'#2C2C2E',
          'charcoal-mid':  '#3A3A3C',
          gray:            '#6B7280',
          'gray-light':    '#F3F4F6',
          'gray-mid':      '#E5E7EB',
        }
      },
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        display: ['Barlow Condensed', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};