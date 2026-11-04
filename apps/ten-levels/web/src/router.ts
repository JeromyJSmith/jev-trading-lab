import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { STATIC } from "./lib/static";
import IndexView from "./views/IndexView.vue";
import LevelView from "./views/LevelView.vue";
import { indexScroll } from "./lib/store";

export const router = createRouter({
  // Patch 0009: hash routing in the static build, so GitHub Pages deep links resolve without a server fallback.
  history: STATIC ? createWebHashHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: IndexView },
    { path: "/level/:n(\\d+)", component: LevelView, props: (r) => ({ n: Number(r.params.n) }) },
  ],
  // The index scrolls sideways, so returning to it restores the spot in the line.
  scrollBehavior: (to) => (to.path === "/" ? { top: 0, left: indexScroll.value } : { top: 0, left: 0 }),
});
