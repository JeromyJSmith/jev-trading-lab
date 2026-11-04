<script setup lang="ts">
import NavBar from "./components/NavBar.vue";
import StrategyTray from "./components/StrategyTray.vue";
import { STATIC } from "./lib/static";
</script>

<template>
  <div v-if="STATIC" class="static-banner" data-testid="static-banner">
    Static demo of the trading-workbench fork of <a href="https://github.com/disler/ten-levels-of-jev" rel="noopener">ten-levels-of-jev</a>.
    No backend: runs replay recorded live Jev results or an offline mock, each labelled. PAPER ONLY, not trading advice.
  </div>
  <NavBar />
  <RouterView />
  <StrategyTray />
</template>
