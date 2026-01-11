#!/usr/bin/env bun
import { resolve } from "path";
import { startServer } from "./server";
import { discoverMarkdownFiles } from "./lib/file-discovery";

const args = process.argv.slice(2);

const DEFAULT_PORT = 3000;

function printHelp() {
  console.log(`
lmv - Local Markdown Viewer

Usage:
  lmv <file.md>                         Open a markdown file
  lmv <file1.md> <file2.md> ...         Open multiple markdown files
  lmv <dir>                             Discover .md files in a directory
  lmv 'docs/**/*.md'                    Open files via glob pattern
  lmv <file.md> -p 8080                 Use custom port

Options:
  -p, --port <number>     Port to run server on (default: ${DEFAULT_PORT})
  -h, --help              Show this help message
  --no-open               Don't auto-open browser
  --recursive             Recurse into directories (directory inputs only)
  --hidden                Include hidden files/folders (directory inputs only)

Environment:
  GITHUB_TOKEN            Enable "Share as Gist" feature

Examples:
  lmv README.md
  lmv docs/guide.md -p 8080
  lmv docs/ --recursive
  lmv README.md docs/guide.md
  lmv 'docs/**/*.md'
  GITHUB_TOKEN=ghp_xxx lmv README.md
`);
}

async function isServerRunning(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

function openBrowser(url: string) {
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";

  Bun.spawn([opener, url], { stdio: ["ignore", "ignore", "ignore"] });
}

async function main() {
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  // Parse arguments
  const inputs: string[] = [];
  let port = DEFAULT_PORT;
  let autoOpen = true;
  let recursive = false;
  let includeHidden = false;

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
    } else if (arg === "--recursive") {
      recursive = true;
    } else if (arg === "--hidden") {
      includeHidden = true;
    } else if (arg && !arg.startsWith("-")) {
      inputs.push(arg);
    } else {
      console.error(`Error: Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (inputs.length === 0) {
    console.error("Error: No inputs specified");
    printHelp();
    process.exit(1);
  }

  let discovered: string[];
  try {
    discovered = await discoverMarkdownFiles(inputs, {
      cwd: process.cwd(),
      recursive,
      includeHidden,
    });
  } catch (error) {
    console.error(
      `Error: ${(error as Error).message || "Failed to discover markdown files"}`
    );
    process.exit(1);
  }

  if (discovered.length === 0) {
    console.error("Error: No markdown files found");
    process.exit(1);
  }

  // Check if server already running
  const serverRunning = await isServerRunning(port);

  if (serverRunning) {
    console.log(`
  Server:  http://localhost:${port} (already running)
  Viewing: ${discovered.length} file${discovered.length === 1 ? "" : "s"}
`);

    if (autoOpen) {
      openBrowser(`http://localhost:${port}`);
    }
    return;
  }

  // Start server
  const server = startServer(
    {
      cwd: process.cwd(),
      files: discovered,
      inputs,
      recursive,
      includeHidden,
    },
    port
  );
  const url = `http://localhost:${server.port}`;

  console.log(`
  Viewing: ${discovered.length} file${discovered.length === 1 ? "" : "s"}
  Server:  ${url}

  Press Ctrl+C to stop
`);

  // Open browser
  if (autoOpen) {
    openBrowser(url);
  }
}

main();
