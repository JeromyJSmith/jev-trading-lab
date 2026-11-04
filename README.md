# Jev Trading Lab (static demo)

A static, backend-free demo of a fork of [disler/ten-levels-of-jev](https://github.com/disler/ten-levels-of-jev)
(MIT, © IndyDevDan / AgenticEngineer.com) with trading scenarios added on top.

**Live:** https://jeromyjsmith.github.io/jev-trading-lab/

> **Demo only. Paper only. Not trading advice.** Nothing here places, routes or simulates orders against a broker.
> Every scenario uses synthetic or historical example inputs. Model confidence is not a calibrated trading probability.

## What "Run" does here

There is no server and no model call in this demo. Each run says where its answer came from:

| Label | Meaning |
| --- | --- |
| **recorded live result `<date>`, `jev-<model>`** | A real Jev answer recorded earlier for exactly this input set, replayed. Request and response bodies are reduced to state, questions, answers and token counts; no request ids, headers or account data. Policy rows are the deterministic decisions-service policy run over the recorded answers when the demo was published. |
| **offline mock, not a real Jev answer** | Upstream's deterministic `MockJev` (token overlap + softmax) over a bundled input set. State builder and policy rows were computed by the real decisions service at publish time. |
| **edited (offline mock)** | Inputs you changed. `MockJev` runs in your browser over the raw inputs. The state builder and policy engine are Python and are not in the demo: "policy engine not available in demo". |
| **agent levels 6-10 (originals)** | Real agent sessions need a local sandbox; not run here (mock only, labelled). |

The Strategy tray keeps strategies in your browser (`localStorage`), exports `strategy.v1` YAML and imports YAML/JSON.

## Layout

- `apps/ten-levels/web/` - the Vue app with the workbench patches applied (patch series 0001-0009 in the trading-workbench
  repo). The static build is `VITE_STATIC=1 vite build --config vite.static.config.ts` (`bun run build:static`).
- `apps/ten-levels/web/public/data/` - bundled level metadata, input schemas and run streams (`manifest.json` lists counts).
- `apps/ten-levels/src/levels/*/*.json` - scenario catalogs the app imports.

Build locally: `cd apps/ten-levels/web && bun install --frozen-lockfile && bun run build:static && bunx vite preview --config vite.static.config.ts`.

Deployed by `.github/workflows/pages.yml` (GitHub Actions, `actions/deploy-pages`).

## License

MIT. Upstream copyright and license are kept in `LICENSE`, followed by the notice for the modifications.
