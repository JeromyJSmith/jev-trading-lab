<script setup lang="ts">
import { computed, reactive, watch } from "vue";

/**
 * Workbench addition (levels 11-12, patch 0004): one field per input-schema field. Nested objects that declare
 * `properties` are flattened to dotted fields (observation.data_cutoff); every other value is one field. Same input
 * styles as InputEditor: strings edit as text, anything else as JSON. Emits the rebuilt object on every edit that parses.
 * `errors` are the decisions service's schema errors by dotted field; unmatched ones are listed under the form.
 */
type Field = { key: string; path: string[]; type: string; required: boolean; description?: string };
const props = defineProps<{ schema: Record<string, any>; modelValue: Record<string, unknown>; errors?: { field: string; message: string }[] }>();
const emit = defineEmits<{ "update:modelValue": [value: Record<string, unknown>] }>();

function flatten(schema: any, prefix: string[] = [], parentRequired = true): Field[] {
  const req = new Set<string>(schema?.required ?? []);
  return Object.entries<any>(schema?.properties ?? {}).flatMap(([name, s]) => {
    const path = [...prefix, name];
    const required = parentRequired && req.has(name);
    if (s?.type === "object" && s.properties && Object.keys(s.properties).length) return flatten(s, path, required);
    const type = Array.isArray(s?.type) ? s.type.join("|") : s?.enum ? `enum ${s.enum.join("|")}` : s?.type ?? "any";
    return [{ key: path.join("."), path, type, required, description: s?.description }];
  });
}
const fields = computed(() => flatten(props.schema));
const isText = (f: Field) => f.type === "string";

const get = (o: any, path: string[]) => path.reduce((c, k) => (c && typeof c === "object" ? c[k] : undefined), o);
function set(o: Record<string, any>, path: string[], v: unknown) {
  let c = o;
  for (const k of path.slice(0, -1)) { if (!c[k] || typeof c[k] !== "object") c[k] = {}; c = c[k]; }
  if (v === undefined) delete c[path[path.length - 1]]; else c[path[path.length - 1]] = v;
}

const text = reactive<Record<string, string>>({});
const parseErrors = reactive<Record<string, string>>({});
function load(input: Record<string, unknown>) {
  for (const f of fields.value) {
    if (parseErrors[f.key]) continue;  // keep the text being fixed; the form is re-mounted on a new set
    const v = get(input, f.path);
    if (v === undefined) { text[f.key] = ""; continue; }
    if (isText(f) && typeof v === "string") { if (text[f.key] !== v) text[f.key] = v; continue; }
    let same = false;
    try { same = JSON.stringify(JSON.parse(text[f.key] ?? "")) === JSON.stringify(v); } catch { same = false; }
    if (!same) text[f.key] = JSON.stringify(v, null, 2);
  }
}
watch(() => [props.modelValue, fields.value], () => load(props.modelValue), { immediate: true, deep: true });

function onInput(f: Field) {
  const next = JSON.parse(JSON.stringify(props.modelValue));
  const raw = text[f.key];
  if (raw.trim() === "" && !f.required) {
    set(next, f.path, undefined);  // empty optional field: leave it out
  } else if (isText(f)) {
    set(next, f.path, raw);
  } else {
    try { set(next, f.path, JSON.parse(raw)); } catch (e) { parseErrors[f.key] = (e as Error).message; return; }
  }
  delete parseErrors[f.key];
  emit("update:modelValue", next);
}

/** Server errors by form field: exact field, else the closest enclosing form field, else listed below the form. */
const byField = computed(() => {
  const out: Record<string, string[]> = {};
  const rest: string[] = [];
  for (const e of props.errors ?? []) {
    const hit = fields.value.filter((f) => e.field === f.key || e.field.startsWith(f.key + ".")).sort((a, b) => b.key.length - a.key.length)[0];
    if (hit) (out[hit.key] ??= []).push(e.field === hit.key ? e.message : `${e.field}: ${e.message}`);
    else rest.push(`${e.field || "(inputs)"}: ${e.message}`);
  }
  return { out, rest };
});

function grow(e: Event) {
  const t = e.target as HTMLTextAreaElement;
  t.style.height = "auto";
  t.style.height = t.scrollHeight + 2 + "px";
}
</script>

<template>
  <div class="fields">
    <label v-for="f in fields" :key="f.key" class="field" :data-field="f.key">
      <span class="field-name mono">{{ f.key }}<span class="meta-inline">&nbsp;· {{ f.type }}{{ f.required ? ", required" : "" }}</span></span>
      <textarea
        v-model="text[f.key]"
        class="mono"
        :class="{ bad: parseErrors[f.key] || byField.out[f.key] }"
        rows="1"
        spellcheck="false"
        @input="onInput(f); grow($event)"
        @focus="grow($event)"
      ></textarea>
      <span v-if="parseErrors[f.key]" class="field-error">{{ parseErrors[f.key] }}</span>
      <span v-for="m in byField.out[f.key] ?? []" :key="m" class="field-error">{{ m }}</span>
    </label>
    <span v-for="m in byField.rest" :key="m" class="field-error">{{ m }}</span>
  </div>
</template>
