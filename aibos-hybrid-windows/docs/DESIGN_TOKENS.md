# 🎨 AIBOS Design Token System

## Overview

The AIBOS Design Token System provides a centralized, consistent design language across the entire platform. All visual elements—colors, typography, spacing, animations, and more—are defined as reusable tokens that ensure consistency and enable easy theming and customization.

## 🏗️ Architecture

### Token Categories

1. **Colors** - Solid colors, semantic colors, and glassmorphism colors
2. **Gradients** - Background gradients organized by category
3. **Blur** - Backdrop blur values for glassmorphism effects
4. **Elevation** - Box shadows and depth indicators
5. **Typography** - Font families, sizes, weights, and spacing
6. **Border Radius** - Corner radius values
7. **Spacing** - Consistent spacing scale
8. **Animation** - Duration, easing, and keyframe definitions
9. **Z-Index** - Layering system
10. **Breakpoints** - Responsive design breakpoints

## 📁 File Structure

```
src/utils/
├── designTokens.ts     # Main token definitions
├── themeManager.ts     # Theme management and application
└── ...

tailwind.config.js      # Tailwind integration
```

## 🎯 Usage Guidelines

### 1. Colors

#### Solid Colors
```typescript
import { colors } from '@/utils/designTokens';

// Access by path
const primaryColor = colors.primary[500];
const grayColor = colors.gray[100];

// Use utility function
import { getColor } from '@/utils/designTokens';
const color = getColor('primary.500');
```

#### Semantic Colors
```typescript
// Success states
const successBg = colors.success[50];
const successText = colors.success[700];

// Error states
const errorBg = colors.error[50];
const errorText = colors.error[700];

// Warning states
const warningBg = colors.warning[50];
const warningText = colors.warning[700];
```

#### Glassmorphism Colors
```typescript
// Light glass effect
const lightGlass = colors.glass.light[20];

// Dark glass effect
const darkGlass = colors.glass.dark[30];
```

### 2. Gradients

#### Background Gradients
```typescript
import { gradients } from '@/utils/designTokens';

// Professional gradients
const nebulaGradient = gradients.professional.nebula;
const slateGradient = gradients.professional.slate;

// Nature gradients
const oceanGradient = gradients.nature.ocean;
const sunsetGradient = gradients.nature.sunset;

// Use utility function
import { getGradient } from '@/utils/designTokens';
const gradient = getGradient('professional.nebula');
```

#### Tailwind Classes
```html
<!-- Professional gradients -->
<div class="bg-gradient-professional-nebula">Nebula</div>
<div class="bg-gradient-professional-slate">Slate</div>

<!-- Nature gradients -->
<div class="bg-gradient-nature-ocean">Ocean</div>
<div class="bg-gradient-nature-sunset">Sunset</div>
```

### 3. Typography

#### Font Families
```typescript
import { typography } from '@/utils/designTokens';

// Sans-serif (default)
const sansFont = typography.fontFamily.sans;

// Monospace
const monoFont = typography.fontFamily.mono;

// Serif
const serifFont = typography.fontFamily.serif;
```

#### Font Sizes
```typescript
// Text sizes
const smallText = typography.fontSize.sm;    // 14px
const baseText = typography.fontSize.base;   // 16px
const largeText = typography.fontSize.lg;    // 18px
const headingText = typography.fontSize['2xl']; // 24px
```

#### Tailwind Classes
```html
<!-- Font families -->
<p class="font-sans">Sans-serif text</p>
<p class="font-mono">Monospace text</p>

<!-- Font sizes -->
<p class="text-sm">Small text</p>
<p class="text-base">Base text</p>
<p class="text-lg">Large text</p>
<p class="text-2xl">Heading text</p>
```

### 4. Spacing

#### Spacing Scale
```typescript
import { spacing } from '@/utils/designTokens';

const smallSpace = spacing[2];   // 8px
const mediumSpace = spacing[4];  // 16px
const largeSpace = spacing[8];   // 32px

// Use utility function
import { getSpacing } from '@/utils/designTokens';
const space = getSpacing(4);
```

#### Tailwind Classes
```html
<!-- Padding -->
<div class="p-2">Small padding</div>
<div class="p-4">Medium padding</div>
<div class="p-8">Large padding</div>

<!-- Margin -->
<div class="m-2">Small margin</div>
<div class="m-4">Medium margin</div>
<div class="m-8">Large margin</div>
```

### 5. Elevation (Shadows)

#### Box Shadows
```typescript
import { elevation } from '@/utils/designTokens';

const subtleShadow = elevation.sm;
const mediumShadow = elevation.md;
const strongShadow = elevation.lg;

// Glassmorphism shadows
const glassLightShadow = elevation.glass.light;
const glassDarkShadow = elevation.glass.dark;
```

#### Tailwind Classes
```html
<!-- Standard shadows -->
<div class="shadow-sm">Subtle shadow</div>
<div class="shadow-md">Medium shadow</div>
<div class="shadow-lg">Strong shadow</div>

<!-- Glassmorphism -->
<div class="glass-light">Light glass effect</div>
<div class="glass-dark">Dark glass effect</div>
```

### 6. Animation

#### Duration and Easing
```typescript
import { animation } from '@/utils/designTokens';

const fastDuration = animation.duration.fast;    // 150ms
const normalDuration = animation.duration.normal; // 300ms
const slowDuration = animation.duration.slow;     // 500ms

const smoothEasing = animation.easing.smooth;
const bounceEasing = animation.easing.bounce;
```

