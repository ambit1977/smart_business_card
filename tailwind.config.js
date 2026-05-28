/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        paper: '#fafaf7',
        accent: '#1f6feb',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Hiragino Sans"', '"Noto Sans JP"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
