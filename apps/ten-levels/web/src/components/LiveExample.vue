<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { live } from "../lib/live";
import type { OptionMeta } from "../lib/api";
import { buildInputs, runOption } from "../lib/api";
import { highlightTs } from "../lib/highlight";
import { answerHTML, esc } from "../lib/viz";
import InputEditor from "./InputEditor.vue";
import SchemaForm from "./SchemaForm.vue";
import CodeView from "./CodeView.vue";
import CostTable from "./CostTable.vue";
import RunVisual from "./RunVisual.vue";
import ResultsBody from "./ResultsBody.vue";
import ResultsOverlay from "./ResultsOverlay.vue";
import ResultsSections from "./ResultsSections.vue";
import IoBlock from "./IoBlock.vue";
import AgentChat from "./AgentChat.vue";
import { visual } from "../lib/store";
import type { StreamEvent } from "../lib/api";
import { LEVELS } from "../lib/levels";
import type { JevUsage } from "../lib/cost";
import { STATIC } from "../lib/static";

/** Patch 0009/0013: in the static demo every run says where its answer came from (recorded live, or run locally). */
const staticNote = ref<{ source: string; label: string } | null>(null);
const runLabel = STATIC ? "Run" : "Run live";
/** Patch 0013: no real example set for this scenario (private data); the card stays, Run is disabled. */
const needsData = computed(() => props.option.data_status === "needs_your_data" && !props.option.inputs.length);
const setMeta = computed(() => props.option.sets?.[setIndex.value]);
const SOURCE_NAME: Record<string, string> = { sec_edgar: "SEC EDGAR", news_store: "news", prices: "5m bars", derived: "derived" };
const links = computed(() => (setMeta.value?.provenance ?? []).filter((p) => p.url).slice(0, 4));

const props = defineProps<{ n: number; option: OptionMeta; agent?: boolean }>();

/* Agent levels: the input set holds the prompt, the suggested follow up, and the extension config. */
const PROMPT_KEYS = new Set(["prompt", "then"]);
const agentConfig = computed(() => Object.fromEntries(Object.entries(input.value).filter(([k]) => !PROMPT_KEYS.has(k))));
const agentPrompt = computed(() => String(input.value.prompt ?? ""));
const agentThen = computed(() => (typeof input.value.then === "string" ? input.value.then : undefined));
const chat = ref<InstanceType<typeof AgentChat> | null>(null);
/** The editor shows only the config; the prompt lives in the chat box. */
const configModel = computed({
  get: () => agentConfig.value,
  set: (v: Record<string, unknown>) => { input.value = { ...input.value, ...v }; },
});

const input = ref<Record<string, unknown>>({});
const setIndex = ref(0);
const setNames = computed(() => props.option.inputs.map((_, i) => `Set ${props.option.key}${i + 1}`));

function loadSet(i: number) {
  setIndex.value = i;
  input.value = JSON.parse(JSON.stringify(props.option.inputs[i] ?? {}));
  resetOutputs();
}
const running = ref(false);
const status = ref("Waiting for Run live");
const sentHtml = ref("");
const receivedHtml = ref("");
const sentText = ref("");
const receivedText = ref("");
const usage = ref<JevUsage | null>(null);

/* Visual mode: the modal replays the stream on the hero while the results fill in underneath. */
const visualOpen = ref(false);
const visualEvents = ref<StreamEvent[]>([]);
const visualDone = ref(false);
const levelTitle = LEVELS.find((l) => l.n === props.n)?.title ?? "";
const answersHtml = ref("");
let lastAnswers: Record<string, any> = {};

