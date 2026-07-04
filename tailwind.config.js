/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./social-scheduler/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          pistachio: '#d4edc0',
          sage: '#a8c29b',
          earth: '#3a4a35',
          green: '#2d6a4f',
          clay: '#c47854',
          'pine-dark': '#1a2e21'
        }
      }
    },
  },
  plugins: [],
}
