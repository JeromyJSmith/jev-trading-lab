import wb11 from "../../../src/levels/level11/schemas.json";
import wb12 from "../../../src/levels/level12/schemas.json";
import wb13 from "../../../src/levels/level13/schemas.json";
/** Static level metadata the pages render before any API call. */
export interface LevelMeta {
  n: number;
  title: string;
  /** The named Jev pattern this level teaches (workbench patch). */
  pattern: string;
  /** One description, always opening with "Use This For:" and when to reach for this level. */
  sub: string;
}

export const USE_LABEL = "Use This For:";

/** The description split at the label so the page can color it: [before, after]. */
export function splitUse(sub: string): [string, string] {
  const i = sub.indexOf(USE_LABEL);
  return i < 0 ? [sub, ""] : [sub.slice(0, i), sub.slice(i + USE_LABEL.length)];
}

export const LEVELS: LevelMeta[] = [
  { n: 1, pattern: "Smart If (Noul Gate)", title: "Trading Yes/No Checks", sub: "Use This For: any single yes-or-no trading judgment that a keyword or regex check gets wrong, on news, filings, trade plans and order notes, order requests, chat or desk messages, journal entries, broker or system messages, setup descriptions. Is it about this ticker? Does the plan have an exit? Is this a live order? A margin call? Code owns the threshold; Jev reads the meaning." },
  { n: 2, pattern: "Choice Classifier", title: "Headline and Filing Classifier", sub: "Use This For: sorting news, 8-K items, analyst actions and setups into the buckets your strategy defines, one or more labels per call, so the right rule handles each event." },
  { n: 3, pattern: "Weighted Score", title: "Catalyst and Idea Scoring", sub: "Use This For: grading a catalyst, trade idea, earnings print or backtest on scales you define. One score per factor; the weights that combine them live in code, so tuning is a number change, not a prompt." },
  { n: 4, pattern: "Confidence Gate", title: "Confidence-Gated Trade Actions", sub: "Use This For: actions where a wrong call costs more than asking you: halts, order changes, stop moves, fill breaks. Confident runs automatically, unsure asks to confirm, low goes to a human." },
  { n: 5, pattern: "Cheap Router", title: "Research and Alert Routing", sub: "Use This For: one cheap decision in front of expensive work. Route news, alerts, filings and desk questions to a simple rule, a deep model review or an analyst, so most items never touch the costly path." },
  { n: 6, pattern: "Hook Guardrail", title: "Order and Agent Guardrails", sub: "Use This For: checking every proposed order and agent action before it runs: no stop, oversize, earnings blackout, out of hours, unsafe tool output. The trading agent never sees the check; it just gets blocked." },
  { n: 7, pattern: "Context Judge", title: "Regime and Thesis Drift", sub: "Use This For: knowing when the market or your thesis has moved on: regime shifts, stale theses, volatility shocks, drawdown tiers. Numbers in code, judgment in Jev: hold, notice, recommend, or cut." },
  { n: 8, pattern: "Blind Read", title: "Filing Reads Without Loading", sub: "Use This For: a judgment about a 10-K, 8-K, Form 4 or 13D without pulling the whole document into context: going concern, auditor change, new risk factor, activist intent, shelf dilution." },
  { n: 9, pattern: "Parallel Triage", title: "Screening at Scale", sub: "Use This For: asking the same questions of hundreds of filings, stories or tickers in parallel and letting code cut the list: universe screens, what drove the move, sympathy peers, duplicate stories." },
  { n: 10, pattern: "Agent-Called Decision", title: "Trading Agent Asks Jev", sub: "Use This For: letting your trading agent decide when to ask for a typed decision: pre-trade checks, post-trade reviews, backtest triage, strategy diffs. One ask_jev tool, paper orders only." },
  { n: 11, pattern: "Signal Review", title: "Setup and Signal Review", sub: "Use This For: checking a code-generated setup before it becomes a paper trade: which setup family is this, does the evidence fit the hypothesis, is the backtest credible, is the input text safe to trust." },
  { n: 12, pattern: "Residual Classifier", title: "Chart Shape Patterns", sub: "Use This For: naming the intraday pattern left after the market's common shape is removed: trend day, reversal, range, gap fill, or unclear. Below the review floor, a human looks." },
  { n: 13, pattern: "News Filter and Kill Switch", title: "News Filters and Kill Switches", sub: "Use This For: the ten trading uses of Jev: gap catalysts, EMA and RSI risk filters, earnings guidance, upcoming catalysts, breakout reasons, activist 13Ds, sympathy plays, position kill switches, 10-K risks and agent trade checks. Code owns the signal and the 50% filters; Jev reads the text. Paper only." },
];

