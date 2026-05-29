# 🎰 slot-slop

A silly CLI slot machine for picking your coding setup. Three reels spin:

1. **Harness** — Claude Code, Codex, OpenCode, Pi, Antigravity CLI, Cursor CLI
2. **Model** — Sonnet 4.6, Haiku 4.6, Opus 4.8, GPT-5.5, GPT-5.4, … , Gemini 3.1 Pro, …
3. **Effort** — no-reasoning, low, medium, high

Press <kbd>⏎</kbd> or <kbd>space</kbd> to stop each reel, left to right. It then
prints the command to run for whatever it landed on.

The reels are **dependent**: the harness you land on restricts which models can
appear next (Claude Code only spins Anthropic models, Antigravity only Gemini,
OpenCode anything…), and the model restricts which effort levels are available
(e.g. GPT-5.5 has no "no-reasoning" level).

## Run

```bash
bun install
bun run src/index.ts "Update my homepage to have dark mode"
```

or, once linked:

```bash
slot-slop "Update my homepage to have dark mode"
```

## Example

```
   Claude Code   ·   Haiku 4.6   ·   high effort

  ▶ run this:

    claude -m haiku-4.6 --effort high 'Update my homepage to have dark mode'
```

`q`, `esc`, or `ctrl-c` quits.
