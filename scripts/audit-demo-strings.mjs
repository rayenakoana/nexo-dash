#!/usr/bin/env node
// Regression guard for the DEMO sanitization: fails the build if any of the
// real-client brand strings that should never appear in this repo again show
// up in source/seed files. See supabase/seed_marketing_demo.sql for context.
//
// Usage: npm run audit:demo

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Whole-word / literal banned strings. Case-sensitive where noted.
const BANNED = [
  { pattern: /costurando\s*sucesso/i, label: "Costurando Sucesso" },
  { pattern: /costurandosucesso/i, label: "costurandosucesso (domain)" },
  { pattern: /eduardo\s*cristian/i, label: "Eduardo Cristian" },
  { pattern: /eduardocristianoriginal/i, label: "eduardocristianoriginal" },
  { pattern: /supplytex/i, label: "SUPPLYTEX" },
  { pattern: /\bsegredos\b/i, label: "Segredos" },
  { pattern: /paraguai\s*nov\/?26/i, label: "PARAGUAI NOV/26" },
  { pattern: /\bC\$\s*NEWS\b/, label: "C$ NEWS" },
  { pattern: /\bCS\s*NEWS\b/, label: "CS NEWS" },
  { pattern: /\buniforce\b/i, label: "Uniforce" },
  { pattern: /modaprimeoficial/i, label: "modaprimeoficial (old fictitious IG handle)" },
  { pattern: /studioconfeccao/i, label: "studioconfeccao (old fictitious IG handle)" },
  { pattern: /teste\s*motor\s*de\s*disparo/i, label: "Teste Motor de Disparo (dev/test campaign)" },
  // Standalone "CS"/"C$" used as a brand abbreviation, e.g. "CS Digital:", "(CS)".
  { pattern: /\bCS Digital\b/, label: "CS Digital (old brand abbreviation)" },
  { pattern: /\(CS\)/, label: "(CS) brand abbreviation" },
];

// Files/dirs to scan. Keep this list small and targeted (source + seed files),
// not node_modules/build output.
const INCLUDE_GLOBS = ["src", "supabase"];
const EXCLUDE_DIRS = ["node_modules", "dist", ".git", "coverage"];
const EXCLUDE_EXT = [".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".lock"];

function listFiles(dir) {
  let out = [];
  let entries;
  try {
    entries = execSync(`find "${dir}" -type f`, { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return out;
  }
  for (const f of entries) {
    if (EXCLUDE_DIRS.some((d) => f.includes(`/${d}/`))) continue;
    if (EXCLUDE_EXT.some((ext) => f.endsWith(ext))) continue;
    out.push(f);
  }
  return out;
}

let hits = [];
for (const dir of INCLUDE_GLOBS) {
  for (const file of listFiles(dir)) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      // Allow this script itself and explicit "must not contain" comments in
      // the seed file that reference the banned string to explain a DELETE.
      if (file.endsWith("audit-demo-strings.mjs")) return;
      for (const { pattern, label } of BANNED) {
        if (pattern.test(line)) {
          hits.push({ file, line: idx + 1, label, text: line.trim().slice(0, 160) });
        }
      }
    });
  }
}

// Known, reviewed exceptions: the original migration that first introduced
// the real funnel names, kept immutable for migration history; a follow-up
// migration renames the stored value away from it.
const ALLOWLIST_FILES = [/migrations\/20260804133530_funil_supplytex_e_visibilidade\.sql$/];

// Lines that are themselves cleanup code/comments (DELETE/UPDATE/ILIKE/LIKE
// targeting a banned string, or a comment explaining such a cleanup) are not
// a leak — the string appears only as a scrub target. Everything else still
// gets flagged, including a re-introduction of the string as brand-facing
// content in the same files.
const CLEANUP_LINE = /(DELETE FROM|UPDATE\s|ILIKE|LIKE '|=\s*'[^']*'|--.*\.sql|--.*\(ex\.)/i;

hits = hits.filter((h) => {
  if (ALLOWLIST_FILES.some((re) => re.test(h.file))) return false;
  if (CLEANUP_LINE.test(h.text)) return false;
  return true;
});

if (hits.length > 0) {
  console.error(`\naudit:demo — found ${hits.length} banned real-company reference(s):\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  [${h.label}]  ${h.text}`);
  }
  console.error("\nRemove or replace these before merging.\n");
  process.exit(1);
}

console.log("audit:demo — OK, no banned real-company strings found.");
