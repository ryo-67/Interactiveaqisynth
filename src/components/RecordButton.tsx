import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Circle, Download, Loader2 } from 'lucide-react';
import * as Tone from 'tone';
import { useTheme, themeColors } from '../utils/theme';

interface RecordButtonProps {
  isPlaying: boolean;
  durationSec?: number;
}

export function RecordButton({ isPlaying, durationSec = 12 }: RecordButtonProps) {
  const theme = useTheme();
  const c = themeColors(theme);

  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) cancelAnimationFrame(progressTimerRef.current);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (streamDestRef.current) {
        try { streamDestRef.current.disconnect(); } catch {}
      }
    };
  }, [downloadUrl]);

  const startRecording = useCallback(async () => {
    if (!isPlaying) return;
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    try {
      // Create a MediaStreamDestination from the raw audio context
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const streamDest = rawCtx.createMediaStreamDestination();
      streamDestRef.current = streamDest;

      // Connect Tone's master output to stream destination
      const destNode = Tone.getDestination();
      (destNode as any).output.connect(streamDest);

      // Determine best codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      chunksRef.current = [];
      const recorder = new MediaRecorder(streamDest.stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsRecording(false);
        setProgress(0);

        // Disconnect stream destination
        try { (destNode as any).output.disconnect(streamDest); } catch {}

        if (progressTimerRef.current) {
          cancelAnimationFrame(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      };

      recorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Animate progress
      const animateProgress = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const pct = Math.min(elapsed / durationSec, 1);
        setProgress(pct);
        if (pct < 1) {
          progressTimerRef.current = requestAnimationFrame(animateProgress);
        }
      };
      progressTimerRef.current = requestAnimationFrame(animateProgress);

      // Auto-stop after duration
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, durationSec * 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      setIsRecording(false);
    }
  }, [isPlaying, durationSec, downloadUrl]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `nyc-air-sonification-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [downloadUrl]);

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: 'rgba(230, 60, 60, 0.15)',
            border: '1px solid rgba(230, 60, 60, 0.4)',
            fontSize: '11px',
            color: '#e63c3c',
          }}
        >
          <div className="relative w-3 h-3">
            {/* Recording pulse */}
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: '#e63c3c' }}
            />
            {/* Progress ring */}
            <svg className="absolute inset-0 w-3 h-3 -rotate-90">
              <circle
                cx="6" cy="6" r="5"
                fill="none"
                stroke="rgba(230,60,60,0.3)"
                strokeWidth="1.5"
              />
              <circle
                cx="6" cy="6" r="5"
                fill="none"
                stroke="#e63c3c"
                strokeWidth="1.5"
                strokeDasharray={`${progress * 31.4} 31.4`}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="tabular-nums">{Math.ceil(durationSec - progress * durationSec)}s</span>
        </button>
      ) : downloadUrl ? (
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: c.bgSurface,
            border: `1px solid ${c.border}`,
            fontSize: '11px',
            color: c.textSecondary,
          }}
        >
          <Download className="w-3 h-3" />
          <span>Download clip</span>
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={!isPlaying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: c.bgSurface,
            border: `1px solid ${c.border}`,
            fontSize: '11px',
            color: isPlaying ? c.textSecondary : c.textFaint,
            opacity: isPlaying ? 1 : 0.5,
            cursor: isPlaying ? 'pointer' : 'not-allowed',
          }}
          title={isPlaying ? `Record ${durationSec}s clip` : 'Start playback first'}
        >
          <Circle className="w-3 h-3" style={{ fill: isPlaying ? '#e63c3c' : c.textFaint, color: 'transparent' }} />
          <span>Record {durationSec}s</span>
        </button>
      )}
    </div>
  );
}
