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
        brand: {
          cream:      '#E8DDD3',   // warm off-white — light text & surfaces
          gold:       '#C9A96E',   // muted bronze/gold — secondary accent
          slate:      '#415A77',   // slate blue — mid-tone UI elements
          terracotta: '#C46D3B',   // rich terracotta — primary warm accent
          navy:       '#1B2838',   // deep navy — primary dark background
          midnight:   '#0D1B2A',   // deepest midnight — darkest surfaces
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
