import React, { useEffect, useRef, useState } from 'react';

type FrameRequestCallback = (time: number) => void;
declare function requestAnimationFrame(callback: FrameRequestCallback): number;
declare function cancelAnimationFrame(handle: number): void;

export const Clock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Use global requestAnimationFrame for Deno compatibility
    const animate = () => {
      setNow(new Date());
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });

  // Analog hand angles
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = (seconds + ms / 1000) * 6;

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
      aria-label="Current time and date"
    >
      {/* Analog Clock */}
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
          CUP
        </div>
      </div>
      {/* Digital Time */}
      <div className="text-center font-mono font-semibold tracking-wider mb-1" style={{ fontSize: '0.85rem' }}>
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </div>
      {/* Date */}
      <div className="text-center" style={{ fontSize: '0.65rem', color: '#bae6fd', fontWeight: 400, marginBottom: '0.2rem' }}>
        {dateStr}
      </div>
    </div>
  );
};