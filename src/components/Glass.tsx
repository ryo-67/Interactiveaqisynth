// Glass — the two §5.3 materials as one component, each in two tones. "glass" is the functional layer (controls); "frosted" is content. The tone follows the sky under the panel: dark fill with light text over a bright sky, light fill with dark text over a dark one (as Apple's material does). Children re-theme with the tone through ThemeContext, so every text token inside holds AA on the fill. Parameters come from GLASS in theme.ts via custom properties set once at the scene root; index.css carries the §5.4 fallbacks as part of the material.
import React from "react";
import { ThemeContext } from "../utils/theme";

export type GlassTone = "dark" | "light";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  material?: "glass" | "frosted";
  tone?: GlassTone;
  children: React.ReactNode;
}

export const Glass = React.forwardRef<HTMLDivElement, Props>(function Glass({ material = "glass", tone = "dark", className, children, ...rest }, ref) {
  const cls = ["glass", material === "frosted" ? "frosted" : "", tone, className ?? ""].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      <ThemeContext.Provider value={tone === "light" ? "light" : "dark"}>{children}</ThemeContext.Provider>
    </div>
  );
});
