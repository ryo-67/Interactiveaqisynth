// Glass — the two §5.3 materials as one component, on one neutral surface (D-25): "glass" is the functional layer (controls), "frosted" is content. Parameters come from GLASS in theme.ts via custom properties set once at the scene root; index.css carries the §5.4 fallbacks as part of the material. Text inside is the dark theme's, which holds AA on the fill under any sky.
// The blur is the browser's own backdrop-filter, scaled by --glass-on so a panel losing its material loses its blur with it (index.css). The sky drew it for a while (D-50) and no longer does (D-59).
import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  material?: "glass" | "frosted";
  children: React.ReactNode;
}

export const Glass = React.forwardRef<HTMLDivElement, Props>(function Glass({ material = "glass", className, children, ...rest }, ref) {
  const cls = ["glass", material === "frosted" ? "frosted" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      {children}
    </div>
  );
});