/** One sentence per use case, shown on the selectable cards. */
export const USE_CASES: Record<number, [string, string][]> = {
  11: wb11.options.map((o) => [o.name, o.blurb] as [string, string]),
  12: wb12.options.map((o) => [o.name, o.blurb] as [string, string]),
  13: wb13.options.map((o) => [o.name, o.blurb] as [string, string]),
  1: [
    ["Prompt injection gate", "One Noul in front of everything else: is this text talking to us, or trying to instruct the model?"],
    ["Urgency gate", "One Noul: is this urgent? Above 0.7 the page triggers. The threshold is yours to read and move."],
    ["Ticket classifier", "One Choice: which department? The answer is always one of four. An other option gives the model an exit."],
  ],
  2: [
    ["Support triage", "Two Choices in one call: which team, how urgent. Both answers are options you declared."],
    ["Resume screening", "Not rate this resume. Two Choices: how senior, how well it matches. Code decides who proceeds."],
    ["Sponsor qualification", "Two Choices: what the sender wants, what they sell. Sponsorship plus dev tool gets the auto-reply."],
  ],
  3: [
    ["Ticket priority", "Severity 0.6, frustration 0.3, report quality 0.1. Weights a reviewer can read in one line."],
    ["Code-review risk", "Security risk, complexity, convention drift, commit quality, weighted into one number with a review threshold."],
    ["Idea verdict", "Problem, demand, monetization, differentiation. Four scores, one weighted number: kill, fix, or ship."],
  ],
  4: [
    ["Bash Tool Gate", "read only, reversible, irreversible before an agent runs anything. Low confidence is what asks the human."],
    ["Account actions", "check_balance runs above the floor. approve_transfer needs the 0.9 bar to run without a confirmation."],
    ["Citation check", "Does the source support the claim, is the quote faithful? Low confidence flags for review instead of failing silently."],
  ],
  5: [
    ["Agent router", "Which harness handles the task: script, fast agent, reasoning agent, browser agent, or human."],
    ["Intent router", "Order status never touches an LLM. Product questions get the LLM. Hard complaints go to a human."],
    ["Model router", "Choose the least costly model that can complete the task, plus an effort score for reasoning depth."],
  ],
  6: [
    ["Bash gate", "Before any command runs: read only, reversible, or irreversible, and does it mean to destroy. Irreversible blocks. The agent sees only the reason."],
    ["Write gate", "Paths outside the repo block in code, no call. Inside, Jev asks whether the file or its content holds a credential."],
    ["Result screen", "After a read or a command, before the model sees it: data, or instructions aimed at the agent? Flagged output gets a banner."],
  ],
  7: [
    ["Turn end hook", "Four questions after every turn, one call. Silent, notice, recommend, or request, with Jev's reason. The agent never asked."],
    ["On demand tool", "The agent calls should_i_compact and gets a typed verdict: should it, which tier, why, and what to do next."],
    ["Pick the cut point", "Before compaction, Jev picks which turn starts the live work. The pick becomes the summary instructions."],
  ],
  8: [
    ["ask_jev_file_bool", "One file, one yes or no. The agent asks whether a file validates tokens and gets a probability back, never the file."],
    ["ask_jev_file_choice", "One file, one pick from options the agent names. Which layer is this file? An exit option is added if the agent leaves none."],
    ["ask_jev_file_score", "One file, one scale the agent writes. How risky is a refactor? The nearest level comes back in words."],
  ],
  9: [
    ["Several paths, one block", "Raw Jev question JSON, several questions, one call per file, all in parallel. Answers per path."],
    ["A glob over a directory", "Code expands the glob, drops node_modules and binaries, refuses files over the budget, and caps at 255 before any call."],
    ["Recursive, then pick first", "Every file in the repo answers, then a second pass picks the one to open first. Keys are paths, so the pick is real."],
  ],
  10: [
    ["Triage a failure", "The tests are red. The agent runs them through ask_jev, code captures the output, and the failure comes back classified."],
    ["Judge a diff before shipping", "The agent wrote a change, then puts git diff through ask_jev for a risk score and a review call. It never pastes the diff."],
    ["Classify a request, gate a plan", "The customer's words as state, the code as paths, one call. Over budget, the error says how to split. The ledger says what it cost."],
  ],
};
