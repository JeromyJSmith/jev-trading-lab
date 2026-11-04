<script setup lang="ts">
/** Patch 0016: a Sent or Received body (syntax-highlighted JSON), shared by the page and the Results overlay. */
defineProps<{ kind: "sent" | "received"; title: string; note: string; html: string; calls: number }>();
</script>

<template>
  <div class="io-block" :data-section="kind" :data-testid="`io-${kind}`">
    <h4>{{ title }}<span v-if="calls > 1" class="meta-inline">call {{ calls }}</span></h4>
    <div class="meta">{{ note }}</div>
    <pre class="code" v-html="html"></pre>
  </div>
</template>
