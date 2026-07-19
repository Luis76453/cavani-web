/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B132B', // Navy Profundo
          light: '#1C2541',
          dark: '#050A14'
        },
        steel: {
          DEFAULT: '#415A77', // Azul Acero
          light: '#778DA9',
          dark: '#2C3E50'
        },
        neutral: {
          light: '#F8F9FA', // Gris Muy Claro
          dark: '#E0E1DD' // Warm Grey
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif']
      }
    },
  },
  plugins: [],
}
