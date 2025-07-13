import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from '../components/Window.tsx';
import { Dock } from '../components/Dock.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { Spotlight } from '../components/Spotlight.tsx';
import { StartMenu } from '../components/StartMenu.tsx';
import { Clock } from '../components/Clock.tsx';
import { PropertiesDialog } from '../components/PropertiesDialog.tsx';
import { Tooltip } from '../components/Tooltip.tsx';
import { ThemeSelector } from '../components/ThemeSelector.tsx';
import AppStore from '../components/AppStore.tsx';
import TenantOnboarding from '../components/TenantOnboarding.tsx';
import { ShortcutHelp } from '../components/ShortcutHelp.tsx';
import { PerformanceDashboard } from '../components/PerformanceDashboard.tsx';
import { Desktop } from '../components/Desktop.tsx';

// Component showcase interface
interface ComponentStory {
  id: string;
  title: string;
  description: string;
  category: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  variants?: Array<{
    name: string;
    props: Record<string, any>;
  }>;
}

// Define all component stories
const componentStories: ComponentStory[] = [
  {
    id: 'window',
    title: 'Window',
    description: 'Resizable window with traffic light buttons and glassmorphism effects',
    category: 'Window Management',
    component: Window,
    props: {
      id: 'showcase-window',
      title: 'Showcase Window',
      component: () => <div className="p-4">Window content goes here</div>,
      initialSize: { width: 600, height: 400 },
      initialPosition: { x: 100, y: 100 },
    },
    variants: [
      {
        name: 'Minimized',
        props: { isMinimized: true }
      },
      {
        name: 'Maximized',
        props: { isMaximized: true }
      }
    ]
  },
  {
    id: 'dock',
    title: 'Dock',
    description: 'Application dock with magnification and glassmorphism effects',
    category: 'Core Components',
    component: Dock,
    variants: [
      {
        name: 'With Apps',
        props: { showApps: true }
      }
    ]
  },
  {
    id: 'topbar',
    title: 'Top Bar',
    description: 'System top bar with theme toggle and system controls',
    category: 'Core Components',
    component: TopBar,
  },
  {
    id: 'spotlight',
    title: 'Spotlight',
    description: 'Global search with keyboard navigation and focus trapping',
    category: 'UI Components',
    component: Spotlight,
    props: { isVisible: true },
  },
  {
    id: 'startmenu',
    title: 'Start Menu',
    description: 'Application launcher with categories and search',
    category: 'Core Components',
    component: StartMenu,
    props: { isVisible: true },
  },
  {
    id: 'clock',
    title: 'Clock',
    description: 'Real-time clock with weather and timezone support',
    category: 'Applications',
    component: Clock,
  },
  {
    id: 'properties-dialog',
    title: 'Properties Dialog',
    description: 'File properties dialog with form validation',
    category: 'UI Components',
    component: PropertiesDialog,
    props: {
      isVisible: true,
      file: {
        name: 'example.txt',
        size: 1024,
        created: new Date(),
        modified: new Date(),
        type: 'text/plain'
      },
      onClose: () => {},
      onSave: () => {}
    },
  },
  {
    id: 'tooltip',
    title: 'Tooltip',
    description: 'Accessible tooltip with positioning and ARIA support',
    category: 'UI Components',
    component: Tooltip,
    props: {
      content: 'This is a tooltip',
      children: <button>Hover me</button>
    },
  },
  {
    id: 'theme-selector',
    title: 'Theme Selector',
    description: 'Theme selection with preview and accessibility',
    category: 'UI Components',
    component: ThemeSelector,
    props: { isVisible: true, onClose: () => {} },
  },
  {
    id: 'app-store',
    title: 'App Store',
    description: 'Application marketplace with installation workflow',
    category: 'Applications',
    component: AppStore,
    props: { isVisible: true, onClose: () => {} },
  },
  {
    id: 'tenant-onboarding',
    title: 'Tenant Onboarding',
    description: 'Multi-step onboarding with form validation',
    category: 'Applications',
    component: TenantOnboarding,
    props: { isVisible: true, onClose: () => {} },
  },
  {
    id: 'shortcut-help',
    title: 'Shortcut Help',
    description: 'Keyboard shortcuts guide with search and categories',
    category: 'UI Components',
    component: ShortcutHelp,
    props: { isVisible: true, onClose: () => {} },
  },
  {
    id: 'performance-dashboard',
    title: 'Performance Dashboard',
    description: 'Real-time performance monitoring with metrics',
    category: 'Applications',
    component: PerformanceDashboard,
  },
];

// Component showcase app
const ComponentShowcase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('default');

  const categories = ['all', ...new Set(componentStories.map(story => story.category))];
  const filteredStories = selectedCategory === 'all' 
    ? componentStories 
    : componentStories.filter(story => story.category === selectedCategory);

  const selectedStory = componentStories.find(story => story.id === selectedComponent);
  const selectedVariantData = selectedStory?.variants?.find(v => v.name === selectedVariant);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">AI-BOS Component Library</h1>
          <p className="text-gray-300 mt-2">
            Interactive showcase of all enterprise-level components
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Filter */}
            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Component List */}
            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Components</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStories.map(story => (
                  <button
                    key={story.id}
                    onClick={() => setSelectedComponent(story.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedComponent === story.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">{story.title}</div>
                    <div className="text-xs opacity-75">{story.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedStory ? (
              <div className="space-y-6">
                {/* Component Header */}
                <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-2">{selectedStory.title}</h2>
                  <p className="text-gray-300 mb-4">{selectedStory.description}</p>
                  
                  {/* Variants */}
                  {selectedStory.variants && selectedStory.variants.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Variants</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedVariant('default')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            selectedVariant === 'default'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          Default
                        </button>
                        {selectedStory.variants.map(variant => (
                          <button
                            key={variant.name}
                            onClick={() => setSelectedVariant(variant.name)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              selectedVariant === variant.name
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {variant.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Component Preview */}
                <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <div className="border border-white/10 rounded-lg p-4 bg-black/20">
                    <selectedStory.component 
                      {...selectedStory.props}
                      {...(selectedVariantData?.props || {})}
                    />
                  </div>
                </div>

                {/* Component Code */}
                <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Usage</h3>
                  <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm">
                    <code>{`import { ${selectedStory.title} } from '../components/${selectedStory.title}.tsx';

<${selectedStory.title}
  ${Object.entries(selectedStory.props || {})
    .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
    .join('\n  ')}
/>`}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h2 className="text-2xl font-bold mb-2">Component Showcase</h2>
                <p className="text-gray-300">
                  Select a component from the sidebar to view its interactive preview, variants, and usage examples.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Render the showcase
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ComponentShowcase />);
}

export default ComponentShowcase; 