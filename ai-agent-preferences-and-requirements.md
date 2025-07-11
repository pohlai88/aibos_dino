# AI Coding Agent Preferences & Requirements for AI-BOS Platform

## Executive Summary

This document defines the optimal preferences and strict requirements for AI coding agents to produce high-quality, consistent code that integrates seamlessly with the AI-BOS Hybrid Windows platform. The goal is to ensure all AI-generated code follows platform standards, maintains security, and delivers exceptional user experience.

---

  ## 🎯 AI AGENT PREFERENCES (What AI Agents Prefer Most)

### 1. **Technology Stack Preferences**

#### **Runtime & Language**
- **Deno** (preferred over Node.js)
  - Built-in TypeScript support
  - URL-based imports (no package.json complexity)
  - Security-first approach with explicit permissions
  - Native ES modules
  - Top-level await support

#### **Frontend Framework**
- **React 18+** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management (lightweight, TypeScript-friendly)
- **Vite** for build tooling

#### **Database & Backend**
- **Supabase** for database, auth, and real-time features
- **PostgreSQL** for data persistence
- **JWT** for authentication

### 2. **Code Structure Preferences**

#### **File Organization**
- **Modular component architecture**
- **Clear separation of concerns**
- **Consistent naming conventions**
- **TypeScript interfaces for all data models**

#### **Import Patterns**
- **URL imports for Deno** (`https://deno.land/std@version/module`)
- **ESM imports** (`import { Component } from './Component'`)
- **No CommonJS** (`require()`)

### 3. **Development Workflow Preferences**

#### **Manifest-Driven Development**
- **App manifests** define all app properties
- **Schema validation** before deployment
- **Version control** with semantic versioning
- **Documentation-first** approach

#### **Security Model**
- **Permission-based access control**
- **Sandboxed app execution**
- **Explicit API declarations**
- **Compliance flag support**

---

## 🔒 STRICT REQUIREMENTS FOR QUALITY CODE CONSISTENCY

### 1. **Platform Architecture Compliance**

#### **OS Shell Integration**
- **Must use defined UI slots** (Desktop, Dock, TopBar, Window)
- **Must follow event bus patterns** for inter-app communication
- **Must respect z-index stacking** for window management
- **Must implement proper window lifecycle** (open, close, minimize, maximize)

#### **Manifest System Compliance**
```typescript
interface AppManifest {
  name: string;
  version: string;
  spaces: string[];           // Business domains
  compliance: string[];       // GDPR, HIPAA, etc.
  themeTokens: object;        // App-specific theming
  capabilities: string[];     // What app can/cannot do
  deployment: {
    author: string;
    repo: string;
    license: string;
  };
  localization: {
    supported: string[];
    default: string;
  };
  routes: string[];
  db_tables: string[];
  ui: string[];
  permissions: string[];
  icon?: string;
  description?: string;
}
```

### 2. **Code Quality Standards**

#### **TypeScript Requirements**
- **Strict mode enabled**
- **No `any` types** (use proper interfaces)
- **Explicit return types** for all functions
- **Generic types** for reusable components
- **Union types** for state management

#### **Component Architecture**
```typescript
// Required component structure
interface WindowComponent {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  content: React.ReactNode;
}

// Required props interface
interface AppWindowProps {
  appId: string;
  manifest: AppManifest;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onDrag: (position: Position) => void;
}
```

### 3. **UI/UX Consistency Requirements**

#### **Design System Compliance**
- **Use defined theme tokens** (colors, typography, spacing)
- **Follow glassmorphism patterns** (blur, opacity, layering)
- **Implement consistent animations** (timing, easing curves)
- **Support dark/light mode** via theme tokens

#### **Window Management**
- **Draggable windows** with proper bounds checking
- **Resizable windows** with minimum/maximum constraints
- **Proper focus management** (click to focus, z-index updates)
- **Smooth animations** for all state transitions

### 4. **Security & Permissions**

#### **Sandboxing Requirements**
- **No direct OS access** (use platform APIs only)
- **Declared permissions** in manifest
- **Data isolation** between apps
- **Secure communication** via event bus

#### **Authentication & Authorization**
- **Supabase Auth integration**
- **JWT token validation**
- **Role-based access control**
- **Session management**

