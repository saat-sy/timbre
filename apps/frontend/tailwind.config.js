/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#2d231bff', // Deep Navy
          secondary: '#383324ff', // Lighter Navy
        },
        accent: {
          primary: '#ee872c', // Pastel Orange
          secondary: '#f95c34', // Soft Red
        },
        text: {
          primary: '#ffffff',
          secondary: '#a1a1aa',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'liquid-float': 'liquid-float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
      },
      keyframes: {
        'liquid-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: 0.5, filter: 'blur(20px)' },
          '50%': { opacity: 0.8, filter: 'blur(25px)' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.liquid-glass': {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
        },
        '.liquid-glass-primary': {
          background: 'rgba(255, 85, 0, 0.08)', // Orange tint
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 85, 0, 0.15)',
          borderRadius: '16px',
        },
        '.liquid-glass-secondary': {
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
        },
        '.liquid-glass-accent': {
          background: 'rgba(255, 0, 85, 0.08)', // Red tint
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 0, 85, 0.15)',
          borderRadius: '20px',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
