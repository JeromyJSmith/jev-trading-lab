<script setup lang="ts">
/** Patch 0007: cards carry their own key (A.. trading, OA.. originals) and, for catalog scenarios, an Add to strategy box. */
import { isPicked } from "../lib/strategy";
import type { Card } from "../lib/trading";
defineProps<{ cases: Card[]; selected: string }>();
const emit = defineEmits<{ select: [key: string]; pick: [card: Card] }>();
</script>

<template>
  <div class="cases">
    <div
      v-for="c in cases"
      :key="c.key"
      class="case"
      role="button"
      tabindex="0"
      :class="{ selected: c.key === selected, picked: c.catalog_id && isPicked(c.catalog_id) }"
      @click="emit('select', c.key)"
      @keydown.enter="emit('select', c.key)"
    >
      <div class="case-head"><b>{{ c.key }}</b> {{ c.name }}</div>
      <p>{{ c.blurb }}</p>
      <div v-if="c.catalog_id || c.tag" class="case-foot">
        <span v-if="c.catalog_id" class="chip">{{ c.catalog_id }}</span>
        <span v-if="c.tag" class="chip">{{ c.tag }}</span>
        <label v-if="c.catalog_id" class="addpick" @click.stop>
          <input type="checkbox" :checked="isPicked(c.catalog_id)" @change="emit('pick', c)" />
          Add to strategy
        </label>
      </div>
    </div>
  </div>
</template>
