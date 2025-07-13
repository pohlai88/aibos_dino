# 🎯 Centralized Shortcut Management System

## Overview

The AIBOS Hybrid Windows platform now uses a **centralized shortcut management system** to prevent conflicts, ensure consistency, and provide a single source of truth for all keyboard shortcuts across the entire application.

## 🚨 **Why Centralized Management?**

### Problems with Scattered Shortcuts:
- ❌ **Multiple Event Listeners** - 6+ components listening to keydown events
- ❌ **Conflicting Shortcuts** - Same keys handled in multiple places
- ❌ **No Central Registry** - Shortcuts defined in individual components
- ❌ **Inconsistent Handling** - Different event handling patterns
- ❌ **Maintenance Nightmare** - Changes require updating multiple files

### Benefits of Centralized System:
- ✅ **Single Source of Truth** - All shortcuts defined in one place
- ✅ **Conflict Prevention** - Automatic detection of duplicate shortcuts
- ✅ **Context Awareness** - Shortcuts work based on active app/component
- ✅ **Easy Maintenance** - Add/remove shortcuts in one location
- ✅ **Consistent Behavior** - Standardized event handling
- ✅ **Dynamic Registration** - Apps can register their own shortcuts

## 🏗️ **Architecture**

### Core Components:

1. **`shortcutManager.ts`** - Central service managing all shortcuts
2. **`ShortcutHelp.tsx`** - UI component displaying all shortcuts
3. **App-specific registrations** - Each app registers its own shortcuts

### Shortcut Contexts:

```typescript
type ShortcutContext = 'global' | 'app' | 'component';
```

- **`global`** - Available everywhere (e.g., Ctrl+Space for Spotlight)
- **`app`** - Available when specific app is active (e.g., Calculator shortcuts)
- **`component`** - Available when specific component is focused

## 📋 **Shortcut Definition Interface**

```typescript
interface ShortcutDefinition {
  id: string;                    // Unique identifier
  key: string;                   // Key combination (e.g., "Ctrl+S")
  description: string;           // Human-readable description
  category: string;              // Category for grouping
  icon?: string;                 // Visual icon
  tags?: string[];               // Searchable tags
  action: () => void;            // Function to execute
  context?: 'global' | 'app' | 'component';
  appId?: string;                // For app-specific shortcuts
  priority?: number;             // Higher priority takes precedence
  enabled?: boolean;             // Whether shortcut is active
  preventDefault?: boolean;      // Whether to prevent default behavior
}
```

## 🔧 **Usage Examples**

### 1. Global System Shortcuts (Auto-registered)

```typescript
// Automatically registered by shortcutManager.initialize()
{
  id: 'spotlight-toggle',
  key: 'Ctrl+Space',
  description: 'Toggle Spotlight Search',
  category: 'Navigation',
  icon: '🔍',
  tags: ['search', 'spotlight', 'find'],
  action: toggleSpotlight,
  context: 'global',
  priority: 100
}
```

### 2. App-Specific Shortcuts

```typescript
// In Calculator.tsx
const calculatorShortcuts = [
  {
    id: 'calc-digit-0',
    key: '0',
    description: 'Input digit 0',
    category: 'Calculator',
    icon: '0',
    tags: ['digit', 'number'],
    action: () => inputDigit('0'),
    preventDefault: true
  },
  {
    id: 'calc-add',
    key: '+',
    description: 'Add operation',
    category: 'Calculator',
    icon: '+',
    tags: ['operation', 'add'],
    action: () => performOperation('+'),
    preventDefault: true
  }
];

registerAppShortcuts('calculator', calculatorShortcuts);
```

### 3. Component-Specific Shortcuts

```typescript
// For component-level shortcuts
const componentShortcuts = [
  {
    id: 'component-save',
    key: 'Ctrl+S',
    description: 'Save component state',
    category: 'Component',
    action: handleSave
  }
];

registerComponentShortcuts('myComponent', componentShortcuts);
```

## 🎮 **Hook Usage**

```typescript
import { useShortcutManager } from '../services/shortcutManager.ts';

const MyComponent = () => {
  const { 
    register, 
    unregister, 
    getAllShortcuts, 
    registerAppShortcuts,
    unregisterAppShortcuts 
  } = useShortcutManager();

  useEffect(() => {
    // Register app shortcuts
    registerAppShortcuts('myApp', myShortcuts);
    
    // Cleanup on unmount
    return () => unregisterAppShortcuts('myApp');
  }, []);
};
```

