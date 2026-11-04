/**
 * Patch 0007: the Strategy tray. Scenarios picked across levels (catalog ids L<n>.<letter>) are kept in the browser until
 * saved; Save posts a strategy.v1 document (decisions/strategies/SCHEMA.json) to /api/strategies, which the decisions
 * service writes as decisions/strategies/<name>.yaml plus an immutable versions/<name>@<v>.yaml. PAPER ONLY.
 */
import { ref, watch } from "vue";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { STATIC, staticGet, staticList, staticSave } from "./static";

export const STAGES = ["pre_signal", "signal_filter", "sizing_guard", "position_monitor", "post_trade"] as const;
export const SIGNALS = ["gap", "ema_cross", "rsi_dip", "breakout"] as const;
export const COMBINES = ["any_veto", "all_must_pass", "weighted"] as const;

export interface Pick {
  id: string; level: number; title: string; stage: string; order: number; enabled: boolean;
  /** Catalog defaults; only values that differ are saved as overrides. */
  defaults: Record<string, number>;
  thresholds: Record<string, number>;
  note?: string;
}

export interface Draft {
  name: string; universe: string; signal: string; combine: string; notes: string; picks: Pick[];
  /** Last saved/loaded version, for display. */
  version?: number;
}

const KEY = "jev10.strategy";
const empty = (): Draft => ({ name: "", universe: "AAPL, NVDA", signal: "gap", combine: "any_veto", notes: "", picks: [] });

function load(): Draft {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return empty(); }
}

export const draft = ref<Draft>(load());
watch(draft, (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ } }, { deep: true });
export const trayOpen = ref(false);

export const isPicked = (id: string) => draft.value.picks.some((p) => p.id === id);

export function toggle(o: { catalog_id?: string; name: string; thresholds?: Record<string, number>; stage_hint?: string }, level: number) {
  if (!o.catalog_id) return;
  const picks = draft.value.picks;
  const i = picks.findIndex((p) => p.id === o.catalog_id);
  if (i >= 0) { picks.splice(i, 1); return; }
  const stage = o.stage_hint ?? "signal_filter";
  const order = picks.filter((p) => p.stage === stage).length;
  picks.push({ id: o.catalog_id, level, title: o.name, stage, order, enabled: true,
               defaults: { ...(o.thresholds ?? {}) }, thresholds: { ...(o.thresholds ?? {}) } });
}

/** Move a pick up or down within its stage; orders are renumbered 0..n per stage. */
export function move(id: string, dir: -1 | 1) {
  const picks = draft.value.picks;
  const p = picks.find((x) => x.id === id);
  if (!p) return;
  const same = picks.filter((x) => x.stage === p.stage).sort((a, b) => a.order - b.order);
  const i = same.indexOf(p), j = i + dir;
  if (j < 0 || j >= same.length) return;
  [same[i], same[j]] = [same[j], same[i]];
  same.forEach((x, k) => (x.order = k));
}

export function renumber() {
  for (const s of STAGES) draft.value.picks.filter((p) => p.stage === s).sort((a, b) => a.order - b.order).forEach((p, k) => (p.order = k));
}

/** The strategy.v1 document the tray saves. */
export function toDoc(d: Draft) {
  const universe = d.universe.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  return {
    schema_version: "strategy.v1", name: d.name.trim(), universe: [...new Set(universe)],
    signal: { strategy: d.signal, timeframe: "1d" },
    scenarios: d.picks.map((p) => {
      const over = Object.fromEntries(Object.entries(p.thresholds).filter(([k, v]) => typeof v === "number" && !Number.isNaN(v) && v !== p.defaults[k]));
      return { id: p.id, order: p.order, enabled: p.enabled, stage: p.stage, ...(Object.keys(over).length ? { thresholds: over } : {}),
               ...(p.note ? { note: p.note } : {}) };
    }),
    combine: d.combine,
    notes: d.notes || "Composed in the Jev lab Strategy tray. PAPER ONLY.",
  };
}

export async function listStrategies(): Promise<{ name: string; versions: number[] }[]> {
  if (STATIC) return staticList();
  const res = await fetch("/api/strategies");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body.strategies;
}

