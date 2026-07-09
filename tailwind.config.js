/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial de Arena Voleibol Club (arenavoleibolclub.com):
        // azul océano/turquesa como color principal, dorado arena como acento.
        brand: {
          50: '#edf6fa',
          100: '#d2e8f1',
          200: '#a9d2e3',
          300: '#74b4ce',
          400: '#3f93b4',
          500: '#1c7a9c',
          600: '#0a5b8a', // color principal (botones, enlaces)
          700: '#0a4a70',
          800: '#0a3d52',
          900: '#082e3f',
        },
        // Dorado arena/sol — acento de marca (#FFB923).
        arena: {
          50: '#fef8e7',
          100: '#fdefc2',
          200: '#fbdd84',
          300: '#f9cb4d',
          400: '#ffb923',
          500: '#f0a800',
          600: '#cc8a00',
          700: '#a36d05',
        },
        // Turquesa de apoyo (#1B9EAA).
        laguna: '#1b9eaa',
      },
    },
  },
  plugins: [],
};
