/**
 * Bushi (武士) design system — Tailwind preset.
 *
 * Design tone: disciplined, premium, athletic, elegant, sharp, calm.
 * Palette: deep ink neutrals with a single restrained accent ("kiai" red-orange)
 * plus a cool "steel" secondary. No purple AI gradients, no cliché motifs.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral ink scale — the backbone of the system.
        ink: {
          50: '#f6f7f8',
          100: '#eceef0',
          200: '#d5d9dd',
          300: '#b0b7bf',
          400: '#848f9a',
          500: '#657078',
          600: '#4f5860',
          700: '#3f464d',
          800: '#2a2f34',
          900: '#1a1d21',
          950: '#0e1013',
        },
        // Primary accent — a restrained, disciplined red-orange ("kiai").
        kiai: {
          50: '#fff3ee',
          100: '#ffe2d4',
          200: '#ffc0a3',
          300: '#ff9668',
          400: '#f96a37',
          500: '#e8481a',
          600: '#c8360f',
          700: '#a12a10',
          800: '#7f2513',
          900: '#682213',
          950: '#380d06',
        },
        // Cool secondary — "steel" for live-status, links, focus rings.
        steel: {
          50: '#f0f6fb',
          100: '#dcebf5',
          200: '#c0dcee',
          300: '#95c5e2',
          400: '#63a6d1',
          500: '#4189bd',
          600: '#316ca0',
          700: '#2a5782',
          800: '#274a6c',
          900: '#243f5b',
          950: '#18293d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
        jp: ['"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,16,19,0.04), 0 4px 16px rgba(14,16,19,0.06)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)',
        glow: '0 0 0 1px rgba(232,72,26,0.25), 0 8px 30px rgba(232,72,26,0.15)',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 1.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
