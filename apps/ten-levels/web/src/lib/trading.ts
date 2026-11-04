/** Patch 0007: the jev-levels-trading scenarios per level (A, B, ...), exported beside each level's code. */
import t1 from "../../../src/levels/level01/trading.json";
import t2 from "../../../src/levels/level02/trading.json";
import t3 from "../../../src/levels/level03/trading.json";
import t4 from "../../../src/levels/level04/trading.json";
import t5 from "../../../src/levels/level05/trading.json";
import t6 from "../../../src/levels/level06/trading.json";
import t7 from "../../../src/levels/level07/trading.json";
import t8 from "../../../src/levels/level08/trading.json";
import t9 from "../../../src/levels/level09/trading.json";
import t10 from "../../../src/levels/level10/trading.json";

export interface TradingCase {
  key: string; catalog_id: string; name: string; blurb: string; thresholds: Record<string, number>; stage_hint: string;
  runs_in: string; cost_class: string;
}
const ALL: Record<number, { options: any[] }> = { 1: t1, 2: t2, 3: t3, 4: t4, 5: t5, 6: t6, 7: t7, 8: t8, 9: t9, 10: t10 };

export const TRADING_CASES: Record<number, TradingCase[]> = Object.fromEntries(
  Object.entries(ALL).map(([n, t]) => [n, t.options.map((o) => ({
    key: o.key, catalog_id: o.catalog_id, name: o.name, blurb: o.blurb, thresholds: o.thresholds, stage_hint: o.stage_hint,
    runs_in: o.runs_in, cost_class: o.cost_class,
  }))]),
);

export function catalogLookup(id: string) {
  for (const [n, cases] of Object.entries(TRADING_CASES)) {
    const c = cases.find((x) => x.catalog_id === id);
    if (c) return { level: Number(n), title: c.name, thresholds: c.thresholds };
  }
  return undefined;
}
export interface Card { key: string; name: string; blurb: string; catalog_id?: string; tag?: string }
