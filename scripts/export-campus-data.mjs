// Exports the APU campus data (single source of truth: src/web/data.js) to JSON
// so the Python agent tools read the same records as the web portal.
// Usage: node scripts/export-campus-data.mjs [--check]   (--check exits 1 if the JSON is stale)
import { readFileSync, writeFileSync } from "node:fs";
import { campus, links, offices, topics, checklist, events } from "../src/web/data.js";

const target = new URL("../src/student_agent/data/campus.json", import.meta.url);
const json = JSON.stringify({ campus, links, offices, topics, checklist, events }, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(target, "utf8").replace(/\r\n/g, "\n"); } catch { /* missing = stale */ }
  if (current !== json) {
    console.error("campus.json is out of date. Run: node scripts/export-campus-data.mjs");
    process.exit(1);
  }
  console.log("campus.json is up to date");
} else {
  writeFileSync(target, json);
  console.log("wrote " + target.pathname);
}
