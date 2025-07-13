import React, { Suspense, lazy, ComponentType } from 'react';

// Lazy loading wrapper with error boundary
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <div className="animate-pulse bg-gray-200 h-32 rounded" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Component registry for caching
class ComponentRegistry {
  private cache = new Map<string, ComponentType<any>>();
  private loading = new Map<string, Promise<ComponentType<any>>>();

  async loadComponent<T extends ComponentType<any>>(
    key: string,
    importFunc: () => Promise<{ default: T }>
  ): Promise<T> {
    // Return cached component if available
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Return loading promise if already loading
    if (this.loading.has(key)) {
      return this.loading.get(key) as Promise<T>;
    }

    // Load component with error handling
    const loadPromise = importFunc()
      .then(module => {
        const component = module.default;
        this.cache.set(key, component);
        this.loading.delete(key);
        return component;
      })
      .catch(err => {
        this.loading.delete(key);
        throw err;
      });

    this.loading.set(key, loadPromise);
    return loadPromise;
  }

  preloadComponent<T extends ComponentType<any>>(
    key: string,
    importFunc: () => Promise<{ default: T }>
  ) {
    if (!this.cache.has(key) && !this.loading.has(key)) {
      this.loadComponent(key, importFunc);
    }
  }

  clearCache() {
    this.cache.clear();
    this.loading.clear();
  }
}

export const componentRegistry = new ComponentRegistry();

// Lazy loading with registry
export function createLazyComponentWithRegistry<T extends ComponentType<any>>(
  key: string,
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  return (props: React.ComponentProps<T>) => {
    const [Component, setComponent] = React.useState<T | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      let isMounted = true;

      componentRegistry
        .loadComponent(key, importFunc)
        .then(component => {
          if (isMounted) {
            setComponent(() => component);
            setLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            setError(err);
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [key]);

    if (loading) {
      return <>{fallback || <div className="animate-pulse bg-gray-200 h-32 rounded" />}</>;
    }

    if (error) {
      return <div className="text-red-500">Failed to load component: {error.message}</div>;
    }

    return Component ? <Component {...props} /> : null;
  };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === element) {
          setIsIntersecting(entry.isIntersecting);
        }
      });
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

// Lazy image component
export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholder?: string;
}) {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);
  const isIntersecting = useIntersectionObserver({ current: imageRef });

  React.useEffect(() => {
    if (isIntersecting && src && imageSrc !== src) {
      const img = new Image();
      img.onload = () => setImageSrc(src);
      img.src = src;
    }
  }, [isIntersecting, src, imageSrc]);

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${imageSrc === src ? 'opacity-100' : 'opacity-0'}`}
      {...props}
    />
  );
} 