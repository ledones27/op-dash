/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e17',
          card: '#111827',
          hover: '#1a2332',
        },
        accent: {
          gold: '#f0b90b',
          green: '#0ecb81',
          red: '#f6465d',
          blue: '#1e80ff',
        },
        text: {
          primary: '#eaecef',
          secondary: '#848e9c',
          muted: '#5e6673',
        },
        border: {
          DEFAULT: '#1e2a3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
