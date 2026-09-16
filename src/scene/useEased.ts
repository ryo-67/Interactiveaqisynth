// useEased — eases a number toward its target over `tauMs` (exponential; ~63% of the way per tau), so per-beat steps in the data become continuous motion. Runs only while the value is off target. The sky's inputs, the ramp lifts and the monitor's meters all use it (D-43), so everything that follows the beat moves on one curve.
import { useEffect, useRef, useState } from "react";
import { warnOnce } from "../utils/time";

export function useEased(target: number, tauMs: number, name = "eased input"): number {
  const [value, setValue] = useState(Number.isFinite(target) ? target : 0);
  const valueRef = useRef(Number.isFinite(target) ? target : 0);
  useEffect(() => {
    if (!Number.isFinite(target)) { warnOnce(name); return; } // a NaN would ease to NaN for good; hold instead and say so once
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      const v = valueRef.current + (target - valueRef.current) * (1 - Math.exp(-dt / tauMs));
      valueRef.current = Math.abs(target - v) < 1e-3 ? target : v;
      setValue(valueRef.current);
      if (valueRef.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, tauMs]);
  return value;
}
