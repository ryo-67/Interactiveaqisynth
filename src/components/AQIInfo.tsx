import React from 'react';
import { AQIDataPoint, getAQIColor } from '../utils/mockData';
import { useTheme, themeColors } from '../utils/theme';

interface AQIInfoProps {
  data: AQIDataPoint;
}

export function AQIInfo({ data }: AQIInfoProps) {
  const theme = useTheme();
  const c = themeColors(theme);

  const items = [
    { label: 'PM2.5', value: data.pm25, unit: '\u03bcg/m\u00b3' },
    { label: 'PM10', value: data.pm10, unit: '\u03bcg/m\u00b3' },
    { label: 'O\u2083', value: data.o3, unit: 'ppb' },
    { label: 'NO\u2082', value: data.no2, unit: 'ppb' },
  ];

  return (
    <div className="flex items-center justify-center gap-5 flex-wrap">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1.5"
          style={{
            // In light mode, add a subtle text shadow for readability over particles
            textShadow: theme === 'light' ? '0 0 12px rgba(235,231,224,0.9), 0 0 24px rgba(235,231,224,0.6)' : 'none',
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontSize: '12px',
              color: c.canvasOverlaySub,
              letterSpacing: '0.05em',
              fontWeight: 500,
            }}
          >
            {item.label}
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: '13px',
              color: c.canvasOverlayText,
              opacity: 0.75,
              fontWeight: 400,
              fontFamily: 'Georgia, serif',
            }}
          >
            {item.value}
          </span>
          <span style={{ fontSize: '10px', opacity: 0.4, color: c.canvasOverlaySub }}>
            {item.unit}
          </span>
          {i < items.length - 1 && (
            <span className="ml-2" style={{ color: c.textFaint, fontSize: '6px' }}>\u25CF</span>
          )}
        </span>
      ))}
    </div>
  );
}