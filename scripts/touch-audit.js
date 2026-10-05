// touch-audit — paste into the page's console (or run it through a preview's javascript tool) at a phone or tablet size. Lists every control whose hit area is under 44 × 44 CSS px (D-64, 2026-10-05). Hidden, inert and pointer-transparent controls are skipped: they cannot be touched. Pass: offenders is empty on the phone, phone-landscape and tablet layouts.
(() => {
  const MIN = 44;
  const sel = "button, a[href], input, select, [role='tab'], [role='option']";
  const offenders = [];
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest("[inert]") || el.closest("[aria-hidden='true']")) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue; // nothing to touch, or visually hidden for screen readers only (the day sheet's close)
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") continue;
    if (r.width < MIN - 0.5 || r.height < MIN - 0.5) offenders.push({ el: (el.getAttribute("aria-label") || el.textContent || el.className || el.tagName).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return { layout: document.querySelector(".scene-root")?.dataset.layout, offenders };
})();
