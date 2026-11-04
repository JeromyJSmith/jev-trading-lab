// @ts-nocheck
/**
 * Patch 0011: the run-modal scene for a spec-backed option (trading scenarios L1-L10, levels 11-13). Same palette,
 * strokes and glow as the upstream heroes, but every label comes from the option's `visual` block, which the
 * workbench exporter derives from the spec YAML (decisions/decisions/speclab/visual.py):
 *   input card   a real excerpt of the current set instead of placeholder bars
 *   input arrow  which fields the state is built from, the data cutoff, the code guards that run before the call
 *   decision     the question label(s); the overlay adds the answer and its probability
 *   outputs      one box per spec outcome: its meaning and the rule conditions that lead there
 *   branches     the policy stage of each branch (guard, gate, route, decide, default); thresholds on the fork
 * The policy engine decides the outcome; the modal only lights the box the `policy` event names.
 * Upstream originals keep their hero (hero-scenes.mjs).
 */
import { C, defs, W, H } from "./hero-scenes.mjs";
export const ABSTAIN_ID = "__abstain__";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Greedy word wrap by characters; the last line gets an ellipsis when text is cut. */
export function wrap(text, chars, maxLines) {
  const words = String(text ?? "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= chars) cur += " " + w;
    else { lines.push(cur); cur = w; }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  const used = lines.join(" ").length;
  const total = words.join(" ").length;
  if (used < total && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = (last.length > chars - 1 ? last.slice(0, chars - 1) : last) + "…";
  }
  return lines.map((l) => (l.length > chars ? l.slice(0, chars - 1) + "…" : l));
}

/** Value at a dotted path with optional [i] indexes, e.g. "items[0].headline". */
export function at(obj, path) {
  if (!path) return undefined;
  let v = obj;
  for (const part of String(path).split(".")) {
    const m = part.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (!m || v == null) return undefined;
    v = v[m[1]];
    if (m[2] !== undefined) v = Array.isArray(v) ? v[Number(m[2])] : undefined;
  }
  return v;
}

/** A compact one-line rendering of an input value: no JSON walls. */
export function compact(v, n = 140) {
  const cut = (s) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return cut(v.replace(/\s+/g, " ").trim());
  if (Array.isArray(v)) {
    if (!v.length) return "none";
    const first = v[0];
    const head = first && typeof first === "object"
      ? (Object.values(first).find((x) => typeof x === "string" && x.length > 12) ?? compact(first, 60))
      : String(first);
    return cut(`${v.length} item${v.length === 1 ? "" : "s"}: ${head}${v.length > 1 ? ", …" : ""}`);
  }
  if (typeof v === "object") {
    return cut(Object.entries(v).filter(([, x]) => x !== null && typeof x !== "object").slice(0, 5)
      .map(([k, x]) => `${k} ${typeof x === "boolean" ? (x ? "yes" : "no") : x}`).join(" · ") || `${Object.keys(v).length} fields`);
  }
  return cut(String(v));
}

const box = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 18}" fill="${o.fill ?? C.boxFill}" stroke="${o.stroke ?? C.box}" stroke-width="${o.sw ?? 5}"${o.glow ? ` filter="url(#${o.glow})"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const line = (d, o = {}) =>
  `<path d="${d}" fill="none" stroke="${o.stroke ?? C.line}" stroke-width="${o.sw ?? 5}" stroke-linecap="round" stroke-linejoin="round"${o.arrow ? ` marker-end="url(#${o.arrow})"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const text = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 22}" font-weight="${o.weight ?? 600}" fill="${o.fill ?? C.line}" text-anchor="${o.anchor ?? "start"}" class="ui-text">${esc(s)}</text>`;
const lines = (x, y, arr, o = {}) => arr.map((s, i) => text(x, y + i * (o.gap ?? (o.size ?? 22) + 6), s, o)).join("");

const JEV = { x: 830, y: 450, r: 150 };
const BOX_X = 1150, BOX_W = 430, FORK_X = 1070;

/** The geometry the run modal animates on (same shape as an ANIM entry in hero-scenes.mjs). */
export function tradingAnim(visual) {
  const outs = visual?.outcomes ?? [];
  const n = Math.max(1, outs.length);
  const top = 40, bottom = 860, gap = n > 4 ? 14 : 24;
  const h = Math.min(170, Math.floor((bottom - top - gap * (n - 1)) / n));
  const y0 = Math.round((H - (n * h + gap * (n - 1))) / 2);
  const outcomes = outs.map((o, i) => ({ id: o.id, x: BOX_X, y: y0 + i * (h + gap), w: BOX_W, h }));
  return {
    jev: JEV,
    request: `M470 450 H${JEV.x - 120}`,
    responses: outcomes.map((o) => `M${JEV.x + 112} 450 H${FORK_X} V${o.y + o.h / 2} H${BOX_X - 10}`),
    outcomes,
    pick: () => undefined,
  };
}

