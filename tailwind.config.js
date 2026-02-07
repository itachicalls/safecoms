/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        terminal: {
          bg: '#0a0a0c',
          surface: '#0d0d10',
          elevated: '#121218',
          border: '#1e1e24',
          text: '#e4e4e7',
          muted: '#71717a',
          green: '#10b981',
          cyan: '#06b6d4',
          red: '#dc2626',
          warn: '#eab308',
        },
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(220, 38, 38, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.2)',
      },
      dropShadow: {
        'glow-red': '0 0 12px rgba(220, 38, 38, 0.4)',
      },
    },
  },
  plugins: [],
};