/** Answers with the returned chips leading the first one. Re-rendered when the decision arrives. */
function renderAnswers() {
  // One field returned: the value alone. Several: key and value, so they stay readable.
  const solo = result.value.length === 1;
  const chips = result.value.map((r) => `<span class="chip lit">${solo ? "" : `<b>${esc(r.key)}</b> `}${esc(r.value)}</span>`).join("");
  answersHtml.value = Object.entries(lastAnswers).map(([id, a], i) => answerHTML(id, a, i === 0 ? chips : "")).join("");
}
const result = ref<{ key: string; value: string }[]>([]);
const errorText = ref("");
/** Workbench addition (levels 11-12): the decisions service policy, one gate row per step. */
const policy = ref<any>(null);
/** Patch 0004: schema options edit raw inputs; the decisions service builds the state (POST /build). */
const build = ref<any>(null);
const schemaErrors = ref<{ field: string; message: string }[]>([]);
let checkTimer: ReturnType<typeof setTimeout> | undefined;
async function checkInputs() {
  if (!props.option.input_schema) return;
  try {
    const b = await buildInputs(props.n, props.option.key, input.value);
    schemaErrors.value = b.errors ?? [];
  } catch (err) {
    schemaErrors.value = [{ field: "", message: (err as Error).message }];
  }
}
watch(input, () => { clearTimeout(checkTimer); checkTimer = setTimeout(checkInputs, 250); }, { deep: true });
/** Patch 0015: the floating Results panel (View Results in the run modal, Results in the nav bar). */
const resultsOpen = ref(false);
const hasResults = computed(() => !!(answersHtml.value || policy.value || errorText.value || staticNote.value || (build.value && build.value.state)));
const calls = ref(0);
/** Patch 0016: the state POST /build built, highlighted, for the Sent block when no Jev call was made. */
const buildHtml = computed(() => (build.value && build.value.state ? highlightTs(JSON.stringify(build.value.state, null, 2), "json") : ""));

function resetOutputs() {
  status.value = "Waiting for Run live";
  sentHtml.value = "";
  receivedHtml.value = "";
  sentText.value = "";
  receivedText.value = "";
  usage.value = null;
  answersHtml.value = "";
  result.value = [];
  lastAnswers = {};
  errorText.value = "";
  calls.value = 0;
  policy.value = null;
  build.value = null;
  staticNote.value = null;
  resultsOpen.value = false;
}

watch(
  () => props.option,
  () => {
    loadSet(0);
    // Patch 0014: a scenario card click loads and runs its first set.
    if (live.autorun) { live.autorun = false; if (!props.agent && !needsData.value) void run(); }
  },
  { immediate: true },
);

/** Patch 0014: Run, Reset and the set pills live in the nav bar; this registers the controls while mounted. */
const controls = reactive({
  key: computed(() => props.option.key),
  sets: computed(() => props.option.inputs.map((_, i) => `${props.option.key}${i + 1}`)),
  setIndex,
  running,
  disabled: needsData,
  agent: computed(() => !!props.agent),
  runLabel,
  run: () => { if (!running.value && !needsData.value && !props.agent) void run(); },
  reset: () => { if (!running.value) resetExample(); },
  hasResults,
  resultsOpen,
  toggleResults: () => { resultsOpen.value = !resultsOpen.value && hasResults.value; },
  selectSet: (i: number) => { if (running.value) return; loadSet(i); if (!props.agent && !needsData.value) void run(); },
});
live.controls = controls;
onBeforeUnmount(() => { if (live.controls === controls) live.controls = null; });

function resetExample() {
  loadSet(setIndex.value);
}

/**
 * The returned value as key and value chips. Objects by key, arrays by index, scalars as one chip.
 * Booleans read yes or no. Keys the bars already show (noul, confidence) are left out.
 */
const SHOWN_ON_BARS = new Set(["noul", "confidence"]);
function toChips(output: unknown): { key: string; value: string }[] {
  const show = (v: unknown) => (typeof v === "boolean" ? (v ? "yes" : "no") : typeof v === "string" ? v : JSON.stringify(v));
  if (Array.isArray(output)) return output.map((v, i) => ({ key: String(i), value: show(v) }));
  if (output && typeof output === "object") {
    return Object.entries(output)
      .filter(([k]) => !SHOWN_ON_BARS.has(k))
      .map(([k, v]) => ({ key: k, value: show(v) }));
  }
  return [{ key: "result", value: show(output) }];
}

/** Cmd+Enter (Ctrl+Enter elsewhere) runs the example, even with the cursor in the input editor. */
function hotkey(e: KeyboardEvent) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !running.value && !needsData.value && !props.agent) {
    e.preventDefault();
    run();
  }
}
onMounted(() => window.addEventListener("keydown", hotkey));
onBeforeUnmount(() => window.removeEventListener("keydown", hotkey));

