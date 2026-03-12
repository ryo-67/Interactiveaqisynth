import React from 'react';
import { motion } from 'motion/react';
import { BOROUGHS, BOROUGH_PATHS, BOROUGH_CENTERS, type Borough } from '../utils/nycOpenData';
import { AQIDataPoint, getAQIColor } from '../utils/mockData';
import { useTheme, themeColors } from '../utils/theme';

interface NYCBoroughMapProps {
  selectedBorough: Borough;
  onSelectBorough: (b: Borough) => void;
  latestData: Record<Borough, AQIDataPoint | null>;
}

export function NYCBoroughMap({ selectedBorough, onSelectBorough, latestData }: NYCBoroughMapProps) {
  const theme = useTheme();
  const c = themeColors(theme);

  const boroughKeys = BOROUGHS.filter(b => b !== 'Citywide') as Exclude<Borough, 'Citywide'>[];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Borough buttons - compact row */}
      <div className="flex flex-wrap justify-center gap-1">
        {BOROUGHS.map(b => {
          const isActive = b === selectedBorough;
          const data = latestData[b];
          const aqiColor = data ? getAQIColor(data.aqi) : c.textFaint;

          return (
            <button
              key={b}
              onClick={() => onSelectBorough(b)}
              className="px-2.5 py-1 rounded-full transition-all duration-300"
              style={{
                fontSize: '10px',
                letterSpacing: '0.04em',
                background: isActive ? `${aqiColor}22` : 'transparent',
                border: `1px solid ${isActive ? `${aqiColor}66` : c.border}`,
                color: isActive ? aqiColor : c.textMuted,
              }}
            >
              {b === 'Staten Island' ? 'S.I.' : b === 'Citywide' ? 'All NYC' : b}
              {data && (
                <span className="ml-1 tabular-nums" style={{ opacity: 0.7 }}>
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
        className="w-full transition-all duration-300"
        style={{ maxWidth: '200px', maxHeight: '180px' }}
      >
        {/* Water/background */}
        <rect x="0" y="0" width="310" height="345" fill="transparent" />

        {boroughKeys.map(borough => {
          const path = BOROUGH_PATHS[borough];
          const isSelected = selectedBorough === borough || selectedBorough === 'Citywide';
          const data = latestData[borough];
          const color = data ? getAQIColor(data.aqi) : c.textFaint;

          return (
            <motion.path
              key={borough}
              d={path}
              fill={isSelected ? `${color}30` : `${c.textFaint}10`}
              stroke={isSelected ? color : `${c.textFaint}40`}
              strokeWidth={isSelected && selectedBorough !== 'Citywide' ? 2 : 1}
              className="cursor-pointer"
              onClick={() => onSelectBorough(borough)}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              animate={{
                fill: isSelected ? `${color}30` : `${c.textFaint}10`,
                stroke: isSelected ? color : `${c.textFaint}40`,
              }}
              transition={{ duration: 0.5 }}
            />
          );
        })}

        {/* Borough labels */}
        {boroughKeys.map(borough => {
          const center = BOROUGH_CENTERS[borough];
          const isSelected = selectedBorough === borough || selectedBorough === 'Citywide';
          const data = latestData[borough];
          const color = data ? getAQIColor(data.aqi) : c.textFaint;

          return (
            <text
              key={`label-${borough}`}
              x={center.x}
              y={center.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isSelected ? color : `${c.textFaint}80`}
              fontSize="9"
              fontFamily="Georgia, serif"
              fontStyle="italic"
              className="pointer-events-none select-none"
              style={{ transition: 'fill 0.5s' }}
            >
              {borough === 'Staten Island' ? 'S.I.' : borough.slice(0, 3)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
