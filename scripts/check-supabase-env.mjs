#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = resolve(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(envLocal);

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const placeholder =
  url.includes("YOUR_PROJECT") ||
  key.includes("your_anon") ||
  key === "your_anon_key_here";

console.log("Project root:", root);
console.log(".env.local:", existsSync(envLocal) ? "found" : "MISSING — copy .env.example to .env.local");
console.log("URL set:", Boolean(url) && !url.includes("YOUR_PROJECT"));
console.log("Anon key set:", Boolean(key) && !key.includes("your_anon"));

if (!url || !key || placeholder) {
  console.log("\nFix: edit .env.local with values from Supabase → Project Settings → API");
  console.log("Then restart: npm run dev");
  process.exit(1);
}

console.log("\nSupabase env looks configured.");
process.exit(0);
