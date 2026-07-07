import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Luminous Engine — Surface hierarchy (light editorial)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-lowest': 'rgb(var(--surface-lowest) / <alpha-value>)',
        'surface-low': 'rgb(var(--surface-low) / <alpha-value>)',
        'surface-container': 'rgb(var(--surface-container) / <alpha-value>)',
        'surface-highest': 'rgb(var(--surface-highest) / <alpha-value>)',
        'surface-bright': 'rgb(var(--surface-bright) / <alpha-value>)',

        // Ink (text on surface) — primary, soft, muted
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',

        // Brand — Energy (primary green) + Water (secondary blue)
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft) / <alpha-value>)',
        'primary-container': 'rgb(var(--primary-container) / <alpha-value>)',
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',

        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        'secondary-soft': 'rgb(var(--secondary-soft) / <alpha-value>)',

        // Aliases for backwards compatibility with existing components
        brand: 'rgb(var(--primary) / <alpha-value>)',
        brand2: 'rgb(var(--primary-soft) / <alpha-value>)',
        accent: 'rgb(var(--secondary) / <alpha-value>)',

        // Outline — used at 10-20% opacity only (ghost border)
        'outline-variant': 'rgb(var(--outline-variant) / <alpha-value>)',
        line: 'rgb(var(--outline-variant) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        num: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { content: '1280px' },
      borderRadius: {
        DEFAULT: '0.5rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        // Ambient — never pure black, always tinted with on-surface
        ambient: '0 24px 40px -22px rgba(11, 28, 48, 0.08), 0 1px 0 rgba(255,255,255,0.7) inset',
        'ambient-lg': '0 32px 60px -28px rgba(11, 28, 48, 0.12), 0 1px 0 rgba(255,255,255,0.7) inset',
        glow: '0 0 0 6px rgb(var(--primary-soft) / 0.18)',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'gradient': 'gradient 12s ease infinite',
        'blink': 'blink 1s step-start infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        gradient: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        blink: { '0%,50%': { opacity: '1' }, '50.01%,100%': { opacity: '0' } },
        pulseSoft: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
      },
      backdropBlur: {
        glass: '16px',
        'glass-strong': '24px',
      },
    },
  },
  plugins: [],
} satisfies Config;
