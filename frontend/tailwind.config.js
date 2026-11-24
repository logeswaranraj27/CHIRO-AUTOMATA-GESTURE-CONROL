/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060b13',
          900: '#0a101d',
          850: '#0e1626',
          800: '#121c2e',
          700: '#1a273f',
        },
        charcoal: {
          950: '#0c111c',
          900: '#121a29',
          850: '#162033',
          800: '#1c283f',
          750: '#23324d',
          700: '#2b3c5c',
          600: '#3d527a',
        },
        electric: {
          cyan: '#06b6d4',
          sky: '#38bdf8',
          blue: '#3b82f6',
          indigo: '#6366f1',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'panel-hover': '0 10px 30px -4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(6, 182, 212, 0.1)',
        'glow-cyan': '0 0 18px rgba(6, 182, 212, 0.35)',
        'glow-blue': '0 0 18px rgba(59, 130, 246, 0.35)',
        'glow-rose': '0 0 20px rgba(244, 63, 94, 0.4)',
        'glow-emerald': '0 0 18px rgba(16, 185, 129, 0.35)',
      }
    },
  },
  plugins: [],
}
