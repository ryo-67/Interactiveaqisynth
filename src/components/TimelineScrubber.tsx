import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipForward, Share2 } from 'lucide-react';
import { AQIDataPoint, getAQIColor, getAQIColorRGB } from '../utils/mockData';
import { useTheme, themeColors } from '../utils/theme';

interface TimelineScrubberProps {
  data: AQIDataPoint[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  isTimelapse: boolean;
  onTimelapseToggle: () => void;
  onShare: () => void;
}

export function TimelineScrubber({
  data,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayToggle,
  isTimelapse,
  onTimelapseToggle,
  onShare,
}: TimelineScrubberProps) {
  const theme = useTheme();
  const c = themeColors(theme);
  const isDark = theme === 'dark';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const getIndexFromEvent = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return currentIndex;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      return Math.round(ratio * (data.length - 1));
    },
    [data.length, currentIndex]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onIndexChange(getIndexFromEvent(e.clientX));
    },
    [getIndexFromEvent, onIndexChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const idx = getIndexFromEvent(e.clientX);
      setHoverIndex(idx);
      if (isDragging) onIndexChange(idx);
    },
    [isDragging, getIndexFromEvent, onIndexChange]
  );

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  // Timelapse auto-advance
  useEffect(() => {
    if (!isTimelapse || !isPlaying) return;
    const interval = setInterval(() => {
      onIndexChange(currentIndex + 1 >= data.length ? 0 : currentIndex + 1);
    }, 2200);
    return () => clearInterval(interval);
  }, [isTimelapse, isPlaying, currentIndex, data.length, onIndexChange]);

  // ——— Canvas rendering ———
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 56; // fixed canvas height

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    const maxAqi = 250;
    const playheadX = data.length > 1 ? (currentIndex / (data.length - 1)) * width : width / 2;
    const hoverX = hoverIndex !== null && data.length > 1
      ? (hoverIndex / (data.length - 1)) * width
      : null;

    // Draw area chart — each pixel column maps to nearest data point
    for (let px = 0; px < width; px++) {
      const dataIdx = Math.min(Math.floor((px / width) * data.length), data.length - 1);
      const point = data[dataIdx];
      const barHeight = Math.max(3, (point.aqi / maxAqi) * height * 0.92);
      const rgb = getAQIColorRGB(point.aqi);

      const isBeforePlayhead = px <= playheadX;
      const distFromPlayhead = Math.abs(px - playheadX);
      const nearPlayhead = distFromPlayhead < 3;

      if (nearPlayhead) {
        // Bright zone around playhead
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.95 : 0.85})`;
      } else if (isBeforePlayhead) {
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.55 : 0.45})`;
      } else {
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.2 : 0.18})`;
      }

      ctx.fillRect(px, height - barHeight, 1, barHeight);
    }

    // Top edge highlight line for depth
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let px = 0; px < width; px += 1) {
      const dataIdx = Math.min(Math.floor((px / width) * data.length), data.length - 1);
      const point = data[dataIdx];
      const barHeight = Math.max(3, (point.aqi / maxAqi) * height * 0.92);
      ctx.lineTo(px, height - barHeight);
    }
    const lineRgb = isDark ? '255,255,255' : '0,0,0';
    ctx.strokeStyle = `rgba(${lineRgb}, 0.12)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Playhead line
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(Math.round(playheadX) - 0.5, 0, 1, height);

    // Playhead glow
    const glowGrad = ctx.createLinearGradient(playheadX - 8, 0, playheadX + 8, 0);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0)');
    glowGrad.addColorStop(0.5, isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
    glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(playheadX - 8, 0, 16, height);

    // Hover line
    if (hoverX !== null && !isDragging && Math.abs(hoverX - playheadX) > 4) {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(Math.round(hoverX) - 0.5, 0, 1, height);
    }
  }, [data, currentIndex, hoverIndex, isDragging, isDark]);

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      // Trigger re-render by forcing a state update — canvas redraws in the effect above
      setHoverIndex(prev => prev);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const progress = data.length > 1 ? currentIndex / (data.length - 1) : 0;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPlayToggle}
          className="p-2.5 rounded-full transition-all duration-200"
          style={{ background: isPlaying ? c.btnBgActive : c.btnBg, border: `1px solid ${c.btnBorder}` }}
          title="Play / Pause (Space)"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" style={{ color: c.textSecondary }} />
          ) : (
            <Play className="w-4 h-4 ml-0.5" style={{ color: c.textSecondary }} />
          )}
        </button>

        <button
          onClick={onTimelapseToggle}
          className="px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5"
          style={{
            background: isTimelapse ? c.btnBgActive : c.bgSurface,
            border: `1px solid ${isTimelapse ? c.btnBorderActive : c.border}`,
            fontSize: '11px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
          title="Toggle Timelapse (T)"
        >
          <SkipForward className="w-3 h-3" style={{ color: c.textMuted }} />
          <span style={{ color: isTimelapse ? c.textPrimary : c.textMuted }}>Timelapse</span>
        </button>

        <button
          onClick={onShare}
          className="p-2 rounded-full transition-all duration-200"
          style={{ background: c.bgSurface, border: `1px solid ${c.border}` }}
          title="Share this moment"
        >
          <Share2 className="w-3.5 h-3.5" style={{ color: c.textMuted }} />
        </button>

        <div className="flex-1 text-right">
          <span style={{
            color: c.textSecondary,
            fontSize: '13px',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
          }}>
            {data[currentIndex]?.date}
          </span>
        </div>
      </div>

      {/* Canvas timeline track */}
      <div
        ref={containerRef}
        className="relative cursor-crosshair select-none touch-none rounded-md overflow-hidden"
        style={{ height: '56px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { setHoverIndex(null); if (isDragging) setIsDragging(false); }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Hover tooltip */}
        {hoverIndex !== null && !isDragging && hoverIndex !== currentIndex && data[hoverIndex] && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${(hoverIndex / (data.length - 1)) * 100}%`,
              top: '-4px',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div
              className="px-2 py-1 rounded-md whitespace-nowrap"
              style={{
                fontSize: '11px',
                fontFamily: 'Georgia, serif',
                background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)',
                color: getAQIColor(data[hoverIndex].aqi),
                border: `1px solid ${c.border}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="tabular-nums font-medium">{data[hoverIndex].aqi}</span>
              <span style={{ color: c.textMuted, marginLeft: '3px' }}>AQI</span>
              <span style={{ color: c.textFaint, marginLeft: '6px', fontSize: '10px' }}>
                {data[hoverIndex].date}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Date range + data points count + keyboard hints */}
      <div className="flex justify-between items-center">
        <span style={{ fontSize: '11px', color: c.textMuted }}>{data[0]?.date}</span>
        <span style={{ fontSize: '10px', color: c.textFaint, letterSpacing: '0.03em' }}>
          {data.length > 1 ? `${data.length} days` : ''} · Space: play · ←→: scrub · T: timelapse
        </span>
        <span style={{ fontSize: '11px', color: c.textMuted }}>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
