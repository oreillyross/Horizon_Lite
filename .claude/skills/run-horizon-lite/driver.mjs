#!/usr/bin/env node
// Minimal Playwright REPL driver for Horizon Lite.
// Used when chromium-cli is not available in the container.
// Reads newline-delimited commands from stdin, drives a headless Chromium
// page against the running dev server, writes screenshots to /tmp/shots.
//
// Commands:
//   nav <path>                    goto http://localhost:5000<path>
//   fill <label> <text...>        fill an input found via getByLabel(label)
//   click <role> <name...>        click getByRole(role, { name })
//   click-text <text...>          click getByText(text) (first match)
//   wait-for <text...>            wait until getByText(text) is visible
//   wait-url <regex>              wait until page URL matches regex
//   screenshot <name>             save /tmp/shots/<name>.png
//   console                       print buffered console/page errors
//   url                           print current page URL
//   quit                          close browser and exit

import { chromium } from "playwright";
import readline from "node:readline";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const consoleErrors = [];

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  executablePath: "/opt/pw-browsers/chromium",
});
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (err) => consoleErrors.push(`[pageerror] ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(`[console] ${msg.text()}`);
});

function reply(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const rl = readline.createInterface({ input: process.stdin });

for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const [cmd, ...rest] = trimmed.split(" ");
  const arg = rest.join(" ");
  try {
    switch (cmd) {
      case "nav":
        await page.goto(BASE_URL + arg, { waitUntil: "domcontentloaded" });
        reply({ ok: true, url: page.url() });
        break;
      case "fill": {
        const [label, ...text] = rest;
        await page.getByLabel(label).fill(text.join(" "));
        reply({ ok: true });
        break;
      }
      case "click": {
        const [role, ...name] = rest;
        await page.getByRole(role, { name: name.join(" ") }).click();
        reply({ ok: true });
        break;
      }
      case "click-text":
        await page.getByText(arg).first().click();
        reply({ ok: true });
        break;
      case "wait-for":
        await page.getByText(arg).first().waitFor({ state: "visible", timeout: 10_000 });
        reply({ ok: true });
        break;
      case "wait-url":
        await page.waitForURL(new RegExp(arg), { timeout: 10_000 });
        reply({ ok: true, url: page.url() });
        break;
      case "screenshot": {
        const name = arg || "shot";
        const path = `/tmp/shots/${name}.png`;
        await page.screenshot({ path });
        reply({ ok: true, path });
        break;
      }
      case "console":
        reply({ ok: true, errors: consoleErrors });
        break;
      case "url":
        reply({ ok: true, url: page.url() });
        break;
      case "quit":
        await browser.close();
        process.exit(0);
        break;
      default:
        reply({ ok: false, error: `unknown command: ${cmd}` });
    }
  } catch (err) {
    reply({ ok: false, error: String(err.message || err) });
  }
}

await browser.close();