## 📊 **Current Shortcut Categories**

### Navigation (Global)
- `Ctrl+Space` - Toggle Spotlight Search
- `Ctrl+Escape` - Toggle Start Menu
- `Ctrl+H` - Navigate to Home

### Applications (Global)
- `N` - Open Notepad
- `F` - Open Files
- `C` - Open Calculator
- `T` - Open Clock
- `H` - Open Theme Selector

### User & Appearance (Global)
- `Ctrl+U` - Toggle User Menu
- `Ctrl+T` - Cycle Theme

### Help (Global)
- `F1` - Show Keyboard Shortcuts
- `Escape` - Close Shortcut Help

### Calculator (App-specific)
- `0-9` - Input digits
- `+`, `-`, `*`, `/` - Operations
- `Enter`, `=` - Calculate
- `.` - Decimal point
- `Escape` - Clear
- `Backspace` - Delete last character
- `M` - Memory add
- `R` - Memory recall
- `Ctrl+C` - Memory clear

### Notepad (App-specific)
- `Ctrl+S` - Save note
- `Ctrl+N` - New note

## 🔍 **Search & Filtering**

The ShortcutHelp component provides:

- **Real-time Search** - Search by description, key, tags, or category
- **Category Filtering** - Filter by specific categories
- **Copy Functionality** - Copy any shortcut to clipboard
- **Context Awareness** - Shows only relevant shortcuts

## 🛠️ **Development Guidelines**

### Adding New Shortcuts:

1. **Global Shortcuts**: Add to `shortcutManager.ts` in `registerDefaultShortcuts()`
2. **App Shortcuts**: Use `registerAppShortcuts()` in the app component
3. **Component Shortcuts**: Use `registerComponentShortcuts()` in the component

### Best Practices:

1. **Unique IDs**: Always use unique, descriptive IDs
2. **Descriptive Names**: Use clear, action-oriented descriptions
3. **Proper Categories**: Group shortcuts logically
4. **Tags**: Add relevant tags for better searchability
5. **Priority**: Use higher priority for critical shortcuts
6. **Cleanup**: Always unregister shortcuts on component unmount

### Conflict Resolution:

```typescript
// Check if key is already registered
const isRegistered = shortcutManager.isKeyRegistered('Ctrl+S');
if (isRegistered) {
  console.warn('Shortcut Ctrl+S is already registered');
}
```

## 🚀 **Migration Guide**

### From Old System to New:

1. **Remove local event listeners** from components
2. **Register shortcuts** with the centralized manager
3. **Update ShortcutHelp** to use `getAllShortcuts()`
4. **Test thoroughly** to ensure no conflicts

### Example Migration:

```typescript
// OLD WAY (Remove this)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// NEW WAY (Use this)
useEffect(() => {
  registerAppShortcuts('myApp', [
    {
      id: 'my-app-save',
      key: 'Ctrl+S',
      description: 'Save current state',
      category: 'My App',
      action: handleSave,
      preventDefault: true
    }
  ]);
  
  return () => unregisterAppShortcuts('myApp');
}, []);
```

## 🎯 **Benefits Achieved**

1. **Reduced Complexity** - Single event listener instead of 6+
2. **Better Performance** - Optimized event handling
3. **Easier Maintenance** - All shortcuts in one place
4. **Improved UX** - Consistent behavior across apps
5. **Better Debugging** - Centralized logging and error handling
6. **Future-Proof** - Easy to add new shortcuts and features

## 📈 **Performance Impact**

- **Event Listeners**: Reduced from 6+ to 1 global listener
- **Memory Usage**: Optimized shortcut storage and lookup
- **CPU Usage**: Reduced event processing overhead
- **Bundle Size**: Minimal increase due to shared utilities

## 🔮 **Future Enhancements**

1. **Shortcut Macros** - Record and replay shortcut sequences
2. **Custom Shortcuts** - User-defined shortcuts
3. **Shortcut Analytics** - Track most-used shortcuts
4. **Accessibility** - Screen reader support for shortcuts
5. **Mobile Support** - Touch gestures for mobile devices 