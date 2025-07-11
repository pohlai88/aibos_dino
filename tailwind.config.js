module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
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
      },
      borderRadius: {
        xl: '1rem',
        lg: '0.75rem',
      },
      boxShadow: {
        soft: '0 4px 24px 0 rgba(60,72,88,0.08)',
      },
    },
  },
  plugins: [],
}; 