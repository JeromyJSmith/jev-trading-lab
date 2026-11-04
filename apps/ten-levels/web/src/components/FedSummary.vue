<script setup lang="ts">
import { computed } from "vue";
import { compact } from "../lib/trading-scene";

/**
 * Patch 0016: "What Jev was fed", shared by the run modal and the Results overlay. The input fields the spec's
 * `visual.fed` lists, then the questions: as sent (from the request body) when there is one, else the exported preview.
 */
const props = defineProps<{ visual: any; input: Record<string, unknown>; setName: string; sentQuestions?: Record<string, any> | null }>();
const fed = computed(() => {
  const v = props.visual;
  if (!v) return null;
  const fields = ((v.fed ?? []) as string[]).map((f) => ({ f, v: compact(props.input[f]) })).filter((x) => x.v !== "");
  const qs = props.sentQuestions
    ? Object.entries(props.sentQuestions).map(([id, q]: [string, any]) => ({ id, type: q.type, text: q.instructions, options: q.type === "noul" ? [] : Object.keys(q.criteria ?? {}) }))
    : ((v.questions ?? []) as any[]).map((q) => ({ id: q.id, type: q.type, text: q.text, options: q.type === "noul" ? [] : q.options }));
  return { fields, qs, sent: !!props.sentQuestions };
});
</script>

<template>
  <div v-if="fed" class="fed" data-testid="fed-panel" data-section="fed">
    <div class="fed-head"><b>What Jev was fed</b><span class="meta-inline">Set {{ setName }}</span></div>
    <div class="fed-fields">
      <span v-for="x in fed.fields" :key="x.f" class="fed-field"><b>{{ x.f }}</b> {{ x.v }}</span>
    </div>
    <div class="fed-head sub">{{ fed.sent ? "Questions sent" : "Questions (sent on Run)" }}</div>
    <div v-for="q in fed.qs" :key="q.id" class="fed-q">
      <b>{{ q.id }}</b> <span class="meta-inline">{{ q.type }}</span> {{ q.text }}<span v-if="q.options.length" class="fed-opts"> [{{ q.options.join(" / ") }}]</span>
    </div>
  </div>
</template>
