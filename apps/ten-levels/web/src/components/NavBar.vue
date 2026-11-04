<script setup lang="ts">
const base = import.meta.env.BASE_URL;
import { visual } from "../lib/store";
</script>

<template>
  <nav class="nav">
    <RouterLink class="brand" to="/"><img class="logo" :src="`${base}logo.svg`" alt="10J" width="54" height="36" /><span>10 Levels of <b>Jev</b></span></RouterLink>
    <span class="spacer"></span>
    <label class="toggle" :class="{ on: visual }">
      <input v-model="visual" type="checkbox" />
      <span class="track"><span class="knob"></span></span>
      Visual
    </label>
  </nav>
</template>
