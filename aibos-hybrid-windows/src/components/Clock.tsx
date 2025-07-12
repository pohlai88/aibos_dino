import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// Types
interface Timezone {
  name: string;
  offset: number;
  label: string;
}

interface Weather {
  temperature: number;
  condition: string;
  icon: string;
}

interface StopwatchState {
  time: number;
  running: boolean;
  laps: number[];
}

interface TimerState {
  time: number;
  running: boolean;
  duration: number;
}

type ClockMode = 'clock' | 'stopwatch' | 'timer';

// Constants
const TIMEZONES: Timezone[] = [
  { name: 'local', offset: 0, label: 'Local' },
  { name: 'UTC', offset: 0, label: 'UTC' },
  { name: 'EST', offset: -5, label: 'Eastern' },
  { name: 'CST', offset: -6, label: 'Central' },
  { name: 'MST', offset: -7, label: 'Mountain' },
  { name: 'PST', offset: -8, label: 'Pacific' },
  { name: 'GMT', offset: 0, label: 'London' },
  { name: 'CET', offset: 1, label: 'Paris' },
  { name: 'JST', offset: 9, label: 'Tokyo' },
];

const TIMER_PRESETS = [
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
  { value: 3600, label: '1 hour' },
];

const WEATHER_CONDITIONS = [
  { condition: 'Sunny', icon: '☀️' },
  { condition: 'Cloudy', icon: '☁️' },
  { condition: 'Rainy', icon: '🌧️' },
  { condition: 'Snowy', icon: '❄️' },
];

// Utility functions
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const formatTimer = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getTimezoneTime = (date: Date, timezone: Timezone): Date => {
  if (timezone.name === 'local') {
    return date;
  }
  
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const targetTime = utc + (timezone.offset * 3600000);
  return new Date(targetTime);
};

