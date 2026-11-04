/**
 * Patch 0009: static demo mode (VITE_STATIC=1, e.g. GitHub Pages). No backend: level metadata, options, input schemas
 * and the per-set run streams are bundled JSON under <base>/data/ (written by the workbench's publish script).
 *
 * Run, per input set:
 *   recorded  a REAL Jev response recorded by the workbench (decisions/runs), sanitised; policy rows computed by the
 *             decisions service over those recorded answers at publish time
 *   mock      the upstream deterministic offline mock over the bundled set, with the decisions service's real state
 *             builder and policy rows computed at publish time (labelled: not a real Jev answer)
 *   edited    inputs that match no bundled set: the mock runs in the browser over the RAW inputs (the state builder and
 *             the policy engine are Python and are not in the demo; labelled)
 * PAPER ONLY. Nothing here talks to a broker, a model provider or any server.
 */
import { MockJev } from "./mock";

export const STATIC = import.meta.env.VITE_STATIC === "1";
export const dataUrl = (p: string) => `${import.meta.env.BASE_URL}data/${p}`;

export type StaticSet = {
  source: "recorded" | "mock" | "none";
  label: string;
  build?: any;
  stream?: { event: string; data: any }[];
};

const levels = new Map<number, any>();

export async function staticLevel(n: number): Promise<any> {
  if (!levels.has(n)) {
    const res = await fetch(dataUrl(`level-${n}.json`));
    if (!res.ok) throw new Error(`level ${n}: HTTP ${res.status} (static data)`);
    levels.set(n, await res.json());
  }
  return levels.get(n);
}

/** Key-order independent JSON, so an untouched set matches its bundled copy. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object).filter((k) => (v as any)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon((v as any)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

async function findSet(n: number, key: string, input: Record<string, unknown>) {
  const lvl = await staticLevel(n);
  const option = lvl.options.find((o: any) => o.key === key);
  if (!option) throw new Error(`unknown option ${key}`);
  const c = canon(input);
  const i = option.inputs.findIndex((s: unknown) => canon(s) === c);
  return { option, set: i >= 0 ? (option.static?.[i] as StaticSet | undefined) : undefined, index: i };
}

/** POST /build stand-in: the bundled build for an untouched set; required-field check only for edited inputs. */
export async function staticBuild(n: number, key: string, input: Record<string, unknown>) {
  const { option, set } = await findSet(n, key, input);
  if (set?.build) return set.build;
  const req: string[] = option.input_schema?.required ?? [];
  const errors = req.filter((f) => input[f] === undefined || input[f] === "").map((f) => ({ field: f, message: `'${f}' is a required property` }));
  return { errors, state: null, questions: null, precheck: null, static_edited: true };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mock = new MockJev();

export async function* staticRun(n: number, key: string, input: Record<string, unknown>) {
  const { option, set } = await findSet(n, key, input);
  if (set && set.stream && set.source !== "none") {
    yield { event: "static-note", data: { source: set.source, label: set.label } };
    for (const e of set.stream) { await sleep(120); yield e; }
    return;
  }
  // Edited inputs: the browser mock over the raw inputs, with the questions of the first bundled set.
  const ref = (option.static ?? []).find((s: StaticSet) => s.stream?.some((e) => e.event === "request"));
  const req = ref?.stream?.find((e: any) => e.event === "request")?.data;
  if (!req) {
    yield { event: "static-note", data: { source: "none", label: "Not runnable in the static demo (no bundled questions for this option)." } };
    yield { event: "option-error", data: { error: "static demo: this option needs the local lab server" } };
    return;
  }
  const schema = !!option.input_schema;
  yield { event: "static-note", data: { source: "edited", label: schema
    ? "Edited inputs: offline mock, not a real Jev answer. The mock reads your RAW inputs (the spec's state builder and the policy engine are Python and are not in this demo)."
    : "Edited inputs: offline mock, not a real Jev answer. Your edited input is sent as the state with the questions of this option's first set; the level's own post-processing is not run in the demo." } };
  const state = input;
  const questions = req.questions;
  await sleep(150);
  yield { event: "request", data: { kind: "request", provider: "mock", model: mock.model, state, questions } };
  const t0 = performance.now();
  const out = mock.systemOne({ state, questions });
  await sleep(150);
  yield { event: "response", data: { kind: "response", result: { ...out, meta: { provider: "mock", requestedModel: mock.model, resolvedModel: out.model,
    elapsedMs: Math.round(performance.now() - t0), attempts: 1, cost: { amount: 0, source: "mock" } } } } };
  const [id, a] = Object.entries(out.answers)[0] as [string, any];
  if (schema) {
    yield { event: "policy", data: { kind: "policy", offline: true, static_unavailable: true, decision: option.decision ?? option.key } };
    const pick = a.type === "noul" ? `${id} ${a.noul >= 0.5 ? "yes" : "no"}` : a.type === "choice" ? a.choice : `${id} ${a.score.toFixed(2)}`;
    const confidence = a.type === "noul" ? Math.max(a.noul, 1 - a.noul) : a.confidence;
    const floor = option.review_floor ?? 0.5;
    yield { event: "decision", data: { level: n, option: key, input, output: { pick, confidence, gate: confidence >= floor ? "proceed" : "human review",
      policy: "policy engine not available in demo" } } };
  } else {
    yield { event: "decision", data: { level: n, option: key, input, output: out.answers } };
  }
  yield { event: "level-done", data: { level: n } };
}

/* Strategy tray in the static demo: versions are kept in this browser (localStorage), never on a server. */
const SKEY = "jev10.static.strategies";
type Saved = Record<string, any[]>;
function readSaved(): Saved { try { return JSON.parse(localStorage.getItem(SKEY) || "{}"); } catch { return {}; } }

export function staticList() {
  return Object.entries(readSaved()).map(([name, vs]) => ({ name, versions: vs.map((d) => d.version) }));
}
export function staticSave(doc: any) {
  const all = readSaved();
  const prev = all[doc.name] ?? [];
  const version = prev.length ? Math.max(...prev.map((d) => d.version)) + 1 : 1;
  const full = { ...doc, version, created: new Date().toISOString(), parent_version: prev.length ? version - 1 : null, author: "jev-lab strategy tray (static demo)" };
  all[doc.name] = [...prev, full];
  try { localStorage.setItem(SKEY, JSON.stringify(all)); } catch { throw new Error("browser storage unavailable"); }
  return { name: doc.name, version, latest: `browser localStorage ${doc.name}`, path: "localStorage", stubs: [] as string[] };
}
export function staticGet(name: string) {
  const vs = readSaved()[name];
  if (!vs?.length) throw new Error(`no saved strategy ${name} in this browser`);
  return vs.reduce((a, b) => (b.version > a.version ? b : a));
}
