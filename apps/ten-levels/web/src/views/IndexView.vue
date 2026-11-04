<script setup lang="ts">
const base = import.meta.env.BASE_URL;
import { onBeforeUnmount, onMounted, ref } from "vue";
import { LEVELS } from "../lib/levels";
import { setIndexScroll } from "../lib/store";

/** Workbench patch: every level shows its hero and title; the pattern name is user-renamable (local only). */
const NAMES_KEY = "jev10.patternNames";
function loadNames(): Record<number, string> {
  try { return JSON.parse(localStorage.getItem(NAMES_KEY) || "{}"); } catch { return {}; }
}
const names = ref<Record<number, string>>(loadNames());
function patternName(n: number, fallback: string): string { return names.value[n] || fallback; }
function rename(n: number, current: string, e: Event): void {
  e.preventDefault(); e.stopPropagation();
  const next = window.prompt(`Name the pattern for Level ${n}`, current);
  if (next === null) return;
  const v = next.trim();
  const copy = { ...names.value };
  if (v) copy[n] = v; else delete copy[n];
  names.value = copy;
  try { localStorage.setItem(NAMES_KEY, JSON.stringify(copy)); } catch { /* storage unavailable */ }
}

/** Each card is 7% larger than the one to its left, so the ladder reads as a ramp. */
const scale = (n: number) => String(1.07 ** (n - 1));

function save() {
  setIndexScroll(window.scrollX);
}

onMounted(() => window.addEventListener("scroll", save, { passive: true }));
onBeforeUnmount(() => {
  save();
  window.removeEventListener("scroll", save);
});
</script>

<template>
  <div class="index-wrap">
    <div class="level-line">
      <RouterLink v-for="L in LEVELS" :key="L.n" class="card" :style="{ '--s': scale(L.n) }" :to="`/level/${L.n}`">
        <div class="hero-box">
          <img :src="`${base}heroes/level-${L.n}.svg`" :alt="`Level ${L.n}: ${patternName(L.n, L.pattern)}`" />
        </div>
        <div class="body">
          <div class="lvl">Level {{ L.n }} · <span class="pattern" title="Double-click to rename this pattern" @dblclick="rename(L.n, patternName(L.n, L.pattern), $event)">{{ patternName(L.n, L.pattern) }}</span></div>
          <h2>{{ L.title }}</h2>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
