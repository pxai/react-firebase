#!/usr/bin/env node
// Starts both dev servers: the React site and the Phaser game.
//
// The game is a separate Vite project. The site's dev server proxies /game/*
// to the game's dev server (see vite.config.js), so editing game/src/* shows
// up immediately instead of needing `npm run build:game` first.
//
// Deliberately dependency-free: the repo carries both a package-lock.json and
// a yarn.lock, so adding a runner like `concurrently` would have to be added
// to both to stay consistent.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const SITE_PORT = process.env.PORT || 5173;

// The game is a separate npm project; without its dependencies the proxy
// target never comes up and the iframe just 502s.
if (!existsSync(new URL('../game/node_modules', import.meta.url))) {
  console.error(
    "game/node_modules is missing — the game's dev server cannot start.\n" +
    'Run:  npm --prefix game ci\n'
  );
  process.exit(1);
}

const targets = [
  {
    name: 'game',
    colour: '\x1b[35m', // magenta
    command: 'npm',
    args: ['--prefix', 'game', 'run', 'start'],
  },
  {
    name: 'site',
    colour: '\x1b[36m', // cyan
    command: 'npx',
    args: ['vite', '--port', String(SITE_PORT)],
  },
];

const RESET = '\x1b[0m';
const children = [];
let shuttingDown = false;

const prefixLines = (target, chunk) =>
  chunk
    .toString()
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => `${target.colour}[${target.name}]${RESET} ${line}`)
    .join('\n');

const shutdown = (code) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  process.exit(code);
};

for (const target of targets) {
  const child = spawn(target.command, target.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', (chunk) => {
    const out = prefixLines(target, chunk);
    if (out) console.log(out);
  });
  child.stderr.on('data', (chunk) => {
    const out = prefixLines(target, chunk);
    if (out) console.error(out);
  });

  // If either server dies, stop the other one too: a half-running pair just
  // produces confusing 502s from the /game proxy.
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(
        `${target.colour}[${target.name}]${RESET} exited (${signal || code}) — stopping the other server too.`
      );
    }
    shutdown(code === null ? 1 : code);
  });

  child.on('error', (error) => {
    console.error(`${target.colour}[${target.name}]${RESET} failed to start: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

console.log(`\nSite:   http://localhost:${SITE_PORT}/`);
console.log(`Editor: http://localhost:${SITE_PORT}/build`);
console.log('Game is proxied at /game/ from its own dev server.\n');