async function run() {
  running.value = true;
  resetOutputs();
  status.value = "Running live ...";
  visualEvents.value = [];
  visualDone.value = false;
  visualOpen.value = visual.value && !props.agent;
  let ms = 0;
  let model = "";
  try {
    for await (const { event, data } of runOption(props.n, props.option.key, input.value)) {
      if (visualOpen.value) visualEvents.value.push({ event, data });
      if (event === "request") {
        calls.value++;
        // The exact request body, as POSTed to the decision endpoint.
        sentText.value = JSON.stringify({ model: data.model, state: data.state, questions: data.questions }, null, 2);
        sentHtml.value = highlightTs(sentText.value, "json");
        status.value = `Request ${calls.value} to ${data.model} ...`;
      } else if (event === "response") {
        ms += data.result.meta.elapsedMs;
        model = data.result.model;
        const { answers } = data.result;
        usage.value = data.result.usage;
        lastAnswers = answers;
        renderAnswers();
        // The exact response body, as returned by the decision endpoint.
        receivedText.value = JSON.stringify({ model, answers, usage: data.result.usage }, null, 2);
        receivedHtml.value = highlightTs(receivedText.value, "json");
        status.value = `${calls.value} call${calls.value === 1 ? "" : "s"}, ${ms} ms, ${model}`;
      } else if (event === "decision") {
        result.value = toChips(data.output);
        renderAnswers();
      } else if (event === "build") {
        build.value = data;
        schemaErrors.value = data.errors ?? [];
      } else if (event === "policy") {
        policy.value = data;
      } else if (event === "static-note") {
        staticNote.value = data;
        if (data.source !== "recorded") { visualOpen.value = false; status.value = "Run locally for a live Jev answer"; }
      } else if (event === "option-error") {
        errorText.value = data.error;
        status.value = "Error";
      }
    }
  } catch (err) {
    errorText.value = (err as Error).message;
    status.value = "Error";
  } finally {
    running.value = false;
    visualDone.value = true;
    if (status.value === "Running live ...") status.value = "Done";
  }
}
</script>

