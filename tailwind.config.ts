import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'oklch(0.97 0.005 70)',
        foreground: 'oklch(0.22 0.02 50)',
        card: 'oklch(0.995 0.002 90)',
        primary: {
          DEFAULT: 'oklch(0.65 0.19 50)',
          foreground: 'oklch(1 0 0)',
        },
        muted: {
          DEFAULT: 'oklch(0.93 0.008 70)',
          foreground: 'oklch(0.5 0.02 50)',
        },
        border: 'oklch(0.91 0.01 70)',
        ring: 'oklch(0.65 0.19 50)',
      },
      borderRadius: {
        base: '0.75rem',
      },
    },
  },
  plugins: [],
}
export default config
