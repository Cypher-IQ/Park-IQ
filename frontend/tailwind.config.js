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
          950: '#04080F',
          900: '#0A0F1E',
          800: '#0D1526',
          700: '#111D35',
          600: '#172344',
        },
        cyan: {
          400: '#22E5FF',
          500: '#00D4FF',
          600: '#00B8E0',
        },
        violet: {
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%2300D4FF' stroke-opacity='0.04' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
        'slide-up':     'slideUp 0.5s ease-out both',
        'slide-down':   'slideDown 0.4s ease-out both',
        'fade-in':      'fadeIn 0.6s ease-out both',
        'scale-in':     'scaleIn 0.4s ease-out both',
        'drive-fast':   'drive 2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'spin-slow':    'spin-slow 8s linear infinite',
        'shimmer':      'shimmer 1.8s linear infinite',
        'radar-ring':   'radar-ring 2s ease-out infinite',
        'car-float':    'car-float 3s ease-in-out infinite',
        'glow-pulse':   'glow-pulse 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'car-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(-1deg)' },
          '50%':      { transform: 'translateY(-8px) rotate(1deg)' },
        },
        'glow-pulse': {
          from: { opacity: '0.5', width: '160px' },
          to:   { opacity: '1',   width: '220px' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 10px #00D4FF30, 0 0 20px #00D4FF10' },
          '100%': { boxShadow: '0 0 25px #00D4FF70, 0 0 50px #00D4FF30' },
        },
        slideUp: {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-16px)', opacity: '0' },
          to:   { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.92)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        drive: {
          '0%':   { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120vw)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'radar-ring': {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
