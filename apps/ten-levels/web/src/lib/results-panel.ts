/**
 * Patch 0015: the floating Results panel's geometry. Pure functions (no Vue, no DOM) so the node tests cover them:
 * where the panel opens, how a drag or resize is kept inside the viewport, and how the rect round-trips through
 * sessionStorage. At phone widths the panel is a full-width bottom sheet and the stored rect is not used.
 */
export interface PanelRect { x: number; y: number; w: number; h: number }

export const RESULTS_KEY = "jev10.resultsPanel";
/** At or below this viewport width the panel is a full-width sheet (no drag). */
export const SHEET_MAX = 640;
export const MIN_W = 320;
export const MIN_H = 200;
/** Keep the panel clear of the fixed nav bar (styles.css --nav). */
export const TOP = 70;
const GAP = 8;

export function isSheet(vw: number): boolean {
  return vw <= SHEET_MAX;
}

/** Bottom-right, beside the run modal's View Results button. */
export function defaultRect(vw: number, vh: number): PanelRect {
  const w = Math.min(560, vw - 2 * GAP);
  const h = Math.min(Math.round(vh * 0.72), vh - TOP - 2 * GAP);
  return clampRect({ x: vw - w - 24, y: vh - h - 24, w, h }, vw, vh);
}

/** The whole panel stays on screen: size clamped to the viewport, then position clamped so no edge leaves it. */
export function clampRect(r: PanelRect, vw: number, vh: number): PanelRect {
  const maxW = Math.max(MIN_W, vw - 2 * GAP);
  const maxH = Math.max(MIN_H, vh - TOP - 2 * GAP);
  const w = Math.round(Math.min(Math.max(r.w, Math.min(MIN_W, maxW)), maxW));
  const h = Math.round(Math.min(Math.max(r.h, Math.min(MIN_H, maxH)), maxH));
  const x = Math.round(Math.min(Math.max(r.x, GAP), Math.max(GAP, vw - w - GAP)));
  const y = Math.round(Math.min(Math.max(r.y, TOP + GAP), Math.max(TOP + GAP, vh - h - GAP)));
  return { x, y, w, h };
}

/** A drag: the rect at pointer-down moved by the pointer delta, kept inside the viewport. */
export function dragRect(start: PanelRect, dx: number, dy: number, vw: number, vh: number): PanelRect {
  return clampRect({ ...start, x: start.x + dx, y: start.y + dy }, vw, vh);
}

type Store = Pick<Storage, "getItem" | "setItem">;

export function loadRect(store: Store | undefined, vw: number, vh: number): PanelRect {
  try {
    const r = JSON.parse(store?.getItem(RESULTS_KEY) ?? "null");
    if (r && [r.x, r.y, r.w, r.h].every((v) => typeof v === "number" && Number.isFinite(v))) return clampRect(r, vw, vh);
  } catch { /* unreadable or blocked storage: fall back to the default */ }
  return defaultRect(vw, vh);
}

export function saveRect(store: Store | undefined, r: PanelRect): void {
  try { store?.setItem(RESULTS_KEY, JSON.stringify(r)); } catch { /* storage blocked: position is not remembered */ }
}
