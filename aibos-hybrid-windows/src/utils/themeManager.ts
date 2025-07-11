// Theme types
export type ThemeVariant = 'nebula' | 'purple' | 'gray' | 'blue' | 'slate' | 'ocean' | 'sunset' | 'forest' | 'cosmic' | 'aurora';

// Theme configuration
export interface ThemeConfig {
  name: string;
  description: string;
  gradient: string;
  icon: string;
  category: 'professional' | 'nature' | 'cosmic' | 'branded';
}

// All available themes with beautiful gradients
export const themeConfigs: Record<ThemeVariant, ThemeConfig> = {
  nebula: {
    name: 'Nebula',
    description: 'Professional deep space gradient',
    gradient: 'bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]',
    icon: '🌌',
    category: 'professional'
  },
  purple: {
    name: 'Purple',
    description: 'AI-BOS branded purple theme',
    gradient: 'bg-gradient-to-br from-purple-900 to-purple-700',
    icon: '💜',
    category: 'branded'
  },
  gray: {
    name: 'Gray',
    description: 'Clean neutral gray theme',
    gradient: 'bg-gradient-to-br from-gray-900 to-gray-700',
    icon: '⚫',
    category: 'professional'
  },
  blue: {
    name: 'Blue',
    description: 'Calming ocean blue theme',
    gradient: 'bg-gradient-to-br from-blue-900 to-blue-700',
    icon: '🌊',
    category: 'nature'
  },
  slate: {
    name: 'Slate',
    description: 'Elegant slate gradient',
    gradient: 'bg-gradient-to-br from-slate-900 to-slate-700',
    icon: '🪨',
    category: 'professional'
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep ocean depths',
    gradient: 'bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900',
    icon: '🌊',
    category: 'nature'
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm sunset colors',
    gradient: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500',
    icon: '🌅',
    category: 'nature'
  },
  forest: {
    name: 'Forest',
    description: 'Deep forest green',
    gradient: 'bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900',
    icon: '🌲',
    category: 'nature'
  },
  cosmic: {
    name: 'Cosmic',
    description: 'Galactic purple and blue',
    gradient: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
    icon: '✨',
    category: 'cosmic'
  },
  aurora: {
    name: 'Aurora',
    description: 'Northern lights effect',
    gradient: 'bg-gradient-to-br from-green-400 via-blue-500 to-purple-600',
    icon: '🌌',
    category: 'cosmic'
  }
};

// Get theme class by variant
export const getThemeClass = (theme: ThemeVariant): string => {
  return themeConfigs[theme].gradient;
};

// Get all themes grouped by category
export const getThemesByCategory = () => {
  const categories = {
    professional: [] as ThemeVariant[],
    nature: [] as ThemeVariant[],
    cosmic: [] as ThemeVariant[],
    branded: [] as ThemeVariant[]
  };

  Object.entries(themeConfigs).forEach(([variant, config]) => {
    categories[config.category].push(variant as ThemeVariant);
  });

  return categories;
};

// Get theme order for cycling
export const getThemeOrder = (): ThemeVariant[] => {
  return ['nebula', 'purple', 'gray', 'blue', 'slate', 'ocean', 'sunset', 'forest', 'cosmic', 'aurora'];
};

// Get next theme in cycle
export const getNextTheme = (currentTheme: ThemeVariant): ThemeVariant => {
  const order = getThemeOrder();
  const currentIndex = order.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % order.length;
  return order[nextIndex];
};

// Get previous theme in cycle
export const getPreviousTheme = (currentTheme: ThemeVariant): ThemeVariant => {
  const order = getThemeOrder();
  const currentIndex = order.indexOf(currentTheme);
  const prevIndex = currentIndex === 0 ? order.length - 1 : currentIndex - 1;
  return order[prevIndex];
}; 