import React, { useState, useMemo } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AQIDataPoint, getAQIColor, getMusicMapping, getEffectProse, getAQILabel } from '../utils/mockData';
import { useTheme, themeColors } from '../utils/theme';

interface ShareModalProps {
  data: AQIDataPoint;
  isTimelapse: boolean;
  onClose: () => void;
  borough?: string;
}

export function ShareModal({ data, isTimelapse, onClose, borough }: ShareModalProps) {
  const theme = useTheme();
  const c = themeColors(theme);
  const [copied, setCopied] = useState(false);

  const mapping = getMusicMapping(data.aqi, isTimelapse);
  const color = getAQIColor(data.aqi);
  const label = getAQILabel(data.aqi);
  const effectProse = getEffectProse({ pm25: data.pm25, pm10: data.pm10, o3: data.o3, no2: data.no2 });

  // BPM-synced pulse duration
  const pulseDuration = useMemo(() => 60 / mapping.bpm, [mapping.bpm]);

  const locationStr = borough && borough !== 'Citywide' ? `${borough}, NYC` : 'NYC';

  const shareText = [
    `${locationStr} Air Quality \u00b7 ${data.date}`,
    `AQI ${data.aqi} \u00b7 ${label}`,
    ``,
    `Mood: ${mapping.mood}`,
    `${mapping.feeling}`,
    ``,
    `Scale: ${mapping.scale} \u00b7 ${mapping.bpm} BPM`,
    `${effectProse}`,
    ``,
    `PM2.5: ${data.pm25} \u03bcg/m\u00b3 \u00b7 PM10: ${data.pm10} \u03bcg/m\u00b3`,
    `O\u2083: ${data.o3} ppb \u00b7 NO\u2082: ${data.no2} ppb`,
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}` }}
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* BPM-synced pulsing accent bar */}
          <div className="relative" style={{ height: '3px' }}>
            <div style={{ position: 'absolute', inset: 0, background: `${color}40` }} />
            <motion.div
              style={{ position: 'absolute', inset: 0, background: color }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: pulseDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          <div className="p-8">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
              style={{ background: c.bgSurface }}
            >
              <X className="w-4 h-4" style={{ color: c.textMuted }} />
            </button>

            {/* AQI number + date */}
            <div className="flex items-baseline gap-4 mb-1">
              <span
                className="tabular-nums"
                style={{ fontSize: '48px', fontWeight: 200, letterSpacing: '-0.02em', color: color }}
              >
                {data.aqi}
              </span>
              <div>
                <div style={{ fontSize: '12px', color: c.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {label}
                </div>
                <div style={{ fontSize: '12px', color: c.textFaint }}>
                  {borough && borough !== 'Citywide' ? `${borough} \u00b7 ` : ''}{data.date}
                </div>
              </div>
            </div>

            {/* Mood + feeling */}
            <div className="mt-6 mb-5">
              <div
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontSize: '22px',
                  fontWeight: 400,
                  color: c.textPrimary,
                  lineHeight: 1.3,
                }}
              >
                {mapping.mood}
              </div>
              <p style={{
                fontSize: '13px',
                lineHeight: 1.7,
                color: c.textSecondary,
                marginTop: '8px',
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}>
                {mapping.feeling}
              </p>
            </div>

            {/* Musical details */}
            <div
              className="py-4 mb-4"
              style={{ borderTop: `1px solid ${c.borderSubtle}`, borderBottom: `1px solid ${c.borderSubtle}` }}
            >
              <div className="flex gap-6">
                <div>
                  <div style={{ fontSize: '10px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    Scale
                  </div>
                  <div style={{ fontSize: '13px', color: c.textPrimary }}>{mapping.scale}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    Tempo
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '13px', color: c.textPrimary }}>{mapping.bpm} BPM</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    Mode
                  </div>
                  <div style={{ fontSize: '13px', color: c.textPrimary }}>{isTimelapse ? 'Timelapse' : 'Ambient'}</div>
                </div>
              </div>
            </div>

            {/* Effect prose */}
            <p style={{
              fontSize: '11px',
              lineHeight: 1.7,
              color: c.textMuted,
              fontStyle: 'italic',
            }}>
              {effectProse}
            </p>

            {/* Pollutant data */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 mb-6">
              {[
                { label: 'PM2.5', value: data.pm25, unit: '\u03bcg/m\u00b3' },
                { label: 'PM10', value: data.pm10, unit: '\u03bcg/m\u00b3' },
                { label: 'O\u2083', value: data.o3, unit: 'ppb' },
                { label: 'NO\u2082', value: data.no2, unit: 'ppb' },
              ].map(p => (
                <span key={p.label} className="tabular-nums" style={{ fontSize: '11px', color: c.textFaint }}>
                  {p.label} {p.value} {p.unit}
                </span>
              ))}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200"
              style={{
                background: copied ? `${color}22` : c.bgSurface,
                border: `1px solid ${copied ? `${color}44` : c.border}`,
                color: copied ? color : c.textSecondary,
                fontSize: '13px',
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to clipboard' : 'Copy this moment'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
