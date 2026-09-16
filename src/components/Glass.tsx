// Glass — the two §5.3 materials as one component, on one neutral surface (D-25): "glass" is the functional layer (controls), "frosted" is content. Parameters come from GLASS in theme.ts via custom properties set once at the scene root; index.css carries the §5.4 fallbacks as part of the material. Text inside is the dark theme's, which holds AA on the fill under any sky.
// The blur behind a glass is drawn by the sky (D-50, 2026-09-16): each glass registers its element with frost.ts, and the sky's FrostEffect blurs the frame inside that rectangle every frame. `frost={false}` opts out, for a glass that floats over other glass, which the sky cannot see.
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { registerFrost } from "../scene/frost";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  material?: "glass" | "frosted";
  frost?: boolean;
  children: React.ReactNode;
}

export const Glass = React.forwardRef<HTMLDivElement, Props>(function Glass({ material = "glass", frost = true, className, children, ...rest }, ref) {
  const cls = ["glass", material === "frosted" ? "frosted" : "", className ?? ""].filter(Boolean).join(" ");
  const own = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback((el: HTMLDivElement | null) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]);
  useLayoutEffect(() => {
    if (!frost || !own.current) return;
    return registerFrost(own.current);
  }, [frost]);
  return (
    <div ref={setRef} className={cls} {...rest}>
      {children}
    </div>
  );
});
