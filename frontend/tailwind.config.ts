import type { Config } from 'tailwindcss';

// Restrained, single-accent dark theme. Replaces the previous multi-color
// gradient + glow palette (purple/blue radial glows, colored ring shadows)
// with flat surfaces, a single accent used sparingly, and a defined text
// scale instead of arbitrary white/NN opacity values. See the audit report,
// section 5 (Frontend / UX Findings) and the implementation report's UI/UX
// section for the reasoning.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F9FAFB',
        surface: '#FFFFFF',
        surfaceHover: '#F3F4F6',
        border: '#E5E7EB',
        borderStrong: '#D1D5DB',
        accent: '#000000',
        accentMuted: '#F3F4F6',
        textPrimary: '#111827',
        textSecondary: '#4B5563',
        textTertiary: '#6B7280',
        danger: '#EF4444',
        success: '#10B981',
        sidebar: {
          bg: '#0F172A',
          surface: '#1E293B',
          surfaceHover: '#172554',
          border: '#1E293B',
          borderStrong: '#172554',
          textPrimary: '#F8FAFC',
          textSecondary: '#94A3B8',
          textTertiary: '#64748B',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4)',
        popover: '0 8px 24px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
