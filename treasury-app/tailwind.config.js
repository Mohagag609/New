/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // or 'media'
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
}
