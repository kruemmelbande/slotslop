#!/usr/bin/env bun
import {
  HARNESSES,
  EFFORTS,
  type Effort,
  type HarnessDef,
  type ModelDef,
} from "./data";

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const ESC = "\x1b[";
const c = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  invGreen: `${ESC}30;42m`,
  invYellow: `${ESC}30;43m`,
};
const paint = (s: string, ...codes: string[]) => codes.join("") + s + c.reset;

// ── Layout ───────────────────────────────────────────────────────────────────
const COL_W = 22; // inner width of each reel box

const center = (s: string, w: number): string => {
  if (s.length > w) s = s.slice(0, w - 1) + "…";
  const total = w - s.length;
  const left = Math.floor(total / 2);
  return " ".repeat(left) + s + " ".repeat(total - left);
};

// ── Reel column ──────────────────────────────────────────────────────────────
type ColKind = "harness" | "model" | "effort";
type ColState = "spin" | "stopping" | "stopped";

interface Column {
  kind: ColKind;
  title: string;
  labels: string[];
  idx: number;
  state: ColState;
  wait: number;
  delay: number;
}

const STOP_AT = 7; // higher = longer wind-down

const allModelLabels = (): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of HARNESSES)
    for (const m of h.models)
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m.label);
      }
  return out;
};

