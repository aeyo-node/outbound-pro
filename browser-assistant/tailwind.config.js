/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/popup/index.html', './src/popup/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Swaram brand palette (matches dashboard accents)
        swaram: {
          gold: '#FFD166',
          goldDark: '#e6b34d',
          ink: '#0A0A0A',
          panel: '#121212',
          line: 'rgba(255,255,255,0.10)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
