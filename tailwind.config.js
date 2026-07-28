/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        positive: 'var(--positive)',
        'positive-bg': 'var(--positive-bg)',
        negative: 'var(--negative)',
        'negative-bg': 'var(--negative-bg)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        info: 'var(--info)',
        'info-bg': 'var(--info-bg)',
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8b84b',
          dark: '#a8882e',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 0.25rem)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 0.25rem)',
        '2xl': 'calc(var(--radius) + 0.5rem)',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 4px 24px rgba(201, 168, 76, 0.15)',
        'gold-lg': '0 8px 40px rgba(201, 168, 76, 0.2)',
        'premium': '0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)',
        'premium-lg': '0 4px 6px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};