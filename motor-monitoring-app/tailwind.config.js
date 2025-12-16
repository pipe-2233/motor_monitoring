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
          bg: '#0a0e27',
          secondary: '#131a3a',
          card: '#1a1f3a',
          hover: '#222947',
        },
        purple: {
          main: '#8b5cf6',
          light: '#a78bfa',
          dark: '#6d28d9',
        },
        phase: {
          a: '#ef4444',
          b: '#eab308',
          c: '#3b82f6',
        }
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
