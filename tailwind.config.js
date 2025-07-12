module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './main.ts',
    './desktop-viewer.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#f7f8fa',
        window: '#ffffff',
        border: '#e0e3e8',
        accent: '#6c63ff',
        accentLight: '#a3bffa',
        text: '#22223b',
        textMuted: '#6c757d',
        // Dark mode colors
        dark: {
          background: '#0f1419',
          window: '#1a1f2e',
          border: '#2d3748',
          text: '#e2e8f0',
          textMuted: '#a0aec0',
        },
        // Semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      borderRadius: {
        xl: '1rem',
        lg: '0.75rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 24px 0 rgba(60,72,88,0.08)',
        'soft-lg': '0 10px 40px 0 rgba(60,72,88,0.12)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}; 