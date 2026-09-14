/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        cyber: {
          bg: '#0d1117',
          surface: '#161b22',
          card: '#21262d',
          border: '#30363d',
          accent: '#e84a5f',    // Accent red requested
          secondary: '#00b4d8', // Secondary cyan requested
          neon: '#10b981',
          muted: '#8b949e',
          lightBg: '#f6f8fa',
          lightSurface: '#ffffff',
          lightCard: '#f0f2f5',
          lightBorder: '#d0d7de',
          lightText: '#1f2328'
        }
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: '100%',
            fontFamily: 'Inter, sans-serif',
            color: '#c9d1d9',
            a: {
              color: '#00b4d8',
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                color: '#38bdf8',
                textDecoration: 'underline',
              },
            },
            h1: { color: '#f0f6fc', fontWeight: '800' },
            h2: { color: '#f0f6fc', fontWeight: '700', borderBottom: '1px solid #30363d', paddingBottom: '0.4rem', marginTop: '2rem' },
            h3: { color: '#e6edf3', fontWeight: '600', marginTop: '1.5rem' },
            h4: { color: '#c9d1d9', fontWeight: '600' },
            strong: { color: '#f0f6fc' },
            code: {
              fontFamily: 'JetBrains Mono, monospace',
              color: '#00b4d8',
              backgroundColor: 'rgba(110, 118, 129, 0.2)',
              padding: '0.15rem 0.35rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
              fontWeight: '500',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: '#161b22',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: '0.5rem',
              padding: '1rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              fontSize: '0.85rem',
              color: 'inherit',
            },
            table: {
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: '0.875rem',
            },
            th: {
              backgroundColor: '#161b22',
              color: '#f0f6fc',
              border: '1px solid #30363d',
              padding: '0.625rem 0.875rem',
              textAlign: 'left',
            },
            td: {
              border: '1px solid #30363d',
              padding: '0.625rem 0.875rem',
              backgroundColor: 'rgba(22, 27, 34, 0.4)',
            },
            blockquote: {
              color: '#8b949e',
              borderLeftColor: '#e84a5f',
              backgroundColor: 'rgba(232, 74, 95, 0.08)',
              padding: '0.75rem 1.25rem',
              borderRadius: '0 0.5rem 0.5rem 0',
              fontStyle: 'normal',
            },
            hr: {
              borderColor: '#30363d',
              margin: '2rem 0',
            },
            ul: { listStyleType: 'disc' },
            ol: { listStyleType: 'decimal' },
            li: { marginTop: '0.25rem', marginBottom: '0.25rem' }
          },
        },
        light: {
          css: {
            color: '#1f2328',
            a: {
              color: '#0969da',
              '&:hover': {
                color: '#0550ae',
              },
            },
            h1: { color: '#1f2328' },
            h2: { color: '#1f2328', borderBottom: '1px solid #d0d7de' },
            h3: { color: '#1f2328' },
            h4: { color: '#1f2328' },
            strong: { color: '#1f2328' },
            code: {
              color: '#cf222e',
              backgroundColor: '#afb8c133',
            },
            pre: {
              backgroundColor: '#f6f8fa',
              color: '#1f2328',
              border: '1px solid #d0d7de',
            },
            th: {
              backgroundColor: '#f6f8fa',
              color: '#1f2328',
              border: '1px solid #d0d7de',
            },
            td: {
              border: '1px solid #d0d7de',
              backgroundColor: '#ffffff',
            },
            blockquote: {
              color: '#57609a',
              borderLeftColor: '#e84a5f',
              backgroundColor: 'rgba(232, 74, 95, 0.05)',
            },
            hr: { borderColor: '#d0d7de' }
          }
        }
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
