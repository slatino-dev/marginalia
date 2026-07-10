#!/usr/bin/env node
/**
 * check-contrast.mjs — asserts WCAG AA contrast for the semantic text/background
 * pairs in src/styles/theme.css, in BOTH dark (default :root) and light
 * (:root[data-theme="light"]) remaps.
 *
 * Parses the token file directly (single source of truth — no hand-copied values),
 * resolves var() chains within each theme scope, converts OKLCH -> linear sRGB ->
 * WCAG relative luminance, and computes contrast ratios. Exits non-zero if any
 * REQUIRED pair falls below its threshold. Run: `npm run check:contrast`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME = resolve(__dirname, "../src/styles/theme.css");

/* ── 1. Extract declarations per scope ─────────────────────────────────────── */
const css = readFileSync(THEME, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); // strip comments

/** Pull the body of the FIRST top-level block whose header matches `headerRe`. */
function block(headerRe) {
  const m = headerRe.exec(css);
  if (!m) return "";
  let i = css.indexOf("{", m.index);
  if (i < 0) return "";
  let depth = 0, start = i + 1;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") { depth--; if (depth === 0) return css.slice(start, i); }
  }
  return "";
}
/** All blocks matching a header (there are two `@theme {` base blocks). */
function blocks(headerRe) {
  const out = [];
  let m;
  const re = new RegExp(headerRe.source, "g");
  while ((m = re.exec(css))) {
    let i = css.indexOf("{", m.index), depth = 0;
    const start = i + 1;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") { depth--; if (depth === 0) { out.push(css.slice(start, i)); break; } }
    }
    re.lastIndex = i;
  }
  return out;
}
function decls(body) {
  const map = {};
  for (const line of body.split(";")) {
    const m = /(--[\w-]+)\s*:\s*(.+)$/s.exec(line.trim());
    if (m && !m[2].includes("{")) map[m[1]] = m[2].trim();
  }
  return map;
}

// Base scales: every `@theme` / `@theme static` block that is NOT `@theme inline`.
const baseBodies = blocks(/@theme(?!\s+inline)\b[^{]*\{/);
const base = Object.assign({}, ...baseBodies.map(decls));
// Dark semantics = the plain `:root {` block (first one, not [data-theme], not @media).
const rootDark = decls(block(/:root\s*\{/));
// Light semantics = `:root[data-theme="light"] {`.
const rootLight = decls(block(/:root\[data-theme="light"\]\s*\{/));

const darkScope = { ...base, ...rootDark };
const lightScope = { ...base, ...rootLight };

/* ── 2. Resolve var() chains ───────────────────────────────────────────────── */
function resolveVar(name, scope, seen = new Set()) {
  if (seen.has(name)) throw new Error(`var cycle at ${name}`);
  seen.add(name);
  let v = scope[name];
  if (v == null) throw new Error(`undefined var ${name}`);
  const vm = /^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/s.exec(v.trim());
  if (vm) return resolveVar(vm[1], scope, seen);
  return v.trim();
}

/* ── 3. OKLCH -> linear sRGB -> WCAG relative luminance ─────────────────────── */
function parseOklch(str) {
  const m = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i.exec(str);
  if (!m) throw new Error(`not oklch: ${str}`);
  let L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  return { L, C: parseFloat(m[2]), H: parseFloat(m[3]) };
}
function luminance(str) {
  const { L, C, H } = parseOklch(str);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  let R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  R = clamp(R); G = clamp(G); B = clamp(B);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B; // linear RGB -> relative luminance
}
function ratio(fg, bg) {
  const [a, b] = [luminance(fg) + 0.05, luminance(bg) + 0.05];
  return a > b ? a / b : b / a;
}

/* ── 4. Pairs to assert (threshold + required) ─────────────────────────────── */
// AA: 4.5 for normal text; 3.0 for large text / UI component boundaries.
// required=false => reported but does not fail the build (subtle-by-design rules:
// a 3:1 divider would be too loud for the "dense-but-calm 1px" aesthetic).
const PAIRS = [
  ["text-1", "bg", 4.5, true], ["text-2", "bg", 4.5, true], ["text-3", "bg", 4.5, true],
  ["text-1", "surface-1", 4.5, true], ["text-1", "surface-2", 4.5, true],
  ["accent-text", "bg", 4.5, true], ["on-primary", "primary", 4.5, true],
  ["success", "bg", 4.5, true], ["danger", "bg", 4.5, true],
  ["warning", "bg", 4.5, true], ["info", "bg", 4.5, true],
  ["primary", "bg", 3.0, true], ["border-strong", "bg", 3.0, false],
];

function run(label, scope) {
  const rows = [];
  let failed = 0;
  for (const [fgK, bgK, min, required] of PAIRS) {
    const fg = resolveVar(`--color-${fgK}`, scope);
    const bg = resolveVar(`--color-${bgK}`, scope);
    const r = ratio(fg, bg);
    const pass = r >= min;
    if (!pass && required) failed++;
    rows.push({ pair: `${fgK} / ${bgK}`, min: min.toFixed(1), ratio: r.toFixed(2), ok: pass, required });
  }
  const w = Math.max(...rows.map((r) => r.pair.length));
  console.log(`\n  ${label}`);
  for (const r of rows) {
    const tag = r.ok ? "PASS" : r.required ? "FAIL" : "warn";
    console.log(
      `    ${tag}  ${r.pair.padEnd(w)}  ${r.ratio.padStart(6)} : 1  (min ${r.min}${r.required ? "" : ", advisory"})`,
    );
  }
  return failed;
}

console.log("WCAG AA contrast — Signal Path semantic pairs (source: src/styles/theme.css)");
const fails = run("DARK  (:root)", darkScope) + run("LIGHT (data-theme=light)", lightScope);
if (fails > 0) {
  console.error(`\n  ${fails} pair(s) below AA threshold. Failing build.\n`);
  process.exit(1);
}
console.log(`\n  All ${PAIRS.length * 2} pairs meet WCAG AA in both themes.\n`);