// ── Engine ───────────────────────────────────────────────────────────────────
function run(prompt: string): void {
  let harnessPool: HarnessDef[] = HARNESSES;
  let modelPool: ModelDef[] = []; // resolved after harness locks
  let effortPool: Effort[] = EFFORTS;

  let selectedHarness: HarnessDef | null = null;
  let selectedModel: ModelDef | null = null;
  let selectedEffort: Effort | null = null;

  const rand = (n: number) => Math.floor(Math.random() * n);

  const cols: Column[] = [
    {
      kind: "harness",
      title: "HARNESS",
      labels: harnessPool.map((h) => h.label),
      idx: rand(harnessPool.length),
      state: "spin",
      wait: 0,
      delay: 0,
    },
    {
      kind: "model",
      title: "MODEL",
      labels: allModelLabels(),
      idx: 0,
      state: "spin",
      wait: 0,
      delay: 0,
    },
    {
      kind: "effort",
      title: "EFFORT",
      labels: EFFORTS,
      idx: 0,
      state: "spin",
      wait: 0,
      delay: 0,
    },
  ];

  let active = 0; // column the next key press will halt
  let done = false;

  const onStop = (i: number): void => {
    const col = cols[i]!;
    if (col.kind === "harness") {
      selectedHarness = harnessPool[col.idx]!;
      modelPool = selectedHarness.models;
      const m = cols[1]!;
      m.labels = modelPool.map((x) => x.label);
      m.idx = rand(modelPool.length);
      active = 1;
    } else if (col.kind === "model") {
      selectedModel = modelPool[col.idx]!;
      effortPool = selectedModel.efforts;
      const e = cols[2]!;
      e.labels = effortPool;
      e.idx = rand(effortPool.length);
      active = 2;
    } else {
      selectedEffort = effortPool[col.idx]!;
      done = true;
    }
  };

  const tick = (col: Column, i: number): void => {
    if (col.state === "stopped") return;
    if (col.state === "spin") {
      col.idx = (col.idx + 1) % col.labels.length;
      return;
    }
    // stopping: step less and less often until it settles
    if (--col.wait <= 0) {
      col.idx = (col.idx + 1) % col.labels.length;
      col.delay += 1;
      col.wait = col.delay;
      if (col.delay > STOP_AT) {
        col.state = "stopped";
        onStop(i);
      }
    }
  };

  // ── Rendering ──────────────────────────────────────────────────────────────
  const reelRows = (col: Column, isActive: boolean): string[] => {
    const L = col.labels.length;
    const at = (o: number) => col.labels[(col.idx + o + L * 8) % L]!;
    const stopped = col.state === "stopped";

    const top = paint(center(at(-1), COL_W), c.dim);
    const bottom = paint(center(at(1), COL_W), c.dim);

    const text = center(at(0), COL_W);
    let mid: string;
    if (stopped) mid = paint(text, c.invGreen, c.bold);
    else if (isActive && col.state === "stopping")
      mid = paint(text, c.invYellow, c.bold);
    else mid = paint(text, c.bold, c.cyan);

    const arrow = stopped ? paint("✔", c.green) : isActive ? paint("◀", c.yellow) : " ";
    return [
      `│ ${top} │`,
      `│${mid}│${arrow}`,
      `│ ${bottom} │`,
    ];
  };

  const frame = (): string => {
    const border = "─".repeat(COL_W + 2);
    const lines: string[] = [];
    lines.push("");
    lines.push(paint("  🎰  S L O T - S L O P  🎰", c.bold, c.magenta));
    lines.push(paint(`  task: ${prompt}`, c.dim));
    lines.push("");

    // titles
    const titleRow = cols
      .map((col, i) => {
        const t = center(col.title, COL_W + 2);
        return i === active && !done ? paint(t, c.bold, c.yellow) : paint(t, c.dim);
      })
      .join("  ");
    lines.push("  " + titleRow);

    const tops = cols.map(() => "┌" + border + "┐");
    lines.push("  " + tops.join("  "));

    const rendered = cols.map((col, i) => reelRows(col, i === active && !done));
    for (let r = 0; r < 3; r++) lines.push("  " + rendered.map((x) => x[r]).join(" "));

    const bots = cols.map(() => "└" + border + "┘");
    lines.push("  " + bots.join("  "));

    lines.push("");
    if (done) {
      lines.push(paint("  🎉 all locked in!", c.bold, c.green));
    } else {
      const which = cols[active]!.title.toLowerCase();
      lines.push(
        paint(`  press `, c.dim) +
          paint("⏎ / space", c.bold) +
          paint(` to stop the ${which} reel`, c.dim) +
          paint("    (q to quit)", c.dim),
      );
    }
    lines.push("");
    return lines.join("\n");
  };

  // ── Terminal plumbing ────────────────────────────────────────────────────────
  const out = process.stdout;
  const stdin = process.stdin;
  out.write(`${ESC}?25l`); // hide cursor

  const draw = () => out.write(`${ESC}H` + frame() + `${ESC}0J`);
  out.write(`${ESC}2J`);

  const cleanup = () => {
    clearInterval(timer);
    if (stdin.isTTY) stdin.setRawMode(false);
    stdin.pause();
    out.write(`${ESC}?25h`); // show cursor
  };

  const finish = () => {
    draw();
    cleanup();
    const h = selectedHarness!;
    const cmd = h.buildCommand(selectedModel!, selectedEffort!, prompt);
    out.write("\n");
    out.write(
      "  " +
        paint(` ${h.label} `, c.invGreen, c.bold) +
        "  " +
        paint(selectedModel!.label, c.cyan, c.bold) +
        paint("  ·  ", c.dim) +
        paint(`${selectedEffort} effort`, c.yellow, c.bold) +
        "\n\n",
    );
    out.write(paint("  ▶ run this:\n\n", c.dim));
    out.write("    " + paint(cmd, c.bold, c.green) + "\n\n");
    process.exit(0);
  };

  const timer = setInterval(() => {
    cols.forEach(tick);
    draw();
    if (done) finish();
  }, 70);

  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  stdin.on("data", (key: string) => {
    if (key === "\x03" || key === "q" || key === "\x1b") {
      cleanup();
      out.write(paint("\n  bye 👋\n\n", c.dim));
      process.exit(0);
    }
    if (key === "\r" || key === "\n" || key === " ") {
      const col = cols[active]!;
      if (col.state === "spin") {
        col.state = "stopping";
        col.delay = 1;
        col.wait = 1;
      }
    }
  });
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === "--help" || args[0] === "-h") {
    console.log(`
  🎰 slot-slop — spin for your harness / model / effort

  usage:
    slot-slop "your task prompt here"

  press ⏎ or space to stop each reel, left to right.
  the harness you land on restricts which models can appear,
  and the model restricts which effort levels can appear.
`);
    process.exit(0);
  }
  const prompt = args.join(" ").trim() || "do something cool";
  run(prompt);
}

main();
