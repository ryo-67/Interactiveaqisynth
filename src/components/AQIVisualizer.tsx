import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAQIColorRGB, getAQIColor, getAQILabel, type AQIDataPoint } from '../utils/mockData';
import { useTheme, themeColors } from '../utils/theme';
import { BOROUGHS, BOROUGH_PATHS, BOROUGH_CENTERS, type Borough } from '../utils/nycOpenData';

interface AQIVisualizerProps {
  aqi: number;
  isPlaying: boolean;
  selectedBorough: Borough;
  onSelectBorough: (b: Borough) => void;
  latestData: Record<Borough, AQIDataPoint | null>;
}

interface Orb {
  x: number; y: number; vx: number; vy: number;
  radius: number; baseRadius: number; phase: number;
  speed: number; opacity: number;
}

export function AQIVisualizer({ aqi, isPlaying, selectedBorough, onSelectBorough, latestData }: AQIVisualizerProps) {
  const theme = useTheme();
  const c = themeColors(theme);
  const isDark = theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const orbsRef = useRef<Orb[]>([]);
  const timeRef = useRef(0);
  const targetAqiRef = useRef(aqi);
  const smoothAqiRef = useRef(aqi);
  const themeRef = useRef(theme);
  const [hoveredBorough, setHoveredBorough] = useState<string | null>(null);

  useEffect(() => { targetAqiRef.current = aqi; }, [aqi]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }
    };
    resize();

    const numOrbs = 8;
    orbsRef.current = Array.from({ length: numOrbs }, (_, i) => ({
      x: Math.random() * (canvas.width / (window.devicePixelRatio || 1)),
      y: Math.random() * (canvas.height / (window.devicePixelRatio || 1)),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      radius: 70 + Math.random() * 90,
      baseRadius: 70 + Math.random() * 90,
      phase: (i / numOrbs) * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
      opacity: 0.12 + Math.random() * 0.18,
    }));

    const animate = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const isDk = themeRef.current === 'dark';

      smoothAqiRef.current += (targetAqiRef.current - smoothAqiRef.current) * 0.025;
      const currentAqi = smoothAqiRef.current;
      const color = getAQIColorRGB(currentAqi);
      const complexity = Math.min(currentAqi / 150, 1);

      const bgR = isDk ? 10 : 235;
      const bgG = isDk ? 10 : 231;
      const bgB = isDk ? 22 : 224;
      ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, ${0.055 + complexity * 0.04})`;
      ctx.fillRect(0, 0, width, height);

      orbsRef.current.forEach((orb, i) => {
        const breathe = Math.sin(timeRef.current * orb.speed * 3 + orb.phase) * 0.5 + 0.5;
        orb.radius = orb.baseRadius * (0.65 + breathe * 0.7) * (1 + complexity * 0.5);

        const driftX = Math.sin(timeRef.current * 0.0009 + orb.phase) * (0.18 + complexity * 0.3);
        const driftY = Math.cos(timeRef.current * 0.0007 + orb.phase * 1.3) * (0.12 + complexity * 0.2);

        orb.x += orb.vx + driftX;
        orb.y += orb.vy + driftY;

        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        const hueShift = i * 35;
        const r = Math.min(255, Math.max(0, color.r + Math.sin(hueShift * 0.017) * 45));
        const g = Math.min(255, Math.max(0, color.g + Math.cos(hueShift * 0.017) * 35));
        const b = Math.min(255, Math.max(0, color.b + Math.sin(hueShift * 0.03) * 55));
        const alphaMul = isDk ? 1 : 1.3;
        const alpha = orb.opacity * (0.55 + breathe * 0.45) * alphaMul;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.65})`);
        gradient.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
        gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${alpha * 0.06})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();

        const coreGradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 0.25);
        coreGradient.addColorStop(0, `rgba(255, 255, 255, ${(isDk ? 0.12 : 0.08) * alpha})`);
        coreGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      if (isPlaying) {
        const particleCount = 1 + Math.floor(complexity * 3);
        for (let i = 0; i < particleCount; i++) {
          const px = Math.random() * width;
          const py = Math.random() * height;
          const pr = 0.8 + Math.random() * 1.5;
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.04 + Math.random() * 0.06})`;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      timeRef.current += isPlaying ? 1 : 0.3;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, [isPlaying]);

  const label = getAQILabel(aqi);
  const color = getAQIColor(aqi);
  const boroughKeys = BOROUGHS.filter(b => b !== 'Citywide') as Exclude<Borough, 'Citywide'>[];

  // Map color helpers for proper light/dark
  const mapFillDefault = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const mapStrokeDefault = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
  const mapLabelDefault = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(30,25,20,0.4)';
  const pillBgDefault = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const pillBorderDefault = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';

  return (
    <div className="relative w-full" style={{ height: '54vh', minHeight: '380px' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: c.bgCanvas }}
      />

      {/* Main content overlay — AQI left, Map right */}
      <div className="absolute inset-0 flex items-center pointer-events-none">
        <div className="w-full max-w-5xl mx-auto px-8 flex items-center justify-between gap-8">
          {/* Left: AQI number + label + borough */}
          <div className="flex flex-col items-start py-4">
            {/* AQI number */}
            <AnimatePresence mode="wait">
              <motion.div
                key={Math.round(aqi)}
                initial={{ opacity: 0.6, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="tabular-nums"
                style={{
                  fontSize: 'clamp(72px, 16vw, 150px)',
                  fontWeight: 100,
                  letterSpacing: '-0.04em',
                  color: c.canvasOverlayText,
                  textShadow: c.canvasTextShadow,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: 1,
                }}
              >
                {Math.round(aqi)}
              </motion.div>
            </AnimatePresence>

            {/* Severity tag */}
            <div
              className="mt-4 px-4 py-1.5 rounded-full"
              style={{
                background: `${color}20`,
                border: `1px solid ${color}40`,
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color,
                }}
              >
                {label}
              </span>
            </div>

            {/* Borough name */}
            {selectedBorough !== 'Citywide' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '16px',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  color: c.canvasOverlaySub,
                  marginTop: '16px',
                }}
              >
                {selectedBorough}
              </motion.div>
            )}
            {selectedBorough === 'Citywide' && (
              <div
                style={{
                  fontSize: '16px',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  color: c.canvasOverlaySub,
                  marginTop: '16px',
                }}
              >
                New York City
              </div>
            )}
          </div>

          {/* Right: Interactive Borough Map — desktop only */}
          <div className="hidden md:flex flex-col items-center gap-4 pointer-events-auto">
            {/* Borough pills */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {BOROUGHS.map(b => {
                const isActive = b === selectedBorough;
                const data = latestData[b];
                const aqiColor = data ? getAQIColor(data.aqi) : c.textMuted;
                return (
                  <button
                    key={b}
                    onClick={() => onSelectBorough(b)}
                    className="px-2.5 py-1 rounded-full transition-all duration-300"
                    style={{
                      fontSize: '10px',
                      fontWeight: isActive ? 500 : 400,
                      letterSpacing: '0.04em',
                      background: isActive ? `${aqiColor}22` : pillBgDefault,
                      border: `1px solid ${isActive ? `${aqiColor}55` : pillBorderDefault}`,
                      color: isActive ? aqiColor : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'),
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    {b === 'Staten Island' ? 'S.I.' : b === 'Citywide' ? 'All NYC' : b}
                    {data && isActive && (
                      <span className="ml-1.5 tabular-nums" style={{ opacity: 0.7, fontSize: '9px' }}>
                        {data.aqi}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SVG Map */}
            <svg
              viewBox="0 0 310 345"
              style={{
                width: '340px',
                height: '320px',
                filter: isDark ? 'drop-shadow(0 0 25px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 12px rgba(0,0,0,0.08))',
              }}
            >
              {boroughKeys.map(borough => {
                const path = BOROUGH_PATHS[borough];
                const isSelected = selectedBorough === borough || selectedBorough === 'Citywide';
                const isHovered = hoveredBorough === borough;
                const data = latestData[borough];
                const bColor = data ? getAQIColor(data.aqi) : (isDark ? '#666' : '#999');

                const fillColor = isSelected
                  ? `${bColor}${isHovered ? '50' : '30'}`
                  : (isHovered ? `${bColor}20` : mapFillDefault);
                const strokeColor = isSelected
                  ? `${bColor}${isHovered ? 'dd' : 'aa'}`
                  : (isHovered ? `${bColor}66` : mapStrokeDefault);
                const strokeW = (isSelected && selectedBorough !== 'Citywide') ? 2.5 : (isHovered ? 1.5 : 1);

                return (
                  <motion.path
                    key={borough}
                    d={path}
                    className="cursor-pointer"
                    onClick={() => onSelectBorough(borough)}
                    onMouseEnter={() => setHoveredBorough(borough)}
                    onMouseLeave={() => setHoveredBorough(null)}
                    initial={false}
                    animate={{
                      fill: fillColor,
                      stroke: strokeColor,
                      strokeWidth: strokeW,
                      scale: isHovered ? 1.04 : 1,
                    }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{
                      transformOrigin: `${BOROUGH_CENTERS[borough].x}px ${BOROUGH_CENTERS[borough].y}px`,
                      filter: (isSelected && selectedBorough !== 'Citywide')
                        ? `drop-shadow(0 0 10px ${bColor}44)`
                        : 'none',
                    }}
                  />
                );
              })}

              {/* Borough labels with AQI */}
              {boroughKeys.map(borough => {
                const center = BOROUGH_CENTERS[borough];
                const isSelected = selectedBorough === borough || selectedBorough === 'Citywide';
                const isHovered = hoveredBorough === borough;
                const data = latestData[borough];
                const bColor = data ? getAQIColor(data.aqi) : c.textMuted;
                const showFull = isHovered || (isSelected && selectedBorough !== 'Citywide');

                return (
                  <g key={`label-${borough}`} className="pointer-events-none select-none">
                    {/* Borough name */}
                    <text
                      x={center.x}
                      y={center.y - (data ? 7 : 0)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isSelected || isHovered
                        ? (isDark ? `${bColor}dd` : `${bColor}cc`)
                        : mapLabelDefault}
                      fontSize={showFull ? '9' : '8'}
                      fontFamily="Georgia, serif"
                      fontStyle="italic"
                      style={{ transition: 'all 0.3s ease' }}
                    >
                      {showFull
                        ? (borough === 'Staten Island' ? 'Staten Is.' : borough)
                        : (borough === 'Staten Island' ? 'S.I.' : borough === 'Manhattan' ? 'Man' : borough.slice(0, 3))
                      }
                    </text>
                    {/* AQI value */}
                    {data && (
                      <text
                        x={center.x}
                        y={center.y + 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isSelected || isHovered ? bColor : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}
                        fontSize="11"
                        fontFamily="Georgia, serif"
                        fontWeight="500"
                        style={{ transition: 'all 0.3s ease' }}
                      >
                        {data.aqi}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Animated pulse ring on selected borough */}
              {selectedBorough !== 'Citywide' && (() => {
                const center = BOROUGH_CENTERS[selectedBorough];
                const data = latestData[selectedBorough];
                const bColor = data ? getAQIColor(data.aqi) : color;
                return (
                  <motion.circle
                    cx={center.x}
                    cy={center.y}
                    r={24}
                    fill="none"
                    stroke={bColor}
                    strokeWidth={1}
                    animate={{
                      r: [24, 32, 24],
                      opacity: [0.25, 0.05, 0.25],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none"
                  />
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {/* Mobile borough pills — bottom of hero */}
      <div className="absolute bottom-14 left-0 right-0 flex justify-center pointer-events-auto md:hidden px-4">
        <div className="flex flex-wrap justify-center gap-1.5">
          {BOROUGHS.map(b => {
            const isActive = b === selectedBorough;
            const data = latestData[b];
            const aqiColor = data ? getAQIColor(data.aqi) : c.textMuted;
            return (
              <button
                key={b}
                onClick={() => onSelectBorough(b)}
                className="px-2.5 py-1 rounded-full transition-all duration-300"
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? `${aqiColor}22` : pillBgDefault,
                  border: `1px solid ${isActive ? `${aqiColor}55` : pillBorderDefault}`,
                  color: isActive ? aqiColor : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'),
                  backdropFilter: 'blur(6px)',
                }}
              >
                {b === 'Staten Island' ? 'S.I.' : b === 'Citywide' ? 'All' : b}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}