/** The scene markup: defs plus the drawing. `input` is the current set; nothing is lit (the overlay lights the pick). */
export function tradingScene(visual, input, setName = "") {
  const a = tradingAnim(visual);
  const v = visual ?? {};
  const sym = [input?.symbol ?? input?.ticker, input?.venue].filter(Boolean).join(" · ");
  const excerpt = compact(at(input, v.excerpt) ?? "", 400);
  const qs = v.questions ?? [];
  const qLabel = qs.length > 2 ? `${qs.length} questions` : qs.map((q) => `${q.short}?`).join(" + ");
  const qTypes = [...new Set(qs.map((q) => q.type))].join(" / ");

  let s = defs;
  // Input card: set name, symbol and venue, then a real excerpt.
  s += box(130, 250, 340, 400);
  s += text(160, 296, setName ? `Set ${setName}` : "Input", { size: 24, fill: C.accent, weight: 700 });
  if (sym) s += text(160, 332, sym, { size: 24, weight: 700, fill: "#efe6f7" });
  s += lines(160, sym ? 378 : 342, wrap(excerpt || "(no text field)", 24, sym ? 9 : 10), { size: 21, weight: 500, fill: "#d9cce6", gap: 28 });
  if (v.excerpt) s += text(160, 632, `excerpt: ${v.excerpt}`, { size: 16, weight: 500, fill: C.dim });

  // Input arrow: what the state is built from, and the code guards that run before any call.
  s += line(`M470 450 H${JEV.x - 120}`, { arrow: "arrow" });
  s += lines(482, 360, wrap(v.arrows?.input ?? "", 19, 4), { size: 18, fill: C.accent, gap: 22 });
  if (v.arrows?.guards) s += lines(482, 486, wrap(v.arrows.guards, 20, 3), { size: 17, weight: 500, gap: 21 });

  // Decision node: the question label(s); the overlay writes the answer below it.
  s += `<g transform="translate(${JEV.x} 450) rotate(45)">${box(-110, -110, 220, 220, { stroke: C.accent, fill: C.accentFill, rx: 20, glow: "glow" })}</g>`;
  const ql = wrap(qLabel, 15, 2);
  s += lines(JEV.x, ql.length > 1 ? 398 : 425, ql, { size: 23, weight: 700, fill: "#efe6f7", anchor: "middle", gap: 27 });
  s += text(JEV.x, 618, `Jev ${qTypes}`, { size: 18, fill: C.accent, anchor: "middle" });

  // Fork: what runs in code after the answer.
  s += lines(JEV.x + 100, 240, wrap(v.arrows?.output ?? "", 14, 3), { size: 18, fill: C.accent, gap: 22 });
  if (v.arrows?.output_detail) s += lines(JEV.x + 100, 316, wrap(v.arrows.output_detail, 15, 3), { size: 17, weight: 500, gap: 21 });

  (v.outcomes ?? []).forEach((o, i) => {
    const r = a.outcomes[i];
    const cy = r.y + r.h / 2;
    const guard = o.code_only;
    s += line(a.responses[i], { arrow: "arrow", dash: guard ? "6 10" : undefined, sw: 4 });
    s += text(FORK_X + 12, cy - 10, (o.stages ?? [])[0] ?? "", { size: 15, fill: guard ? C.dim : C.accent });
    s += box(r.x, r.y, r.w, r.h, guard ? { dash: "10 8" } : {});
    const condLines = r.h >= 120 ? 2 : 1;
    const label = o.id === ABSTAIN_ID ? "abstain" : o.id;
    s += text(r.x + 18, r.y + 28, label, { size: 21, fill: C.accent, weight: 700 });
    const when = (o.when ?? []).join(" or ") + (o.more ? ` (+${o.more})` : "");
    s += lines(r.x + 18, r.y + 52, wrap(`when ${when}`, 40, condLines), { size: 18, weight: 500, gap: 21 });
    const rest = Math.max(1, Math.floor((r.h - 52 - condLines * 20 - 6) / 24));
    s += lines(r.x + 18, r.y + 56 + condLines * 20 + 4, wrap(o.meaning, 36, Math.min(2, rest)), { size: 20, weight: 600, fill: "#efe6f7", gap: 23 });
  });
  return s;
}

/** Index of the outcome box the policy event names (abstained without an outcome -> the abstain box). */
export function outcomeIndex(visual, policy) {
  const outs = visual?.outcomes ?? [];
  if (!policy || policy.offline) return -1;
  const id = policy.outcome ?? (policy.status === "abstained" ? ABSTAIN_ID : null);
  const i = outs.findIndex((o) => o.id === id);
  if (i >= 0) return i;
  return policy.status === "abstained" ? outs.findIndex((o) => o.id === ABSTAIN_ID) : -1;
}
