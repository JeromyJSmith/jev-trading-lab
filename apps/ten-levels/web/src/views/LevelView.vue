<script setup lang="ts">
const base = import.meta.env.BASE_URL;
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { fetchLevel, type LevelPayload } from "../lib/api";
import { LEVELS, USE_CASES, USE_LABEL, splitUse } from "../lib/levels";
import { TRADING_CASES } from "../lib/trading";
import { reveal } from "../lib/store";
import { toggle as togglePick } from "../lib/strategy";
import LevelProgress from "../components/LevelProgress.vue";
import UseCaseCards from "../components/UseCaseCards.vue";
import type { Card } from "../lib/trading";
import LiveExample from "../components/LiveExample.vue";

const props = defineProps<{ n: number }>();

const meta = computed(() => LEVELS.find((l) => l.n === props.n)!);
const payload = ref<LevelPayload | null>(null);
const route = useRoute();
/** Workbench addition: ?option=B deep-links a use case, so an embedding page can pick it. */
const fromQuery = () => (typeof route.query.option === "string" ? route.query.option.toUpperCase() : "A");
const selected = ref(fromQuery());
const option = computed(() => payload.value?.options.find((o) => o.key === selected.value) ?? null);
const prev = computed(() => LEVELS.find((l) => l.n === props.n - 1));

/** Patch 0007: levels 1-10 show the trading scenarios; upstream's originals (OA, OB, OC) sit behind a toggle. */
const hasTrading = computed(() => !!TRADING_CASES[props.n]);
const showOriginals = ref(false);
const tradingCards = computed<Card[]>(() => (TRADING_CASES[props.n] ?? []).map((c) => ({
  key: c.key, name: c.name, blurb: c.blurb, catalog_id: c.catalog_id, tag: c.runs_in === "schema_call_agent_shape" ? "agent shape, 1 call" : undefined,
})));
const originalCards = computed<Card[]>(() => (USE_CASES[props.n] ?? []).map(([name, blurb], i) => ({
  key: hasTrading.value ? `O${String.fromCharCode(65 + i)}` : String.fromCharCode(65 + i), name, blurb, tag: hasTrading.value ? "original" : undefined,
})));
const agentNote = computed(() => props.n >= 6 && props.n <= 10 && option.value && !option.value.original);
function pick(c: Card) {
  const o = payload.value?.options.find((x) => x.catalog_id === c.catalog_id);
  togglePick({ catalog_id: c.catalog_id, name: c.name, thresholds: o?.thresholds, stage_hint: o?.stage_hint }, props.n);
}

watch(
  () => props.n,
  async (n) => {
    reveal(n);
    selected.value = fromQuery();
    showOriginals.value = selected.value.startsWith("O");
    payload.value = null;
    payload.value = await fetchLevel(n);
  },
  { immediate: true },
);
</script>

<template>
  <div class="wrap">
    <div class="pagehead">
      <div class="lvl">Level {{ n }}</div>
      <LevelProgress :n="n" />
      <h1>{{ meta.title }}</h1>
      <div class="sub">{{ splitUse(meta.sub)[0] }}<span class="use-label">{{ USE_LABEL }}</span>{{ splitUse(meta.sub)[1] }}</div>
    </div>
    <div class="hero"><img :src="`${base}heroes/level-${n}.svg`" :alt="meta.title" /></div>

    <template v-if="hasTrading">
      <div class="section-head"><h2>Trading Scenarios</h2><span class="meta">{{ tradingCards.length }} scenarios, NYSE/Nasdaq, paper only. Pick one to load it; tick to add it to a strategy</span>
        <label class="toggle orig-toggle" :class="{ on: showOriginals }">
          <input v-model="showOriginals" type="checkbox" />
          <span class="track"><span class="knob"></span></span>
          Original examples
        </label>
      </div>
      <UseCaseCards :cases="tradingCards" :selected="selected" @select="selected = $event" @pick="pick" />
      <template v-if="showOriginals">
        <div class="section-head"><h2>Original examples</h2><span class="meta">upstream's use cases, unchanged</span></div>
        <UseCaseCards :cases="originalCards" :selected="selected" @select="selected = $event" />
      </template>
    </template>
    <template v-else>
      <div class="section-head"><h2>Use Cases</h2><span class="meta">Pick one to load it below</span></div>
      <UseCaseCards :cases="originalCards" :selected="selected" @select="selected = $event" />
    </template>

    <div v-if="agentNote" class="agent-note">
      <b>Agent level, honest note:</b> upstream runs level {{ n }} inside a pi agent session (hooks, tools, compaction).
      This trading scenario is the typed Jev decision that the hook or tool makes, run here as one schema call
      (inputs, POST /build, Jev via TypeSafe or the mock, POST /policy). The pi session itself is not run for it;
      the original examples still run the real session.
    </div>

    <LiveExample v-if="option" :n="n" :option="option" :agent="option.agent ?? payload?.agent" />
    <div v-else class="meta">Loading the example ...</div>

    <div class="pagenav example-wrap">
      <RouterLink v-if="prev" :to="`/level/${prev.n}`">Previous level: {{ prev.title }}</RouterLink>
      <span v-else class="off">Previous level</span>
      <RouterLink to="/">Next Level</RouterLink>
    </div>
  </div>
</template>
