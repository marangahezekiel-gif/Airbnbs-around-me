import type { Config } from 'tailwindcss';

/**
 * Brand palette: Airbnb-inspired (warm white + coral) but our own –
 * a deeper charcoal for text and a slightly orange-leaning coral.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#FFF3F1',
          100: '#FFE3DF',
          200: '#FFC7BF',
          300: '#FFA195',
          400: '#FF7A6B',
          500: '#FF5A4D',
          600: '#F0402F',
          700: '#C9301F',
        },
        charcoal: {
          50: '#F7F7F6',
          100: '#EDEEEE',
          200: '#DADCDD',
          300: '#BFC3C6',
          400: '#8E959B',
          500: '#6A7178',
          600: '#4A5157',
          700: '#33393E',
          800: '#272C30',
          900: '#1F2328',
        },
        sand: {
          50: '#FDFCFA',
          100: '#FAF7F2',
          200: '#F1ECE3',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        pin: '0 1px 2px rgba(31,35,40,.18), 0 0 0 1px rgba(31,35,40,.10)',
        float: '0 18px 50px -12px rgba(31,35,40,.28)',
        sheet: '0 -8px 30px rgba(31,35,40,.16)',
        card: '0 1px 3px rgba(31,35,40,.08), 0 8px 24px -8px rgba(31,35,40,.12)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(.6)', opacity: '.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(.2,.6,.3,1) infinite',
        'fade-up': 'fade-up .6s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
