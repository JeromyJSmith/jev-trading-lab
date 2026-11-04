<script setup lang="ts">
/**
 * Patch 0015/0016: the Outputs content, shared by the page's Outputs section and the floating Results overlay.
 * `part` renders one half: "answers" (the Outputs header with calls, ms and model, the recorded/live/decided-in-code
 * badge, the answers with every option's bar, errors) or "policy" (every gate row and the outcome/status/rule).
 * Without `part` both render, as on the page. Each block carries data-section for the overlay parity test.
 */
const props = defineProps<{
  status: string;
  staticNote: { source: string; label: string } | null;
  answersHtml: string;
  policy: any;
  errorText: string;
  calls: number;
  part?: "answers" | "policy";
}>();
const PILL: Record<string, string> = { pass: "ok", fail: "bad", abstain: "warn" };
const show = (p: "answers" | "policy") => !props.part || props.part === p;
</script>

<template>
  <div class="results-body">
    <template v-if="show('answers')">
      <div class="outputs-head" data-section="outputs">
        <div class="meta" data-testid="results-status">{{ status }}</div>
        <div v-if="staticNote" class="lane" data-testid="static-note"><span class="pill" :class="staticNote.source === 'recorded' ? 'ok' : 'warn'">{{ staticNote.source === "recorded" ? "recorded" : "run locally" }}</span><span>{{ staticNote.label }}</span></div>
        <div v-else-if="answersHtml" class="lane" data-testid="live-badge"><span class="pill ok">live</span><span>a live Jev answer from this run</span></div>
        <div v-else-if="policy && !calls" class="lane" data-testid="code-badge"><span class="pill warn">decided in code</span><span>the deterministic prechecks decided this set; no Jev call was made</span></div>
      </div>
      <div v-if="answersHtml" data-section="answers">
        <h4>Answers</h4>
        <div v-html="answersHtml"></div>
      </div>
      <pre v-if="errorText" class="code" data-section="error">{{ errorText }}</pre>
    </template>
    <div v-if="policy && show('policy')" data-section="policy">
      <h4>Policy<span class="meta-inline">{{ policy.decision }}{{ policy.version ? ` v${policy.version}` : "" }}</span></h4>
      <div v-if="policy.static_unavailable" class="lane"><span class="pill warn">demo</span><span>policy engine not available in demo (edited inputs); review floor gate shown instead</span></div>
      <div v-else-if="policy.offline" class="lane"><span class="pill warn">offline</span><span>policy engine offline, review floor gate shown instead</span></div>
      <template v-else>
        <div v-if="policy.static_policy_note" class="meta">{{ policy.static_policy_note }}</div>
        <div class="meta">decisions service, inputs from {{ policy.inputs_source === "request" ? "the form" : policy.inputs_source }}{{ policy.state_matches === false ? ", WARNING: state differs from the one built from the inputs" : "" }}</div>
        <div v-for="s in policy.steps" :key="s.stage + s.id" class="lane" :class="{ chosen: s.id === policy.rule }">
          <span class="dot"></span><span class="pill" :class="PILL[s.verdict]">{{ s.verdict }}</span>
          <span><b>{{ s.stage }}</b> {{ s.id }}: {{ s.reason }}</span>
        </div>
        <div class="vbox" data-testid="results-outcome"><span class="pill" :class="policy.status === 'completed' ? 'ok' : policy.status === 'abstained' ? 'warn' : 'bad'">{{ policy.status }}</span> <b>outcome {{ policy.outcome ?? "none" }}</b> by rule {{ policy.rule }}</div>
      </template>
    </div>
  </div>
</template>
