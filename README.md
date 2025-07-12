# AIBOS Mini - Advanced Hybrid Windows Desktop Environment

A modern, AI-powered desktop environment built with React, TypeScript, and Deno.

## 🚀 Features

- **Advanced Window Management**: Minimize, maximize, restore, and focus windows
- **Smart Search System**: Spotlight search with streaming results and quick access
- **Performance Monitoring**: Real-time performance tracking and optimization
- **Modern UI/UX**: Beautiful, responsive design with dark mode support
- **Extensible Architecture**: Plugin-based system for apps and services
- **Type Safety**: Full TypeScript coverage with strict type checking

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Deno, TypeScript
- **State Management**: Zustand
- **Build Tool**: Turbo (monorepo)
- **Performance**: Custom monitoring and optimization

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Deno >= 1.40.0

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aibos_dino
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 🎯 Available Scripts

### Root Level
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run api` - Start API server
- `npm run lint` - Run linting
- `npm run type-check` - Type checking
- `npm run clean` - Clean build artifacts
- `npm run test` - Run tests
- `npm run format` - Format code

### AIBOS Hybrid Windows
- `npm run dev` - Start Deno development server
- `npm run build` - Build application
- `npm run api` - Start file API server
- `npm run lint` - Deno linting
- `npm run type-check` - TypeScript checking
- `npm run format` - Code formatting
- `npm run test` - Run tests
- `npm run clean` - Clean project

## 🏗️ Project Structure

```
aibos_dino/
├── aibos-hybrid-windows/     # Main application
│   ├── src/
│   │   ├── apps/            # Application components
│   │   ├── components/      # UI components
│   │   ├── services/        # Business logic
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities
│   ├── api/                 # Backend API
│   ├── scripts/             # Build scripts
│   └── main.ts              # Entry point
├── .turbo/                  # Turbo cache
├── node_modules/            # Dependencies
└── package.json             # Root configuration
```

## 🔧 Configuration

### TypeScript
- Strict type checking enabled
- Modern ES2022 target
- Incremental compilation for performance
- Comprehensive linting rules

### Tailwind CSS
- Custom design system
- Dark mode support
- Performance-optimized animations
- Responsive utilities

### Performance Monitoring
- Real-time memory usage tracking
- Render time monitoring
- Automatic threshold warnings
- Performance trend analysis

## 🚀 Performance Optimizations

### Build Optimizations
- **Turbo**: Fast incremental builds
- **TypeScript**: Incremental compilation
- **Deno**: Efficient module loading
- **Tree Shaking**: Unused code elimination

### Runtime Optimizations
- **React**: Memoization and lazy loading
- **Zustand**: Minimal re-renders
- **Search**: Debounced streaming results
- **Caching**: Intelligent result caching

### Memory Management
- **Window Pooling**: Reuse window instances
- **Component Cleanup**: Proper unmounting
- **Event Listener Management**: Automatic cleanup
- **Garbage Collection**: Optimized object lifecycle

## 🎨 UI/UX Features

### Window Management
- Drag and drop windows
- Resize handles
- Minimize/maximize/restore
- Window focus management
- Z-index stacking

### Search System
- Real-time search results
- Quick access items
- Keyboard navigation
- Search history
- Result categorization

### Theme System
- Multiple theme variants
- Dark mode support
- High contrast mode
- Custom color schemes
- Smooth transitions

## 🔍 Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Prettier formatting
- Meaningful commit messages

### Performance
- Monitor performance metrics
- Optimize render cycles
- Minimize bundle size
- Use lazy loading

### Testing
- Unit tests for utilities
- Integration tests for services
- E2E tests for critical paths
- Performance benchmarks

## 📊 Performance Monitoring

The application includes built-in performance monitoring:

```typescript
import { performanceMonitor } from './src/utils/performance';

// Get current performance report
const report = performanceMonitor.getReport();

// Set custom thresholds
performanceMonitor.setThresholds({
  memoryWarning: 70,
  memoryCritical: 90,
  renderTimeWarning: 16,
  renderTimeCritical: 33,
});
```

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript Errors**
   ```bash
   npm run type-check
   ```

2. **Performance Issues**
   - Check performance monitor
   - Review memory usage
   - Analyze render times

3. **Build Failures**
   ```bash
   npm run clean
   npm install
   npm run build
   ```

### Debug Mode

Enable debug logging:
```bash
DEBUG=aibos:* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Performance**: Built-in monitoring tools

---

**AIBOS Mini** - Building the future of desktop computing 🚀 