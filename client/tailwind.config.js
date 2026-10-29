/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        portal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Training portal: warm amber / orange, distinct from the agency
        // indigo (brand) and the client-portal teal (portal).
        train: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(15, 23, 42, 0.25)',
        portal: '0 22px 48px -22px rgba(13, 148, 136, 0.55)',
        'portal-sm': '0 10px 26px -16px rgba(13, 148, 136, 0.45)',
        train: '0 22px 48px -22px rgba(234, 88, 12, 0.55)',
        'train-sm': '0 10px 26px -16px rgba(234, 88, 12, 0.45)',
      },
      backgroundImage: {
        'brand-panel':
          'linear-gradient(150deg, #1e1b4b 0%, #312e81 42%, #075985 100%)',
        'portal-panel':
          'linear-gradient(135deg, #042f2e 0%, #0f766e 55%, #0e7490 100%)',
        'train-panel':
          'linear-gradient(135deg, #431407 0%, #9a3412 55%, #b45309 100%)',
      },
    },
  },
  plugins: [],
};
