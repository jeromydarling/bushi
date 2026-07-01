const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@bushi/config/tailwind')],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [
    // `not-dark:` applies only when <html> does NOT have the `dark` class —
    // the mirror of Tailwind's built-in `dark:` (class strategy).
    plugin(({ addVariant }) => {
      addVariant('not-dark', 'html:not(.dark) &');
    }),
  ],
};
