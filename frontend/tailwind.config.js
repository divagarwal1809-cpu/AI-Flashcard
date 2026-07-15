/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFFDF5",
        primary: "#FFD93D", // Vivid Yellow
        secondary: "#FF6B6B", // Hot Red
        accent: "#C4B5FD", // Soft Violet
        success: "#4ADE80", // Bright Green
        ink: "#000000"
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '8px 8px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
