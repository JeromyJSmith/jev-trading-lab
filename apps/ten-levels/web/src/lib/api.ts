/** Typed client for the node server: level metadata and the SSE run stream. Patch 0009: VITE_STATIC=1 reads bundled JSON instead. */
import { STATIC, staticBuild, staticLevel, staticRun } from "./static";

export interface OptionMeta {
  /** A, B, ... (levels 1-10: trading scenarios; OA, OB, OC: upstream's originals, patch 0007). */
  key: string;
  name: string;
  file: string;
  /** Example states, Set A onward. */
  inputs: Record<string, unknown>[];
  call: string;
  code: string;
  /** Agent levels only: the extension file and tool allowlist the session loads. */
  extension?: string;
  tools?: string[];
  /** Workbench levels 11-12 (patch 0004): the spec's input JSON Schema; the form renders one field per schema field. */
  input_schema?: Record<string, any>;
  /** Patch 0007: per-option session flag and the jev-levels-trading catalog fields. */
  agent?: boolean; original?: boolean; trading?: boolean; catalog_id?: string; blurb?: string;
  thresholds?: Record<string, number>; stage_hint?: string; runs_in?: string; cost_class?: string; jev_calls?: string;
  outputs?: { outcome: string; meaning: string }[];
  /** Patch 0011: run-modal labels (fed fields, questions, outcome boxes, arrow labels), exported from the spec YAML. */
  visual?: Record<string, any>;
  /** Patch 0013: one card per real example set (parallel to inputs), and the needs-your-data state (no sets). */
  sets?: RealSetMeta[];
  data_status?: "needs_your_data";
  data_reason?: string;
  /** Patch 0017: which outcome boxes the selected sets cover (recorded live outcomes, from the coverage reports). */
  coverage?: { source: string; boxes: { id: string; count: number; unreachable?: string }[] };
}

export interface RealSetMeta {
  set_id: string;
  label_status: string;
  derivation?: string;
  point_in_time_cutoff?: string;
  provenance: { source: string; url?: string; published_at?: string; licence?: string }[];
  excerpt_policy?: string;
  reason?: string;
  /** Patch 0017: how the set was assembled from real records, and the code guard it exercises (venue / future_data). */
  construction?: string;
  guard_case?: string;
}

export interface LevelPayload {
  n: number;
  /** Levels 6 to 10 run a pi session instead of a one shot call. */
  agent?: boolean;
  options: OptionMeta[];
}

export async function fetchLevel(n: number): Promise<LevelPayload> {
  if (STATIC) return staticLevel(n);
  const res = await fetch(`/api/level/${n}`);
  if (!res.ok) throw new Error(`level ${n}: HTTP ${res.status}`);
  return res.json();
}

/** Workbench (patch 0004): validate the inputs and build the state via the decisions service. No Jev call. */
export async function buildInputs(n: number, option: string, input: Record<string, unknown>): Promise<any> {
  if (STATIC) return staticBuild(n, option, input);
  const res = await fetch(`/api/build/${n}?option=${option}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export type StreamEvent = { event: string; data: any };

/** POST the edited input and yield every SSE event as it arrives. */
export async function* runOption(
  n: number,
  option: string,
  input: Record<string, unknown>,
): AsyncGenerator<StreamEvent> {
  if (STATIC) { yield* staticRun(n, option, input); return; }
  const res = await fetch(`/api/run/${n}?option=${option}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok || !res.body) throw new Error(`run: HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const ev = chunk.match(/^event: (.+)$/m);
      const data = chunk.match(/^data: (.+)$/m);
      if (ev && data) yield { event: ev[1], data: JSON.parse(data[1]) };
    }
  }
}
