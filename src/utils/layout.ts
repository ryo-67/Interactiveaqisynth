// layout — which of the page's four layouts applies (D-63, 2026-10-05; spec docs/superpowers/specs/2026-10-05-phone-layout-design.md). One rule, here and nowhere else in JS: the JS had said a phone was 575 wide and the CSS 767, and landscape phones (844–932 wide) fell into the tablet layout because nothing looked at height, which is where they overlapped. The rows are tested in order and the first match wins.
//   phone-landscape  under 500 tall and wider than tall, at any width: a phone on its side, or a laptop window dragged short — the layout that fits a short screen
//   laptop           1024 wide and up
//   tablet           768–1023 wide
//   phone            under 768 wide
// ScenePage writes the result to .scene-root[data-layout]; the phone and tablet CSS lives under that attribute (index.css), whose specificity beats the width media queries that still serve the laptop and tablet.
import { useEffect, useState } from "react";

export type Layout = "laptop" | "tablet" | "phone" | "phone-landscape";
export const LAYOUT = { laptopMin: 1024, tabletMin: 768, landscapeMaxH: 500 } as const;

export function layoutFor(width: number, height: number): Layout {
  if (height < LAYOUT.landscapeMaxH && width > height) return "phone-landscape";
  if (width >= LAYOUT.laptopMin) return "laptop";
  if (width >= LAYOUT.tabletMin) return "tablet";
  return "phone";
}

export const isPhoneLayout = (l: Layout): boolean => l === "phone" || l === "phone-landscape";

const read = (): Layout => (typeof window === "undefined" ? "laptop" : layoutFor(window.innerWidth, window.innerHeight));

export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(read);
  useEffect(() => {
    const on = () => setLayout(read());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return layout;
}
