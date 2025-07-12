import React, { useState, useEffect, useMemo } from 'react';
import { useUIState } from '../store/uiState.ts';
import { analyzeBundle } from '../utils/codeSplitting.ts';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
  loadTime: number;
  fps: number;
  errors: number;
}

interface PerformanceData {
  timestamp: number;
  metrics: PerformanceMetrics;
}

export const PerformanceDashboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [bundleStats, setBundleStats] = useState<any>(null);
  
  const uiState = useUIState();

  // Performance monitoring interval
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const metrics: PerformanceMetrics = {
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        renderTime: performance.now(),
        bundleSize: 0, // Will be updated separately
        loadTime: (performance as any).timing?.loadEventEnd - (performance as any).timing?.navigationStart || 0,
        fps: calculateFPS(),
        errors: 0 // Will be updated from error tracking
      };

      setPerformanceData(prev => [...prev.slice(-50), { timestamp: Date.now(), metrics }]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Calculate FPS
  const calculateFPS = (): number => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        return fps;
      }
      
      requestAnimationFrame(countFrame);
    };
    
    requestAnimationFrame(countFrame);
    return 60; // Default fallback
  };

  // Analyze bundle on mount
  useEffect(() => {
    const analyze = async () => {
      try {
        const stats = analyzeBundle();
        setBundleStats(stats);
      } catch (error) {
        console.warn('Could not analyze bundle:', error);
      }
    };
    
    analyze();
  }, []);

  // Calculate averages
  const averages = useMemo(() => {
    if (performanceData.length === 0) return null;
    
    const sum = performanceData.reduce((acc, data) => ({
      memoryUsage: acc.memoryUsage + data.metrics.memoryUsage,
      renderTime: acc.renderTime + data.metrics.renderTime,
      fps: acc.fps + data.metrics.fps,
      errors: acc.errors + data.metrics.errors
    }), { memoryUsage: 0, renderTime: 0, fps: 0, errors: 0 });
    
    const count = performanceData.length;
    
    return {
      memoryUsage: sum.memoryUsage / count,
      renderTime: sum.renderTime / count,
      fps: sum.fps / count,
      errors: sum.errors / count
    };
  }, [performanceData]);

  // Performance status
  const getPerformanceStatus = (): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (!averages) return 'good';
    
    if (averages.fps < 30 || averages.memoryUsage > 100 * 1024 * 1024) return 'critical';
    if (averages.fps < 50 || averages.memoryUsage > 50 * 1024 * 1024) return 'warning';
    if (averages.fps >= 55 && averages.memoryUsage < 25 * 1024 * 1024) return 'excellent';
    
    return 'good';
  };

  const status = getPerformanceStatus();
  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Performance Dashboard
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`px-3 py-1 rounded text-sm ${
                isMonitoring 
                  ? 'bg-red-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}
            >
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`text-lg font-semibold ${statusColors[status]}`}>
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">FPS</span>
                <span className="text-lg font-semibold">
                  {averages?.fps.toFixed(1) || 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                <span className="text-lg font-semibold">
                  {averages ? `${(averages.memoryUsage / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Errors</span>
                <span className="text-lg font-semibold">
                  {averages?.errors || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Bundle Analysis */}
          {bundleStats && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Bundle Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 dark:text-blue-400">Load Time</div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {bundleStats.loadTime?.toFixed(2) || 'N/A'}s
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <div className="text-sm text-green-600 dark:text-green-400">DOM Ready</div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {bundleStats.domContentLoaded?.toFixed(2) || 'N/A'}s
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 dark:text-purple-400">First Paint</div>
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {bundleStats.firstPaint?.toFixed(2) || 'N/A'}s
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Metrics */}
          {isMonitoring && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Real-time Metrics
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="space-y-2">
                  {performanceData.slice(-10).map((data, index) => (
                    <div key={data.timestamp} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(data.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        FPS: {data.metrics.fps.toFixed(1)} | 
                        Memory: {(data.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              System Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Browser</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>User Agent: {navigator.userAgent.split(' ')[0]}</div>
                  <div>Platform: {navigator.platform}</div>
                  <div>Language: {navigator.language}</div>
                  <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Performance</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Memory Limit: {(performance as any).memory ? `${((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</div>
                  <div>Total Memory: {(performance as any).memory ? `${((performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</div>
                  <div>Used Memory: {(performance as any).memory ? `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Performance Recommendations
            </h3>
            <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {status === 'critical' && (
                  <>
                    <li>• Memory usage is critically high - consider optimizing component rendering</li>
                    <li>• FPS is below 30 - check for expensive operations in render cycles</li>
                  </>
                )}
                {status === 'warning' && (
                  <>
                    <li>• Performance is degrading - monitor memory usage and FPS</li>
                    <li>• Consider implementing React.memo for expensive components</li>
                  </>
                )}
                {status === 'good' && (
                  <>
                    <li>• Performance is acceptable - continue monitoring</li>
                    <li>• Consider implementing code splitting for better load times</li>
                  </>
                )}
                {status === 'excellent' && (
                  <>
                    <li>• Performance is excellent - keep up the good work!</li>
                    <li>• Consider implementing advanced optimizations for edge cases</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 