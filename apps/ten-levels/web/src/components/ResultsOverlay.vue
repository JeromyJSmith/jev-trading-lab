<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { clampRect, dragRect, isSheet, loadRect, saveRect, type PanelRect } from "../lib/results-panel";

/**
 * Patch 0015: a floating Results panel over the run modal or the page. Drag it by its header, resize it from the
 * bottom-right corner; Close or Esc hides it. Its rect is remembered in sessionStorage and kept inside the viewport.
 * At phone widths it is a full-width bottom sheet.
 */
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();

const store = (() => { try { return window.sessionStorage; } catch { return undefined; } })();
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const rect = reactive<PanelRect>(loadRect(store, vw(), vh()));
const sheet = ref(isSheet(vw()));
const el = ref<HTMLElement | null>(null);

function apply(r: PanelRect) { Object.assign(rect, r); }
function persist() { saveRect(store, { ...rect }); }

let drag: { px: number; py: number; start: PanelRect } | null = null;
function down(e: PointerEvent) {
  if (sheet.value || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
  drag = { px: e.clientX, py: e.clientY, start: { ...rect } };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  e.preventDefault();
}
function move(e: PointerEvent) {
  if (!drag) return;
  apply(dragRect(drag.start, e.clientX - drag.px, e.clientY - drag.py, vw(), vh()));
}
function up() { if (drag) { drag = null; persist(); } }

function onResize() {
  sheet.value = isSheet(vw());
  apply(clampRect(rect, vw(), vh()));
}
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") { e.stopPropagation(); emit("close"); }
}
/* The CSS resize handle changes the element's size; mirror it into the rect (clamped) and remember it. */
let ro: ResizeObserver | undefined;
let roTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKey, true);
  if (el.value && "ResizeObserver" in window) {
    ro = new ResizeObserver(() => {
      if (sheet.value || !el.value || drag) return;
      const w = el.value.offsetWidth, h = el.value.offsetHeight;
      if (Math.abs(w - rect.w) < 2 && Math.abs(h - rect.h) < 2) return;
      apply(clampRect({ ...rect, w, h }, vw(), vh()));
      clearTimeout(roTimer); roTimer = setTimeout(persist, 200);
    });
    ro.observe(el.value);
  }
  el.value?.focus({ preventScroll: true });
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("keydown", onKey, true);
  ro?.disconnect(); clearTimeout(roTimer);
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="el"
      class="results-overlay"
      :class="{ sheet }"
      role="dialog"
      aria-label="Results"
      tabindex="-1"
      data-testid="results-overlay"
      :style="sheet ? undefined : { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
    >
      <div class="results-head" data-testid="results-handle" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
        <b>Results</b><span class="meta-inline">{{ title }}</span>
        <span class="spacer"></span>
        <button class="ghost results-x" aria-label="Close results" data-testid="results-close" @click="emit('close')">×</button>
      </div>
      <div class="results-scroll"><slot /></div>
    </div>
  </Teleport>
</template>
