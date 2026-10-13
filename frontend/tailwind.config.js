/** @type {import('tailwindcss').Config} */
// SoftBarber — "Barbearia Clássica" design tokens.
// Paleta inspirada no poste de barbeiro (vermelho/branco/azul) sobre papel creme e tinta preta.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Superfícies
        paper: {
          DEFAULT: '#F2EADB', // fundo da página
          dark: '#E6DAC3',    // superfícies rebaixadas / hover
          deep: '#D9CAAE',    // trilhas, divisórias fortes
        },
        card: '#FAF5EA',      // cartões e modais
        // Tinta (texto e bordas)
        ink: {
          DEFAULT: '#1C1A17',
          soft: '#4A443B',    // texto secundário
          muted: '#7A7164',   // texto terciário / placeholders
          line: '#CDBFA6',    // divisórias suaves
        },
        // Cores do poste
        pole: {
          red: '#A8261D',
          'red-dark': '#871D16',
          'red-tint': '#F3DDD6',
          blue: '#1F3A5F',
          'blue-dark': '#162B47',
          'blue-tint': '#DCE3EC',
        },
        // Estados (apagados, sem neon)
        moss: { DEFAULT: '#4F6B3A', tint: '#E1E8D6' },
        mustard: { DEFAULT: '#9A6B12', tint: '#F2E4C4' },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sign: ['Oswald', '"Arial Narrow"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        stamp: '3px 3px 0 0 #1C1A17',
        'stamp-sm': '2px 2px 0 0 #1C1A17',
        'stamp-lg': '5px 5px 0 0 #1C1A17',
      },
      backgroundImage: {
        'pole-stripes':
          'repeating-linear-gradient(-45deg, #A8261D 0 10px, #FAF5EA 10px 20px, #1F3A5F 20px 30px, #FAF5EA 30px 40px)',
      },
    },
  },
  plugins: [],
};
