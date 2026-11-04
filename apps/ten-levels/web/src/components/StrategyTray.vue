<script setup lang="ts">
/**
 * Patch 0007: persistent Strategy tray. Lists the scenario ids picked across levels, with stage, order, enabled and
 * threshold overrides; name / save / load through /api/strategies (strategy.v1, decisions/strategies/SCHEMA.json).
 */
import { computed, onMounted, ref } from "vue";
import { COMBINES, SIGNALS, STAGES, draft, exportYaml, importText, listStrategies, loadStrategy, move, renumber, saveStrategy, trayOpen } from "../lib/strategy";
import { STATIC } from "../lib/static";
import { catalogLookup } from "../lib/trading";

const saved = ref<{ name: string; versions: number[] }[]>([]);
const pickLoad = ref("");
const msg = ref("");
const msgKind = ref<"" | "ok" | "bad">("");
const busy = ref(false);
const sorted = computed(() => [...draft.value.picks].sort((a, b) => STAGES.indexOf(a.stage as any) - STAGES.indexOf(b.stage as any) || a.order - b.order));

async function refresh() {
  try { saved.value = await listStrategies(); } catch (err) { saved.value = []; say(`list: ${(err as Error).message}`, "bad"); }
}
function say(text: string, kind: "" | "ok" | "bad" = "") { msg.value = text; msgKind.value = kind; }

async function save() {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(draft.value.name.trim())) return say("name: lowercase letters, digits and dashes", "bad");
  if (!draft.value.picks.length) return say("pick at least one scenario (Add to strategy on a card)", "bad");
  busy.value = true;
  try {
    const r = await saveStrategy(draft.value);
    draft.value.version = r.version;
    say(STATIC ? `saved ${r.name} v${r.version} in this browser (static demo: localStorage only)` : `saved ${r.name} v${r.version} -> decisions/strategies/${r.name}.yaml`, "ok");
    await refresh();
  } catch (err) { say(`not saved: ${(err as Error).message}`, "bad"); } finally { busy.value = false; }
}
async function load() {
  if (!pickLoad.value) return;
  busy.value = true;
  try { await loadStrategy(pickLoad.value, catalogLookup); say(`loaded ${draft.value.name} v${draft.value.version}`, "ok"); }
  catch (err) { say(`load: ${(err as Error).message}`, "bad"); } finally { busy.value = false; }
}
/** Patch 0009: download the strategy.v1 YAML; import a YAML/JSON file into the tray. */
const lastExport = ref("");
const fileEl = ref<HTMLInputElement | null>(null);
function exportFile() {
  try {
    const { filename, text } = exportYaml(draft.value);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/yaml" }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    lastExport.value = text;
    say(`exported ${filename}`, "ok");
  } catch (err) { say(`not exported: ${(err as Error).message}`, "bad"); }
}
async function importFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try { importText(await f.text(), catalogLookup); say(`imported ${draft.value.name}${draft.value.version ? ` v${draft.value.version}` : ""} from ${f.name}`, "ok"); }
  catch (err) { say(`not imported: ${(err as Error).message}`, "bad"); }
  finally { if (fileEl.value) fileEl.value.value = ""; }
}
function remove(id: string) { draft.value.picks = draft.value.picks.filter((p) => p.id !== id); renumber(); }
function clearAll() { draft.value = { ...draft.value, picks: [], version: undefined }; say(""); }
onMounted(refresh);
</script>

<template>
  <div class="tray" data-testid="strategy-tray">
    <div class="bar" @click="trayOpen = !trayOpen">
      <span>Strategy <b>{{ draft.name || "untitled" }}</b><span v-if="draft.version" class="meta-inline"> v{{ draft.version }}</span></span>
      <span class="pill">{{ draft.picks.length }} scenario{{ draft.picks.length === 1 ? "" : "s" }}</span>
      <span class="ids"><span v-for="p in sorted" :key="p.id" class="chip" :class="{ lit: p.enabled }">{{ p.id }}</span></span>
      <span class="meta-inline">paper only</span>
      <button class="ghost mini" @click.stop="trayOpen = !trayOpen">{{ trayOpen ? "Hide" : "Open" }}</button>
    </div>
    <div v-if="trayOpen" class="body">
      <div class="row">
        <label class="f">Name<input v-model="draft.name" type="text" placeholder="gap-and-go-guarded" /></label>
        <label class="f">Universe (NYSE/Nasdaq tickers)<input v-model="draft.universe" type="text" /></label>
        <label class="f">Signal<select v-model="draft.signal"><option v-for="s in SIGNALS" :key="s" :value="s">{{ s }}</option></select></label>
        <label class="f">Combine<select v-model="draft.combine"><option v-for="c in COMBINES" :key="c" :value="c">{{ c }}</option></select></label>
        <label class="f">Notes<input v-model="draft.notes" type="text" placeholder="Composed in the Jev lab. PAPER ONLY." /></label>
      </div>
      <table v-if="sorted.length">
        <thead><tr><th>On</th><th>Id</th><th>Scenario</th><th>Stage</th><th>Order</th><th>Threshold overrides</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in sorted" :key="p.id">
            <td><input v-model="p.enabled" type="checkbox" /></td>
            <td><RouterLink :to="`/level/${p.level}?option=${p.id.split('.')[1]}`">{{ p.id }}</RouterLink></td>
            <td>{{ p.title }}</td>
            <td><select v-model="p.stage" @change="renumber()"><option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option></select></td>
            <td>{{ p.order }} <button class="ghost mini" @click="move(p.id, -1)">up</button> <button class="ghost mini" @click="move(p.id, 1)">down</button></td>
            <td>
              <span v-for="(v, k) in p.defaults" :key="k" class="th" :class="{ changed: p.thresholds[k] !== v }">
                {{ k }} <input v-model.number="p.thresholds[k]" type="number" step="any" />
              </span>
              <span v-if="!Object.keys(p.defaults).length" class="meta-inline">none</span>
            </td>
            <td><button class="ghost mini" @click="remove(p.id)">remove</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="meta">No scenarios yet. Tick "Add to strategy" on any trading card in levels 1 to 10.</div>
      <div class="actions">
        <button class="run mini" :disabled="busy" @click="save">Save</button>
        <select v-model="pickLoad"><option value="">Load a saved strategy ...</option>
          <option v-for="s in saved" :key="s.name" :value="s.name">{{ s.name }} (v{{ s.versions.length ? Math.max(...s.versions) : 1 }})</option></select>
        <button class="ghost mini" :disabled="busy || !pickLoad" @click="load">Load</button>
        <button class="ghost mini" @click="clearAll">Clear</button>
        <button class="ghost mini" data-testid="export-yaml" @click="exportFile">Export YAML</button>
        <button class="ghost mini" @click="fileEl?.click()">Import</button>
        <input ref="fileEl" type="file" accept=".yaml,.yml,.json" hidden @change="importFile" />
        <span class="msg" :class="msgKind">{{ msg }}</span>
      </div>
      <pre v-if="lastExport" class="code" data-testid="export-preview">{{ lastExport }}</pre>
    </div>
  </div>
</template>
