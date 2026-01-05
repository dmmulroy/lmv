#!/usr/bin/env bun
import { resolve } from "path";
import { startServer } from "./server";

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
lmv - Local Markdown Viewer

Usage:
  lmv <file.md>           Open markdown file in browser
  lmv <file.md> -p 8080   Use custom port

Options:
  -p, --port <number>     Port to run server on (default: 3000)
  -h, --help              Show this help message
  --no-open               Don't auto-open browser

Environment:
  GITHUB_TOKEN            Enable "Share as Gist" feature

Examples:
  lmv README.md
  lmv docs/guide.md -p 8080
  GITHUB_TOKEN=ghp_xxx lmv README.md
`);
}

async function main() {
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  // Parse arguments
  let filePath: string | undefined;
  let port = 3000;
  let autoOpen = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-p" || arg === "--port") {
      const portArg = args[++i];
      if (!portArg) {
        console.error("Error: --port requires a number");
        process.exit(1);
      }
      port = parseInt(portArg, 10);
      if (isNaN(port)) {
        console.error("Error: Invalid port number");
        process.exit(1);
      }
    } else if (arg === "--no-open") {
      autoOpen = false;
    } else if (arg && !arg.startsWith("-")) {
      filePath = arg;
    }
  }

  if (!filePath) {
    console.error("Error: No file specified");
    printHelp();
    process.exit(1);
  }

  // Resolve and validate file
  const absolutePath = resolve(filePath);
  const file = Bun.file(absolutePath);
  const exists = await file.exists();

  if (!exists) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Start server
  const server = startServer(absolutePath, port);
  const url = `http://localhost:${server.port}`;

  console.log(`
  Viewing: ${absolutePath}
  Server:  ${url}

  Press Ctrl+C to stop
`);

  // Open browser
  if (autoOpen) {
    const opener =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
        ? "start"
        : "xdg-open";

    Bun.spawn([opener, url], { stdio: ["ignore", "ignore", "ignore"] });
  }
}

main();