export async function saveStrategy(d: Draft): Promise<{ name: string; version: number; latest: string; path: string; stubs: string[] }> {
  if (STATIC) return staticSave(toDoc(d));
  const res = await fetch("/api/strategies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc: toDoc(d) }) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.problems ? body.problems.join("; ") : body.error || `HTTP ${res.status}`);
  return body;
}

/** Load a saved strategy into the tray. Titles and threshold defaults come from the catalog lookup the caller passes. */
export async function loadStrategy(name: string, lookup: (id: string) => { level: number; title: string; thresholds: Record<string, number> } | undefined) {
  let doc: any;
  if (STATIC) doc = staticGet(name);
  else {
    const res = await fetch(`/api/strategies/${encodeURIComponent(name)}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    doc = body.doc;
  }
  applyDoc(doc, lookup);
}

type Lookup = (id: string) => { level: number; title: string; thresholds: Record<string, number> } | undefined;

/** A strategy.v1 document into the tray (load and, patch 0009, import). */
export function applyDoc(doc: any, lookup: Lookup) {
  draft.value = {
    name: doc.name, universe: (doc.universe ?? []).join(", "), signal: doc.signal?.strategy ?? "gap", combine: doc.combine ?? "any_veto",
    notes: doc.notes ?? "", version: doc.version,
    picks: (doc.scenarios ?? []).map((s: any) => {
      const c = lookup(s.id);
      const defaults = { ...(c?.thresholds ?? {}) };
      return { id: s.id, level: c?.level ?? Number(String(s.id).slice(1).split(".")[0]), title: c?.title ?? "(not in catalog)", stage: s.stage,
               order: s.order, enabled: s.enabled, defaults, thresholds: { ...defaults, ...(s.thresholds ?? {}) }, note: s.note };
    }),
  };
}

/**
 * Patch 0009: Export / Import. Export writes the full strategy.v1 document (decisions/strategies/SCHEMA.json: version,
 * created and author included) as YAML; Import reads YAML or JSON, checks the schema's required fields and patterns, and
 * loads it into the tray. PAPER ONLY.
 */
export function exportYaml(d: Draft): { filename: string; text: string } {
  const base = toDoc(d);
  const doc = { schema_version: base.schema_version, name: base.name, version: d.version ?? 1, created: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
                parent_version: null, author: STATIC ? "jev-lab strategy tray (static demo export)" : "jev-lab strategy tray (export)",
                universe: base.universe, signal: base.signal, scenarios: base.scenarios, combine: base.combine, notes: base.notes };
  const problems = checkDoc(doc);
  if (problems.length) throw new Error(problems.join("; "));
  return { filename: `${doc.name}@${doc.version}.yaml`, text: `# strategy.v1 (decisions/strategies/SCHEMA.json). PAPER ONLY, not trading advice.\n${toYaml(doc)}` };
}

export function checkDoc(doc: any): string[] {
  const p: string[] = [];
  if (!doc || typeof doc !== "object") return ["not a mapping"];
  if (doc.schema_version !== "strategy.v1") p.push("schema_version must be strategy.v1");
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(String(doc.name ?? ""))) p.push("name: lowercase letters, digits and dashes");
  if (!Array.isArray(doc.universe) || !doc.universe.length || !doc.universe.every((s: any) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(String(s)))) p.push("universe: upper-case tickers");
  if (!doc.signal || (!doc.signal.strategy && !(doc.signal.dataset && doc.signal.timeframe))) p.push("signal: strategy or dataset + timeframe");
  if (doc.signal?.strategy && !(SIGNALS as readonly string[]).includes(doc.signal.strategy)) p.push(`signal.strategy: one of ${SIGNALS.join(", ")}`);
  if (!(COMBINES as readonly string[]).includes(doc.combine)) p.push(`combine: one of ${COMBINES.join(", ")}`);
  if (!Array.isArray(doc.scenarios)) p.push("scenarios must be a list");
  else doc.scenarios.forEach((s: any, i: number) => {
    if (!/^L([1-9]|10)\.[A-Z]$/.test(String(s?.id))) p.push(`scenarios[${i}].id: catalog id like L4.B`);
    if (!(STAGES as readonly string[]).includes(s?.stage)) p.push(`scenarios[${i}].stage: one of ${STAGES.join(", ")}`);
    if (!Number.isInteger(s?.order) || s.order < 0) p.push(`scenarios[${i}].order: integer >= 0`);
    if (typeof s?.enabled !== "boolean") p.push(`scenarios[${i}].enabled: boolean`);
  });
  return p;
}

export function importText(text: string, lookup: Lookup) {
  let doc: any;
  try { doc = parseYaml(text); } catch (err) { throw new Error(`not YAML/JSON: ${(err as Error).message}`); }
  const problems = checkDoc(doc);
  if (problems.length) throw new Error(problems.join("; "));
  applyDoc(doc, lookup);
}