// Custom hooks
const useClock = (timezone: Timezone) => {
  const [now, setNow] = useState(new Date());
  const requestRef = useRef<number>();

  useEffect(() => {
    const animate = (time: number) => {
      setNow(new Date());
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const timezoneTime = useMemo(() => getTimezoneTime(now, timezone), [now, timezone]);
  
  return timezoneTime;
};

const useStopwatch = () => {
  const [state, setState] = useState<StopwatchState>({
    time: 0,
    running: false,
    laps: [],
  });

  useEffect(() => {
    if (!state.running) return;

    const interval = setInterval(() => {
      setState(prev => ({ ...prev, time: prev.time + 10 }));
    }, 10);

    return () => clearInterval(interval);
  }, [state.running]);

  const start = useCallback(() => setState(prev => ({ ...prev, running: true })), []);
  const pause = useCallback(() => setState(prev => ({ ...prev, running: false })), []);
  const reset = useCallback(() => setState({ time: 0, running: false, laps: [] }), []);
  const lap = useCallback(() => setState(prev => ({ ...prev, laps: [...prev.laps, prev.time] })), []);

  return { ...state, start, pause, reset, lap };
};

const useTimer = () => {
  const [state, setState] = useState<TimerState>({
    time: 300000, // 5 minutes default
    running: false,
    duration: 300,
  });

  useEffect(() => {
    if (!state.running || state.time <= 0) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (prev.time <= 1000) {
          // Timer finished
          return { ...prev, time: 0, running: false };
        }
        return { ...prev, time: prev.time - 1000 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.running, state.time]);

  const start = useCallback(() => setState(prev => ({ ...prev, running: true })), []);
  const pause = useCallback(() => setState(prev => ({ ...prev, running: false })), []);
  const reset = useCallback(() => setState(prev => ({ ...prev, time: prev.duration * 1000, running: false })), []);
  const setDuration = useCallback((duration: number) => setState(prev => ({ ...prev, duration, time: duration * 1000 })), []);

  return { ...state, start, pause, reset, setDuration };
};

const useWeather = (timezone: Timezone) => {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // TODO: Replace with actual weather API
        const randomCondition = WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)];
        const mockWeather: Weather = {
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: randomCondition.condition,
          icon: randomCondition.icon,
        };
        setWeather(mockWeather);
      } catch (error) {
        console.warn('Weather fetch failed:', error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [timezone.name]); // Only re-fetch when timezone changes

  return weather;
};

// Sub-components
const ModeSelector: React.FC<{
  mode: ClockMode;
  onModeChange: (mode: ClockMode) => void;
}> = ({ mode, onModeChange }) => (
  <div className="flex space-x-1 mb-3" role="tablist" aria-label="Clock modes">
    {(['clock', 'stopwatch', 'timer'] as const).map((m) => (
      <button
        key={m}
        role="tab"
        aria-selected={mode === m}
        onClick={() => onModeChange(m)}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          mode === m
            ? 'bg-white bg-opacity-20 text-white'
            : 'text-white text-opacity-60 hover:text-opacity-80'
        }`}
      >
        {m.charAt(0).toUpperCase() + m.slice(1)}
      </button>
    ))}
  </div>
);

const TimezoneSelector: React.FC<{
  timezone: Timezone;
  onTimezoneChange: (timezone: Timezone) => void;
}> = ({ timezone, onTimezoneChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative mb-2">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-white text-opacity-80 hover:text-opacity-100 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {timezone.label} ▼
      </button>
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 bg-gray-800 bg-opacity-90 rounded-lg p-2 z-10 min-w-32"
          role="listbox"
        >
          {TIMEZONES.map((tz) => (
            <button
              key={tz.name}
              role="option"
              aria-selected={timezone.name === tz.name}
              onClick={() => {
                onTimezoneChange(tz);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-2 py-1 text-xs rounded ${
                timezone.name === tz.name
                  ? 'bg-white bg-opacity-20 text-white'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              {tz.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AnalogClock: React.FC<{
  time: Date;
  timezone: Timezone;
}> = ({ time, timezone }) => {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ms = time.getMilliseconds();

  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = (seconds + ms / 1000) * 6;

  return (
    <div className="relative flex items-center justify-center mx-auto mb-2" style={{ width: 68, height: 68 }}>
      {/* Ticks */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-white bg-opacity-20 rounded"
          style={{
            width: 1.2,
            height: 6,
            left: '50%',
            top: 4,
            transform: `rotate(${i * 30}deg) translate(-50%, 0)`,
            transformOrigin: '50% 32px',
          }}
        />
      ))}
      {/* Hour hand */}
      <div
        className="absolute bg-white rounded"
        style={{
          width: 4,
          height: 20,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -100%) rotate(${hourDeg}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 3,
          boxShadow: '0 0 1.5px #fff8',
        }}
      />
      {/* Minute hand */}
      <div
        className="absolute rounded"
        style={{
          width: 2.5,
          height: 28,
          background: '#fbbf24',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -100%) rotate(${minDeg}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 2,
          boxShadow: '0 0 1.5px #fff8',
        }}
      />
      {/* Second hand */}
      <div
        className="absolute rounded"
        style={{
          width: 1.5,
          height: 33,
          background: '#60a5fa',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -100%) rotate(${secDeg}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 1,
          boxShadow: '0 0 4px #60a5fa99',
        }}
      />
      {/* Center cap */}
      <div
        className="absolute bg-white rounded-full border"
        style={{
          width: 7,
          height: 7,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          boxShadow: '0 0 4px #fff8',
          border: '1.5px solid #818cf8',
        }}
      />
      {/* City label */}
      <div
        className="absolute text-white text-[0.55rem] font-semibold opacity-80"
        style={{
          left: '50%',
          top: '62%',
          transform: 'translate(-50%, 0)',
          letterSpacing: '0.08em',
          textShadow: '0 1px 4px #0008',
          pointerEvents: 'none',
        }}
      >
        {timezone.name}
      </div>
    </div>
  );
};

const ClockMode: React.FC<{
  time: Date;
  weather: Weather | null;
}> = ({ time, weather }) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const dateStr = time.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      {/* Digital Time */}
      <div className="text-center font-mono font-semibold tracking-wider mb-1" style={{ fontSize: '0.85rem' }}>
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </div>
      {/* Date */}
      <div className="text-center" style={{ fontSize: '0.65rem', color: '#bae6fd', fontWeight: 400, marginBottom: '0.2rem' }}>
        {dateStr}
      </div>
      {/* Weather */}
      {weather && (
        <div className="text-center text-xs text-white text-opacity-80">
          {weather.icon} {weather.temperature}°C {weather.condition}
        </div>
      )}
    </>
  );
};

const StopwatchMode: React.FC<{
  stopwatch: ReturnType<typeof useStopwatch>;
}> = ({ stopwatch }) => (
  <>
    {/* Stopwatch Display */}
    <div className="text-center font-mono font-semibold tracking-wider mb-2" style={{ fontSize: '1.1rem' }}>
      {formatTime(stopwatch.time)}
    </div>
    {/* Stopwatch Controls */}
    <div className="flex space-x-2 mb-2">
      <button
        onClick={stopwatch.running ? stopwatch.pause : stopwatch.start}
        className="px-3 py-1 text-xs bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30"
        aria-label={stopwatch.running ? 'Pause stopwatch' : 'Start stopwatch'}
      >
        {stopwatch.running ? 'Pause' : 'Start'}
      </button>
      <button
        onClick={stopwatch.reset}
        className="px-3 py-1 text-xs bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30"
        aria-label="Reset stopwatch"
      >
        Reset
      </button>
      <button
        onClick={stopwatch.lap}
        className="px-3 py-1 text-xs bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30"
        aria-label="Record lap time"
      >
        Lap
      </button>
    </div>
    {/* Lap Times */}
    {stopwatch.laps.length > 0 && (
      <div className="max-h-16 overflow-y-auto text-xs text-white text-opacity-70">
        {stopwatch.laps.map((lap, index) => (
          <div key={index} className="text-center">
            Lap {index + 1}: {formatTime(lap)}
          </div>
        ))}
      </div>
    )}
  </>
);

const TimerMode: React.FC<{
  timer: ReturnType<typeof useTimer>;
}> = ({ timer }) => (
  <>
    {/* Timer Display */}
    <div className="text-center font-mono font-semibold tracking-wider mb-2" style={{ fontSize: '1.1rem' }}>
      {formatTimer(timer.time)}
    </div>
    {/* Timer Controls */}
    <div className="flex space-x-2 mb-2">
      <button
        onClick={timer.running ? timer.pause : timer.start}
        disabled={timer.time === 0}
        className={`px-3 py-1 text-xs rounded ${
          timer.time === 0
            ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
            : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
        }`}
        aria-label={timer.running ? 'Pause timer' : 'Start timer'}
      >
        {timer.running ? 'Pause' : 'Start'}
      </button>
      <button
        onClick={timer.reset}
        className="px-3 py-1 text-xs bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30"
        aria-label="Reset timer"
      >
        Reset
      </button>
    </div>
    {/* Timer Duration Selector */}
    <div className="text-center text-xs text-white text-opacity-70">
      <select
        value={timer.duration / 60}
        onChange={(e) => timer.setDuration(parseInt(e.target.value) * 60)}
        className="bg-transparent text-white text-opacity-70 border border-white border-opacity-30 rounded px-1"
        aria-label="Select timer duration"
      >
        {TIMER_PRESETS.map(preset => (
          <option key={preset.value} value={preset.value / 60}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  </>
);

// Main component
export const Clock: React.FC = () => {
  const [mode, setMode] = useState<ClockMode>('clock');
  const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(TIMEZONES[0]);

  const time = useClock(selectedTimezone);
  const stopwatch = useStopwatch();
  const timer = useTimer();
  const weather = useWeather(selectedTimezone);

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl shadow-lg"
      style={{
        background: 'rgba(30,27,75,0.5)',
        boxShadow: '0 4px 16px 0 rgba(31,38,135,0.18)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '1.2rem',
        border: '1.5px solid rgba(255,255,255,0.13)',
        padding: '1.2rem 1rem 1rem 1rem',
        minWidth: 210, maxWidth: 230,
      }}
      role="application"
      aria-label="Clock application with time, stopwatch, and timer"
    >
      <ModeSelector mode={mode} onModeChange={setMode} />
      <TimezoneSelector timezone={selectedTimezone} onTimezoneChange={setSelectedTimezone} />
      <AnalogClock time={time} timezone={selectedTimezone} />

      {mode === 'clock' && <ClockMode time={time} weather={weather} />}
      {mode === 'stopwatch' && <StopwatchMode stopwatch={stopwatch} />}
      {mode === 'timer' && <TimerMode timer={timer} />}
    </div>
  );
};