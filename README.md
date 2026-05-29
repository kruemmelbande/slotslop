# 🎰 slot-slop

A silly CLI slot machine for picking your coding setup. Three reels spin:

1. **Harness** — Claude Code, Codex, OpenCode, Pi, Antigravity CLI, Cursor CLI
2. **Model** — Sonnet 4.6, Haiku 4.6, Opus 4.8, GPT-5.5, GPT-5.4, … , Gemini 3.1 Pro, …
3. **Effort** — no-reasoning, low, medium, high

Press <kbd>⏎</kbd> or <kbd>space</kbd> to stop each reel, left to right. On the
results screen, <kbd>⏎</kbd> **runs the rolled command immediately** (handing your
terminal to it — interactive mode), and <kbd>esc</kbd> leaves without running
(printing the command so you can copy it). The generated commands prefer each
harness's **interactive** mode (e.g. `codex` not `codex exec`, `cursor-agent`
without `-p`, `opencode run` since its TUI can't be seeded with a prompt). The
rolled effort only appears as a flag where the CLI actually supports one — Claude
Code's `--effort` (low/medium/high/xhigh/max) and Codex's `-c model_reasoning_effort`;
the other harnesses have no effort flag, so it's shown in the UI but omitted from
their command. (Model names are the fun fictional
ones, so a real CLI may still reject them — that's the joke.)

Built as a TUI with [OpenTUI](https://github.com/anomalyco/opentui) (React renderer).
The reels stay on your terminal's themed ANSI palette (high contrast, native feel),
while the **flashy layer goes full Vegas** in truecolor:

- 💥 a **shockwave** ring radiates from a column the instant you press the button
- 🎉 **confetti** erupts when a reel actually *locks in*, with a full-screen
  confetti rain on the win
- ✨ a **wrapping rainbow shimmer** chases around the border of the active column
- 🌈 a **scrolling rainbow marquee** title and gradient bars framing the machine
- a flashing **JACKPOT** banner + color-cycling command box when all three lock

## Win / lose conditions

The final roll isn't always a jackpot — the combination is judged:

- 🎉 **Jackpot** — a smart model (Opus 4.8 / GPT-5.5, or the solid GPT-5.4) with
  real effort (medium/high). Rainbow banner + neon confetti rain.
- 😫 **So close!** — a great model on a great harness (Cursor / Claude Code / Codex)…
  but you fumbled the effort (low / no-reasoning). One hopeful amber puff that fizzles.
- 💀 **Bust** — a "dumb" model (Sonnet 4.6, Haiku 4.6, GPT-5.4-mini, codex-spark).
  Red debris rains down regardless of effort.
- 📉 **Low effort** — a decent model crippled by low/no-reasoning (on a meh harness).
- 🫠 **Tough luck :(** — you rolled Gemini. A gloomy gray drizzle.

(You can still hit ⏎ to print the command in every case.)

The reels are **dependent**: the harness you land on restricts which models can
appear next (Claude Code only spins Anthropic models, Antigravity only Gemini,
OpenCode anything…), and the model restricts which effort levels are available
(e.g. GPT-5.5 has no "no-reasoning" level).

## Run

```bash
bun install
bun run src/index.tsx "Update my homepage to have dark mode"
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