### 5. **Performance Requirements**

#### **Bundle Size**
- **< 100KB** for core app bundle
- **Lazy loading** for large components
- **Tree shaking** enabled
- **Code splitting** by routes

#### **Runtime Performance**
- **< 100ms** initial render time
- **60fps** animations
- **Efficient re-renders** (React.memo, useMemo, useCallback)
- **Memory leak prevention**

### 6. **Testing & Validation**

#### **Required Tests**
- **Unit tests** for all business logic
- **Component tests** for UI interactions
- **Integration tests** for API calls
- **E2E tests** for critical user flows

#### **Validation Requirements**
- **Manifest validation** before deployment
- **Type checking** (TypeScript strict mode)
- **Linting** (ESLint + Prettier)
- **Security scanning** (dependency vulnerabilities)

---

## 📋 IMPLEMENTATION CHECKLIST

### **Pre-Development**
- [ ] Review platform documentation
- [ ] Understand manifest schema
- [ ] Set up development environment (Deno + Vite)
- [ ] Configure TypeScript strict mode
- [ ] Install required dependencies

### **Development Phase**
- [ ] Create app manifest with all required fields
- [ ] Implement component architecture
- [ ] Add proper TypeScript interfaces
- [ ] Implement window management
- [ ] Add security permissions
- [ ] Create theme integration

### **Quality Assurance**
- [ ] Run manifest validation
- [ ] Execute test suite
- [ ] Performance audit
- [ ] Security review
- [ ] Accessibility testing
- [ ] Cross-browser compatibility

### **Deployment**
- [ ] Build optimization
- [ ] Bundle analysis
- [ ] Environment configuration
- [ ] Deployment to Deno Deploy
- [ ] Post-deployment testing

---

## 🎨 DESIGN TOKENS & STYLING

### **Color Palette**
```typescript
const colors = {
  primary: {
    50: '#f0f9ff',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  background: {
    light: '#ffffff',
    dark: '#0f172a'
  },
  surface: {
    light: 'rgba(255, 255, 255, 0.8)',
    dark: 'rgba(15, 23, 42, 0.8)'
  }
};
```

### **Typography Scale**
```typescript
const typography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};
```

### **Spacing & Layout**
```typescript
const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem'
};
```

---

## 🔧 TOOLING & AUTOMATION

### **Required Tools**
- **Deno** (runtime)
- **Vite** (build tool)
- **TypeScript** (language)
- **Tailwind CSS** (styling)
- **Zustand** (state management)
- **Supabase** (backend services)

### **Development Tools**
- **Cursor/VS Code** (IDE)
- **ESLint** (linting)
- **Prettier** (formatting)
- **Vitest** (testing)
- **Playwright** (E2E testing)

### **CI/CD Pipeline**
- **GitHub Actions** (automation)
- **Deno Deploy** (hosting)
- **Supabase** (database)
- **Vercel** (optional frontend hosting)

---

## 📊 SUCCESS METRICS

### **Code Quality Metrics**
- **TypeScript coverage**: 100%
- **Test coverage**: > 90%
- **Bundle size**: < 100KB
- **Performance score**: > 90 (Lighthouse)

### **User Experience Metrics**
- **Load time**: < 2 seconds
- **Animation frame rate**: 60fps
- **Accessibility score**: 100%
- **Cross-browser compatibility**: 100%

### **Security Metrics**
- **Vulnerability scan**: 0 critical issues
- **Permission compliance**: 100%
- **Data isolation**: Verified
- **Authentication**: Properly implemented

---

## 🚀 NEXT STEPS: JSON SCHEMA CONVERSION

This document serves as the foundation for creating strict JSON schemas that will:

1. **Validate app manifests** automatically
2. **Enforce code standards** through tooling
3. **Ensure platform compatibility** before deployment
4. **Provide clear error messages** for AI agents
5. **Generate documentation** from schemas

The JSON schemas will be created in the next phase to ensure strict compliance and automated validation of all AI-generated code for the AI-BOS platform.

---

**This document ensures that all AI coding agents produce consistent, high-quality code that integrates seamlessly with the AI-BOS Hybrid Windows platform while maintaining security, performance, and user experience standards.**