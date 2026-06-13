#!/usr/bin/env node
// Run `drizzle-kit push` in a PTY and auto-answer the interactive prompts.
// Always picks the FIRST option (the highlighted default), which for our
// schema diff is always:
//   - "+ create column"   (new column, not a rename)
//   - "+ create table"    (new table, not a rename)
//   - "No, add the constraint without truncating the table"
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

// Use `script -qc` which provides a PTY on Linux.
const child = spawn("script", ["-qfc", "npx drizzle-kit push", "/dev/null"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: process.env,
});

let buf = "";
let lastPrompt = "";
let answered = 0;

child.stdout.on("data", async (chunk) => {
  process.stdout.write(chunk);
  buf += chunk.toString("utf8");
  // Strip ANSI for matching
  const clean = buf.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  // Detect that drizzle showed a prompt with options (line starts with ❯)
  if (clean.includes("❯") && clean !== lastPrompt) {
    lastPrompt = clean;
    // Wait for the menu to fully render, then send Enter to pick the
    // highlighted (first) option.
    await sleep(400);
    child.stdin.write("\r");
    answered++;
    await sleep(200);
    buf = "";
  }
});

child.on("close", (code) => {
  console.log(`\n[auto-push] drizzle-kit exited code=${code}, answered=${answered} prompts`);
  process.exit(code ?? 0);
});
