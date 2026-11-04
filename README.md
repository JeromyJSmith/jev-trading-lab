# Jev Trading Lab (static demo)

A static, backend-free demo of a fork of [disler/ten-levels-of-jev](https://github.com/disler/ten-levels-of-jev)
(MIT, © IndyDevDan / AgenticEngineer.com) with trading scenarios added on top.

**Live:** https://jeromyjsmith.github.io/jev-trading-lab/

> **Demo only. Paper only. Not trading advice.** Nothing here places, routes or simulates orders against a broker.
> Every trading example set is real market data (SEC EDGAR text, newswire items, numbers computed from real 5m bars),
> **unlabelled**: a recorded answer is what Jev said, not a measure of accuracy. Model confidence is not a calibrated
> trading probability.

## What "Run" does here

There is no server and no model call in this demo, and no offline or simulated answers. Each run is one of:

| Label | Meaning |
| --- | --- |
| **recorded live Jev result `<date>`, `<model>`** | A real Jev answer recorded live by the workbench for exactly this real input set, replayed. Request and response bodies are reduced to state, questions, answers and token counts; no request ids, headers or account data. Policy rows are the deterministic decisions-service policy run over the recorded answers when the demo was published. |
| **run locally** | Edited inputs, a set without a recording, upstream originals and agent sessions: "Run locally for a live Jev answer". No result is shown. |
| **needs your data** | Scenarios whose inputs are private (trade plans, journals, fills, chats). The card says why; Run is disabled. |

Each set shows its id (for example `L1.A:c9eb4cebe836`), an `unlabelled` badge and links to its sources. Publishing
policy: EDGAR text is quoted (long fields trimmed to 4000 chars); news items show the headline, the link and at most
200 chars of text.

The Strategy tray keeps strategies in your browser (`localStorage`), exports `strategy.v1` YAML and imports YAML/JSON.

## Layout

- `apps/ten-levels/web/` - the Vue app with the workbench patches applied (patch series 0001-0013 in the trading-workbench
  repo). The static build is `VITE_STATIC=1 vite build --config vite.static.config.ts` (`bun run build:static`).
- `apps/ten-levels/web/public/data/` - bundled level metadata, input schemas and run streams (`manifest.json` lists counts).
- `apps/ten-levels/src/levels/*/*.json` - scenario catalogs the app imports.

Build locally: `cd apps/ten-levels/web && bun install --frozen-lockfile && bun run build:static && bunx vite preview --config vite.static.config.ts`.

Deployed by `.github/workflows/pages.yml` (GitHub Actions, `actions/deploy-pages`).

## License

MIT. Upstream copyright and license are kept in `LICENSE`, followed by the notice for the modifications.
