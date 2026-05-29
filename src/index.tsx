#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app";

const HELP = `
  🎰 slot-slop — spin for your harness / model / effort

  usage:
    slot-slop "your task prompt here"

  press ⏎ or space to stop each reel, left to right.
  the harness you land on restricts which models can appear,
  and the model restricts which effort levels can appear.
`;

function onExit(cmd: string | null): void {
  if (cmd) {
    process.stdout.write(`\n  ▶ run this:\n\n    \x1b[1m${cmd}\x1b[0m\n\n`);
  } else {
    process.stdout.write("\n  bye 👋\n\n");
  }
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(HELP);
    process.exit(0);
  }
  const prompt = args.join(" ").trim() || "do something cool";

  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<App prompt={prompt} onExit={onExit} />);
}

main();