<template>
  <div class="example-wrap">
    <RunVisual
      v-if="visualOpen"
      :n="n"
      :title="levelTitle"
      :option="option.key"
      :meta="option"
      :input="input"
      :set-name="`${option.key}${setIndex + 1}`"
      :events="visualEvents"
      :finished="visualDone"
      @close="visualOpen = false"
      @results="resultsOpen = true"
    />
    <ResultsOverlay v-if="resultsOpen && hasResults && !agent" :title="`Set ${option.key}${setIndex + 1} · ${option.catalog_id ?? ''} ${option.name}`" @close="resultsOpen = false">
      <ResultsSections :status="status" :static-note="staticNote" :answers-html="answersHtml" :policy="policy" :error-text="errorText" :calls="calls"
        :sent-html="sentHtml" :received-html="receivedHtml" :sent-text="sentText" :received-text="receivedText" :usage="usage" :build="build"
        :build-html="buildHtml" :option="option" :input="input" :set-name="`${option.key}${setIndex + 1}`" />
    </ResultsOverlay>
    <div class="section-head live-head" data-testid="live-example-head">
      <h2>Live Example</h2>
      <span class="meta">Option {{ option.key }}, {{ option.name }}</span>
      <span class="spacer"></span>
      <button v-if="agent" class="ghost" @click="loadSet(setIndex); chat?.restart()">New session</button>
      <span v-else class="meta">Run and Reset are in the top bar</span>
    </div>

    <div v-if="agent" class="example agent">
      <section class="glass">
        <h3>Inputs</h3>
        <div class="meta">A prompt set and the extension config</div>
        <h4>Input Examples</h4>
        <div class="sets">
          <button v-for="(name, i) in setNames" :key="name" class="set" :class="{ selected: i === setIndex }" @click="loadSet(i)">{{ name }}</button>
        </div>
        <InputEditor v-model="configModel" />
        <div class="meta">Changes apply to the next session. Use New session after editing.</div>
      </section>

      <section class="glass chat-panel">
        <h3>Agent</h3>
        <div class="meta">A real pi session in the sandbox repo. One line per thing that happens.</div>
        <div v-if="STATIC" class="lane" data-testid="agent-static"><span class="pill warn">run locally</span><span>Run locally for a live Jev answer: agent sessions (a pi coding agent in a sandbox repo, levels 6 to 10 originals) are not run on this static site. No session, no model call, no result shown.</span></div>
        <AgentChat v-else ref="chat" :key="option.key" :n="n" :option="option.key" :config="agentConfig" :prompt="agentPrompt" :then="agentThen" />
      </section>

      <CodeView :file="option.file" :call="option.call" :code="option.code" :input="input" />
    </div>

    <div v-else-if="needsData" class="example">
      <section class="glass" data-testid="needs-your-data">
        <h3>Inputs</h3>
        <h4>Input Examples</h4>
        <div class="lane"><span class="pill warn">needs your data</span><span>needs your data: {{ (option.data_reason ?? "no public real source").replace(/^needs your data:\s*/, "") }}</span></div>
        <div class="meta">No public real example set exists for this scenario, so nothing is bundled and Run is disabled. Supply your own real records (decisions/decisions/realdata/CONTRACT.md) and run the lab locally.</div>
      </section>
      <CodeView :file="option.file" :call="option.call" :code="option.code" :input="input" />
    </div>

    <div v-else class="example">
      <section class="glass">
        <h3>Inputs</h3>
        <div class="meta">{{ option.input_schema ? "Edit the inputs; the decisions service builds the state from them" : "Edit the state the code receives" }}</div>
        <h4>Input Examples</h4>
        <div v-if="option.coverage" class="outcomes-strip" data-testid="outcomes-strip">
          <span class="meta-inline">Outcomes covered</span>
          <span v-for="b in option.coverage.boxes" :key="b.id" class="pill" :class="{ off: !!b.unreachable || !b.count }"
            :title="b.unreachable ? `unreachable: ${b.unreachable}` : `${b.count} example set(s) whose recorded live outcome is ${b.id}`"
            :data-outcome="b.id">{{ b.id.replace(/_/g, " ") }} {{ b.count }}</span>
        </div>
        <div class="sets">
          <button
            v-for="(name, i) in setNames"
            :key="name"
            class="set"
            :class="{ selected: i === setIndex }"
            :disabled="running"
            @click="controls.selectSet(i)"
          >{{ name }}</button>
        </div>
        <div v-if="setMeta" class="set-card" data-testid="set-card">
          <span class="pill">{{ setMeta.set_id }}</span>
          <span class="pill warn" data-testid="unlabelled">{{ setMeta.label_status }}</span>
          <span v-if="setMeta.derivation && setMeta.derivation !== 'real'" class="pill">{{ setMeta.derivation.replace(/_/g, " ") }}</span>
          <span class="meta-inline">real market data<template v-if="setMeta.point_in_time_cutoff">, cutoff {{ setMeta.point_in_time_cutoff }}</template></span>
          <span v-for="(p, j) in links" :key="j"><a :href="p.url" target="_blank" rel="noopener" data-testid="provenance">{{ SOURCE_NAME[p.source] ?? p.source }}{{ p.published_at ? ` ${p.published_at.slice(0, 10)}` : "" }}</a></span>
          <span v-if="!links.length" class="meta-inline">{{ (setMeta.provenance[0]?.source && SOURCE_NAME[setMeta.provenance[0].source]) || "computed" }}, no public link</span>
          <div v-if="setMeta.construction" class="meta construction" data-testid="construction">{{ setMeta.construction }}<template v-if="setMeta.guard_case"> (guard case: {{ setMeta.guard_case.replace(/_/g, " ") }}, decided by code, no Jev call)</template></div>
          <div v-if="STATIC && setMeta.excerpt_policy && setMeta.excerpt_policy.startsWith('news')" class="meta">News text shown as headline + link + an excerpt of at most 200 chars (publishing policy); the live run used the full item.</div>
        </div>
        <SchemaForm v-if="option.input_schema" :key="option.key + setIndex" v-model="input" :schema="option.input_schema" :errors="schemaErrors" />
        <InputEditor v-else v-model="input" />
        <IoBlock v-if="sentHtml" kind="sent" title="Sent" :calls="calls" :html="sentHtml"
          :note="`POST /decisions, the request body${build ? ' (state built by POST /build from the inputs)' : ''}`" />
        <IoBlock v-else-if="buildHtml" kind="sent" title="Sent" :calls="0" :html="buildHtml" note="Nothing sent to Jev: prechecks rejected the inputs. State POST /build built:" />
      </section>

      <section class="glass">
        <h3>Outputs</h3>
        <ResultsBody :status="status" :static-note="staticNote" :answers-html="answersHtml" :policy="policy" :error-text="errorText" :calls="calls" />
        <IoBlock v-if="receivedHtml" kind="received" title="Received" :calls="calls" :html="receivedHtml" note="The response body" />
      </section>

      <CostTable v-if="usage && receivedText" :sent="sentText" :received="receivedText" :usage="usage" />

      <CodeView :file="option.file" :call="option.call" :code="option.code" :input="input" />
    </div>
  </div>
</template>
