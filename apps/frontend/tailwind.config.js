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
          primary: '#0a0a0a',
          secondary: '#1a1a1a',
        },
        accent: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
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
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.liquid-glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
        },
        '.liquid-glass-primary': {
          background: 'rgba(99, 102, 241, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '16px',
        },
        '.liquid-glass-secondary': {
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
        },
        '.liquid-glass-accent': {
          background: 'rgba(139, 92, 246, 0.1)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '20px',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
