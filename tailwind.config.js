/** @type {import('tailwindcss').Config} */
export default {
  content: ['./js/**/*.js', 'index.html'],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}