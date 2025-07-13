const { colors, gradients, blur, elevation, typography, borderRadius, spacing, animation, zIndex, breakpoints } = require('./src/utils/designTokens.ts');

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
      // Colors from design tokens
      colors: {
        ...colors,
        // Legacy colors for backward compatibility
        background: colors.gray[50],
        window: colors.white,
        border: colors.gray[200],
        accent: colors.accent[500],
        accentLight: colors.accent[200],
        text: colors.gray[900],
        textMuted: colors.gray[600],
        // Dark mode colors
        dark: {
          background: colors.gray[900],
          window: colors.gray[800],
          border: colors.gray[700],
          text: colors.gray[100],
          textMuted: colors.gray[400],
        },
      },
      
      // Gradients from design tokens
      backgroundImage: {
        ...Object.fromEntries(
          Object.entries(gradients).flatMap(([category, categoryGradients]) =>
            Object.entries(categoryGradients).map(([name, gradient]) => [
              `gradient-${category}-${name}`,
              gradient
            ])
          )
        ),
      },
      
      // Blur from design tokens
      backdropBlur: blur,
      
      // Border radius from design tokens
      borderRadius: borderRadius,
      
      // Box shadows from design tokens
      boxShadow: {
        ...elevation,
        // Legacy shadows for backward compatibility
        soft: elevation.md,
        'soft-lg': elevation.lg,
        'inner-soft': elevation.inner.sm,
      },
      
      // Typography from design tokens
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      letterSpacing: typography.letterSpacing,
      
      // Spacing from design tokens
      spacing: spacing,
      
      // Animation from design tokens
      animation: {
        ...animation.classes,
        // Legacy animations for backward compatibility
        'fade-in': animation.classes.fadeIn,
        'slide-up': animation.classes.slideUp,
        'scale-in': animation.classes.scaleIn,
        'bounce-soft': animation.classes.bounceSoft,
      },
      keyframes: animation.keyframes,
      
      // Z-index from design tokens
      zIndex: zIndex,
      
      // Breakpoints from design tokens
      screens: {
        xs: breakpoints.xs,
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
        '2xl': breakpoints['2xl'],
      },
      
      // Animation duration and easing
      transitionDuration: animation.duration,
      transitionTimingFunction: animation.easing,
    },
  },
  plugins: [
    // Custom plugin for glassmorphism utilities
    function({ addUtilities, theme }) {
      const glassmorphismUtilities = {
        '.glass-light': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 0, 0, 0.2)',
        },
        '.glass-light-strong': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
        '.glass-dark-strong': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 0, 0, 0.3)',
        },
      };
      
      addUtilities(glassmorphismUtilities);
    },
    
    // Custom plugin for gradient utilities
    function({ addUtilities }) {
      const gradientUtilities = {};
      
      // Add gradient utilities for each category and gradient
      Object.entries(gradients).forEach(([category, categoryGradients]) => {
        Object.entries(categoryGradients).forEach(([name, gradient]) => {
          gradientUtilities[`.bg-gradient-${category}-${name}`] = {
            background: gradient,
          };
        });
      });
      
      addUtilities(gradientUtilities);
    },
  ],
}; 