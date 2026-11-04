<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { OptionMeta } from "../lib/api";
import type { JevUsage } from "../lib/cost";
import ResultsBody from "./ResultsBody.vue";
import CostTable from "./CostTable.vue";
import CodeView from "./CodeView.vue";
import IoBlock from "./IoBlock.vue";
import FedSummary from "./FedSummary.vue";

/**
 * Patch 0016: everything the page shows for a run, inside the Results overlay, built from the SAME components the page
 * uses (ResultsBody, CostTable, IoBlock, CodeView) plus the run modal's FedSummary. One collapsible section per tab;
 * the sticky tab bar opens a section and scrolls to it. Answers and Cost start open (Policy too when no Jev call was made).
 */
const props = defineProps<{
  status: string; staticNote: { source: string; label: string } | null; answersHtml: string; policy: any; errorText: string; calls: number;
  sentHtml: string; receivedHtml: string; sentText: string; receivedText: string; usage: JevUsage | null; build: any;
  option: OptionMeta; input: Record<string, unknown>; setName: string; buildHtml: string;
}>();

type Tab = "answers" | "policy" | "cost" | "io" | "code" | "fed";
const visual = computed<any>(() => (props.option.original ? undefined : (props.option as any).visual));
const sentQuestions = computed(() => { try { return props.sentText ? JSON.parse(props.sentText).questions ?? null : null; } catch { return null; } });
const tabs = computed(() => ([
  { id: "answers", label: "Answers", on: true },
  { id: "policy", label: "Policy", on: !!props.policy },
  { id: "cost", label: "Cost", on: !!(props.usage && props.receivedText) },
  { id: "io", label: "Sent/Received", on: !!(props.sentHtml || props.receivedHtml || props.buildHtml) },
  { id: "code", label: "Code", on: true },
  { id: "fed", label: "Fed", on: !!visual.value },
] as { id: Tab; label: string; on: boolean }[]).filter((t) => t.on));
// Answers and Cost start open; a decided-in-code run (policy, no Jev answers, no cost) opens Policy too, it is the result.
const open = reactive<Record<Tab, boolean>>({ answers: true, policy: !!props.policy && !props.answersHtml, cost: true, io: false, code: false, fed: false });
const active = ref<Tab>("answers");
const root = ref<HTMLElement | null>(null);
function go(t: Tab) {
  open[t] = true;
  active.value = t;
  // Scroll the overlay's scroller so the section starts just under the sticky tab bar (which can wrap to two rows).
  requestAnimationFrame(() => {
    const sec = root.value?.querySelector<HTMLElement>(`[data-tab="${t}"]`);
    const scroller = root.value?.closest<HTMLElement>(".results-scroll");
    const bar = root.value?.querySelector<HTMLElement>(".results-tabs");
    if (!sec || !scroller) return;
    const top = sec.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: Math.max(0, top - (bar?.offsetHeight ?? 0) + 4) });
  });
}
const toggle = (t: Tab, e: Event) => { open[t] = (e.target as HTMLDetailsElement).open; };
defineExpose({ go, open });
</script>

<template>
  <div ref="root" class="results-sections">
    <div class="results-tabs" role="tablist" data-testid="results-tabs">
      <button v-for="t in tabs" :key="t.id" role="tab" class="ghost results-tab" :class="{ on: active === t.id }" :aria-selected="active === t.id"
        :data-testid="`tab-${t.id}`" @click="go(t.id)">{{ t.label }}</button>
    </div>

    <details class="results-sec" data-tab="answers" data-overlay-section="answers" :open="open.answers" @toggle="toggle('answers', $event)">
      <summary>Answers<span class="meta-inline">Outputs: {{ status }}</span></summary>
      <ResultsBody part="answers" :status="status" :static-note="staticNote" :answers-html="answersHtml" :policy="policy" :error-text="errorText" :calls="calls" />
    </details>

    <details v-if="policy" class="results-sec" data-tab="policy" data-overlay-section="policy" :open="open.policy" @toggle="toggle('policy', $event)">
      <summary>Policy<span class="meta-inline">{{ policy.status ?? "" }} {{ policy.outcome != null ? `outcome ${policy.outcome}` : "" }}{{ policy.rule ? ` by ${policy.rule}` : "" }}</span></summary>
      <ResultsBody part="policy" :status="status" :static-note="staticNote" :answers-html="answersHtml" :policy="policy" :error-text="errorText" :calls="calls" />
    </details>

    <details v-if="usage && receivedText" class="results-sec" data-tab="cost" data-overlay-section="cost" :open="open.cost" @toggle="toggle('cost', $event)">
      <summary>Cost<span class="meta-inline">this call priced per model, 1x to 1,000,000x</span></summary>
      <CostTable :sent="sentText" :received="receivedText" :usage="usage" />
    </details>

    <details v-if="sentHtml || receivedHtml || buildHtml" class="results-sec" data-tab="io" data-overlay-section="io" :open="open.io" @toggle="toggle('io', $event)">
      <summary>Sent/Received<span class="meta-inline">request and response bodies</span></summary>
      <IoBlock v-if="sentHtml" kind="sent" title="Sent" :calls="calls" :html="sentHtml"
        :note="`POST /decisions, the request body${build ? ' (state built by POST /build from the inputs)' : ''}`" />
      <IoBlock v-else-if="buildHtml" kind="sent" title="Sent" :calls="0" :html="buildHtml" note="Nothing sent to Jev: prechecks rejected the inputs. State POST /build built:" />
      <IoBlock v-if="receivedHtml" kind="received" title="Received" :calls="calls" :html="receivedHtml" note="The response body" />
    </details>

    <details class="results-sec" data-tab="code" data-overlay-section="code" :open="open.code" @toggle="toggle('code', $event)">
      <summary>Code<span class="meta-inline">{{ option.file }}</span></summary>
      <CodeView :file="option.file" :call="option.call" :code="option.code" :input="input" />
    </details>

    <details v-if="visual" class="results-sec" data-tab="fed" data-overlay-section="fed" :open="open.fed" @toggle="toggle('fed', $event)">
      <summary>Fed<span class="meta-inline">what Jev was fed, Set {{ setName }}</span></summary>
      <FedSummary :visual="visual" :input="input" :set-name="setName" :sent-questions="sentQuestions" />
    </details>
  </div>
</template>
