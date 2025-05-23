// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}", // Optional, for legacy pages dir
    "./node_modules/magicui/**/*.{js,ts,jsx,tsx}", // REQUIRED for magicui
  ],
  theme: {
    extend: {},
  },
  plugins: [require('magicui')],
}