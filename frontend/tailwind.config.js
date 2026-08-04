/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bgBase: '#FFFFFF',
        bgSurface: '#FAFAFA',
        textPrimary: '#111114',
        textMuted: '#6B7280',
        borderLight: '#E5E5E7',
        accentPrimary: '#2563EB',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(79, 209, 255, 0.4)',
        'glow-violet': '0 0 25px -5px rgba(123, 108, 255, 0.4)',
      },
    },
  },
  plugins: [],
}
