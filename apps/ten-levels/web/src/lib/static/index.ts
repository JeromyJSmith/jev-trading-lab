/**
 * Patch 0009 / 0013: static demo mode (VITE_STATIC=1, e.g. GitHub Pages). No backend: level metadata, options, input
 * schemas and the per-set run streams are bundled JSON under <base>/data/ (written by the workbench's publish script).
 * Every bundled set is REAL market data (unlabelled; news text reduced to the publishable excerpt).
 *
 * Run, per input set:
 *   recorded  a REAL Jev response recorded live by the workbench (decisions/runs), sanitised; policy rows computed by
 *             the decisions service over those recorded answers at publish time
 *   local     anything else (edited inputs, a set without a recording, agent sessions): "Run locally for a live Jev
 *             answer". No result is fabricated; there is no offline answer path in this build.
 * PAPER ONLY. Nothing here talks to a broker, a model provider or any server.
 */
export const STATIC = import.meta.env.VITE_STATIC === "1";
export const dataUrl = (p: string) => `${import.meta.env.BASE_URL}data/${p}`;

export type StaticSet = {
  source: "recorded" | "none";
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
export const RUN_LOCALLY = "Run locally for a live Jev answer";

export async function* staticRun(n: number, key: string, input: Record<string, unknown>) {
  const { set, index } = await findSet(n, key, input);
  if (set && set.stream && set.source === "recorded") {
    yield { event: "static-note", data: { source: "recorded", label: set.label } };
    for (const e of set.stream) { await sleep(120); yield e; }
    return;
  }
  const why = index < 0
    ? "these inputs were edited, so no recorded answer exists for them"
    : (set?.label || "no recorded live answer is bundled for this set");
  yield { event: "static-note", data: { source: "local", label: `${RUN_LOCALLY}: ${why}. This static site makes no model call and shows no result.` } };
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
