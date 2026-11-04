<script setup lang="ts">
import { highlightTs } from "../lib/highlight";

/**
 * Patch 0015: the Outputs content, shared by the page's Outputs section and the floating Results panel.
 * `panel` adds the collapsible Sent and Received bodies (on the page they sit in Inputs and below Outputs).
 */
defineProps<{
  status: string;
  staticNote: { source: string; label: string } | null;
  answersHtml: string;
  policy: any;
  errorText: string;
  calls: number;
  sentHtml?: string;
  receivedHtml?: string;
  build?: any;
  panel?: boolean;
}>();
const PILL: Record<string, string> = { pass: "ok", fail: "bad", abstain: "warn" };
</script>

<template>
  <div class="results-body">
    <div class="meta" data-testid="results-status">{{ status }}</div>
    <div v-if="staticNote" class="lane" data-testid="static-note"><span class="pill" :class="staticNote.source === 'recorded' ? 'ok' : 'warn'">{{ staticNote.source === "recorded" ? "recorded" : "run locally" }}</span><span>{{ staticNote.label }}</span></div>
    <div v-else-if="panel && answersHtml" class="lane" data-testid="live-badge"><span class="pill ok">live</span><span>a live Jev answer from this run</span></div>
    <div v-else-if="panel && policy && !calls" class="lane" data-testid="code-badge"><span class="pill warn">decided in code</span><span>the deterministic prechecks decided this set; no Jev call was made</span></div>
    <template v-if="answersHtml">
      <h4>Answers</h4>
      <div v-html="answersHtml"></div>
    </template>
    <template v-if="policy">
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
    </template>
    <pre v-if="errorText" class="code">{{ errorText }}</pre>
    <template v-if="panel">
      <details v-if="sentHtml" class="results-io" data-testid="results-sent">
        <summary>Sent<span v-if="calls > 1" class="meta-inline">call {{ calls }}</span><span class="meta-inline">POST /decisions, the request body</span></summary>
        <pre class="code" v-html="sentHtml"></pre>
      </details>
      <details v-else-if="build && build.state" class="results-io" data-testid="results-sent">
        <summary>Sent<span class="meta-inline">nothing sent to Jev: decided in code; the state POST /build built</span></summary>
        <pre class="code" v-html="highlightTs(JSON.stringify(build.state, null, 2), 'json')"></pre>
      </details>
      <details v-if="receivedHtml" class="results-io" data-testid="results-received">
        <summary>Received<span v-if="calls > 1" class="meta-inline">call {{ calls }}</span><span class="meta-inline">the response body</span></summary>
        <pre class="code" v-html="receivedHtml"></pre>
      </details>
    </template>
  </div>
</template>
