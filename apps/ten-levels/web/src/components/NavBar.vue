<script setup lang="ts">
const base = import.meta.env.BASE_URL;
import { visual } from "../lib/store";
import { live } from "../lib/live";
</script>

<template>
  <nav class="nav">
    <RouterLink class="brand" to="/"><img class="logo" :src="`${base}logo.svg`" alt="JTL" width="54" height="36" /><span>Jev <b>Trading Lab</b></span></RouterLink>
    <!-- Patch 0014: the loaded scenario's set pills, Run and Reset; nothing on pages without a live example. -->
    <div v-if="live.controls && live.controls.sets.length" class="nav-sets" data-testid="nav-sets">
      <button
        v-for="(name, i) in live.controls.sets"
        :key="name"
        class="set"
        :class="{ selected: i === live.controls.setIndex }"
        :disabled="live.controls.running"
        @click="live.controls.selectSet(i)"
      >{{ name }}</button>
    </div>
    <span v-else class="spacer"></span>
    <label class="toggle" :class="{ on: visual }">
      <input v-model="visual" type="checkbox" />
      <span class="track"><span class="knob"></span></span>
      Visual
    </label>
    <template v-if="live.controls && !live.controls.agent">
      <button
        class="ghost nav-btn"
        :class="{ on: live.controls.resultsOpen }"
        :disabled="!live.controls.hasResults"
        :aria-pressed="live.controls.resultsOpen"
        title="Show the last run's results in a floating panel"
        data-testid="nav-results"
        @click="live.controls.toggleResults()"
      >Results</button>
      <button class="ghost nav-btn" :disabled="live.controls.running" data-testid="reset" @click="live.controls.reset()">Reset</button>
      <button
        class="run nav-btn"
        :disabled="live.controls.running || live.controls.disabled"
        :title="live.controls.disabled ? 'needs your data' : ''"
        data-testid="run"
        @click="live.controls.run()"
      >{{ live.controls.runLabel }} <kbd>⌘↵</kbd></button>
    </template>
  </nav>
</template>
