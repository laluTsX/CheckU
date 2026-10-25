/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        checku: {
          green: "#63B89F",     // Principal / Acciones / Botones
          mint: "#A8D8C8",      // Hover / Fondos suaves / Estados secundarios
          navy: "#172B4D",      // Tipografía principal / Encabezados / Estructura
          white: "#FFFFFF",     // Fondos limpios / Contraste
          slate: "#6F7F8A",     // Subtítulos / Bordes / UI neutra
          dark: "#0D1828",      // Modo oscuro / Elementos de alto contraste
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
