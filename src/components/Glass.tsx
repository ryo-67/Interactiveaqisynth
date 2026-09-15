// Glass — the two §5.3 materials as one component. "glass" is the functional layer (controls); "frosted" is content. The HIG rule is enforced by use, not by code: glass never in the content layer, glass never on glass. Parameters come from GLASS in theme.ts via custom properties set once at the scene root; the .glass rules in index.css carry the §5.4 fallbacks (reduced transparency, more contrast, reduced motion) as part of the material.
import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  material?: "glass" | "frosted";
  children: React.ReactNode;
}

export function Glass({ material = "glass", className, children, ...rest }: Props) {
  const cls = ["glass", material === "frosted" ? "frosted" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
