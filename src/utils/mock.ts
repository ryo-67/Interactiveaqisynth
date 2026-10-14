// mock — the page's states on demand, for judging their design and copy without breaking anything to reach them (2026-10-12, D-69): ?mock=<name> on the dev server forces the state its cause would set. import.meta.env.DEV is false in a production build, so MOCK is null there and nothing reads the URL for it.
// The pill states (StatusLine) show on the live line's spot over the real page; the screen states (Fallback) replace the page, as an unrecoverable error or a missing WebGL would.
const MOCKS = ["no-readings", "day-loading", "day-failed", "no-sound", "crashed", "no-webgl"] as const;
export type Mock = (typeof MOCKS)[number];

const asked = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("mock") : null;
export const MOCK: Mock | null = MOCKS.find((m) => m === asked) ?? null;