#### Animation Classes
```html
<!-- Fade animations -->
<div class="animate-fadeIn">Fade in</div>
<div class="animate-fadeOut">Fade out</div>

<!-- Slide animations -->
<div class="animate-slideUp">Slide up</div>
<div class="animate-slideDown">Slide down</div>

<!-- Scale animations -->
<div class="animate-scaleIn">Scale in</div>
<div class="animate-scaleOut">Scale out</div>
```

## 🎨 Theming System

### Theme Application

```typescript
import { applyTheme, getCurrentTheme, saveTheme } from '@/utils/themeManager';

// Apply a theme
applyTheme('nebula');

// Get current theme
const currentTheme = getCurrentTheme();

// Save theme preference
saveTheme('sunset');
```

### CSS Custom Properties

Themes automatically set CSS custom properties:

```css
:root {
  --color-primary: #0ea5e9;
  --color-secondary: #38bdf8;
  --color-accent: #d946ef;
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-text: #f9fafb;
  --color-text-muted: #9ca3af;
  --gradient-background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
}
```

### Theme Variants

Available themes organized by category:

#### Professional
- **Nebula** - Deep space gradient
- **Slate** - Elegant slate gradient
- **Gray** - Clean neutral theme

#### Nature
- **Ocean** - Deep ocean depths
- **Sunset** - Warm sunset colors
- **Forest** - Deep forest green

#### Cosmic
- **Galaxy** - Galactic purple and blue
- **Aurora** - Northern lights effect

#### Branded
- **Primary** - AI-BOS branded purple

## 🔧 Best Practices

### 1. Token Usage

✅ **Do:**
- Use tokens instead of hardcoded values
- Access tokens through utility functions
- Use semantic color names for states

❌ **Don't:**
- Hardcode colors, spacing, or other values
- Use arbitrary values outside the token system
- Mix different color systems

### 2. Accessibility

✅ **Do:**
- Ensure sufficient color contrast (4.5:1 for normal text)
- Provide fallbacks for reduced motion preferences
- Test with screen readers

❌ **Don't:**
- Use color alone to convey information
- Ignore reduced motion preferences
- Create inaccessible color combinations

### 3. Performance

✅ **Do:**
- Use CSS custom properties for dynamic theming
- Optimize gradient usage
- Minimize backdrop-filter usage on low-end devices

❌ **Don't:**
- Apply heavy effects without performance consideration
- Use too many transparent layers
- Ignore device capabilities

### 4. Consistency

✅ **Do:**
- Use consistent spacing throughout components
- Apply typography scale systematically
- Maintain visual hierarchy with elevation

❌ **Don't:**
- Mix different spacing systems
- Use arbitrary font sizes
- Create inconsistent visual depth

## 🧪 Testing

### Visual Regression Testing

```typescript
// Test token values
import { colors, spacing } from '@/utils/designTokens';

describe('Design Tokens', () => {
  test('colors should have valid hex values', () => {
    expect(colors.primary[500]).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('spacing should be positive values', () => {
    Object.values(spacing).forEach(value => {
      expect(parseFloat(value)).toBeGreaterThan(0);
    });
  });
});
```

### Accessibility Testing

```typescript
// Test color contrast
import { getColor } from '@/utils/designTokens';

function testContrast(foreground: string, background: string) {
  const fg = getColor(foreground);
  const bg = getColor(background);
  // Implement contrast ratio calculation
  return calculateContrastRatio(fg, bg) >= 4.5;
}
```

## 📚 Examples

### Component with Design Tokens

```tsx
import React from 'react';
import { colors, spacing, elevation, animation } from '@/utils/designTokens';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant, size, children }) => {
  const baseStyles = {
    padding: spacing[size === 'sm' ? 2 : size === 'md' ? 3 : 4],
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary[600],
      color: colors.white,
      boxShadow: elevation.sm,
    },
    secondary: {
      backgroundColor: colors.gray[200],
      color: colors.gray[800],
      boxShadow: elevation.xs,
    },
    danger: {
      backgroundColor: colors.error[600],
      color: colors.white,
      boxShadow: elevation.sm,
    },
  };

  return (
    <button
      style={{
        ...baseStyles,
        ...variantStyles[variant],
      }}
    >
      {children}
    </button>
  );
};
```

### Glassmorphism Card

```tsx
import React from 'react';
import { colors, elevation, blur } from '@/utils/designTokens';

export const GlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        backgroundColor: colors.glass.light[20],
        backdropFilter: `blur(${blur.md})`,
        border: `1px solid ${colors.glass.light[30]}`,
        borderRadius: '0.75rem',
        boxShadow: elevation.glass.light,
        padding: '1.5rem',
      }}
    >
      {children}
    </div>
  );
};
```

## 🔄 Migration Guide

### From Hardcoded Values

**Before:**
```tsx
<div style={{ 
  backgroundColor: '#6c63ff',
  padding: '16px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
}}>
```

**After:**
```tsx
import { colors, spacing, elevation } from '@/utils/designTokens';

<div style={{ 
  backgroundColor: colors.accent[500],
  padding: spacing[4],
  boxShadow: elevation.md
}}>
```

### From Tailwind Arbitrary Values

**Before:**
```html
<div class="bg-[#6c63ff] p-[16px] shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
```

**After:**
```html
<div class="bg-accent-500 p-4 shadow-md">
```

## 📖 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Design Tokens Specification](https://design-tokens.github.io/community-group/format/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Note:** This design token system is the foundation for all visual elements in AIBOS. Always use tokens instead of hardcoded values to maintain consistency and enable easy theming. 