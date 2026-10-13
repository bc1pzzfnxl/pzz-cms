/**
 * Auth recovery. Deletes Better Auth rows so the owner can register a new
 * passkey through `/admin/setup`. Run against the owner's Cloudflare account.
 *
 *   bun scripts/auth-reset.ts [--local] [--config wrangler.deploy.jsonc]
 */
import { $ } from "bun";

const local = process.argv.includes("--local");
const configIndex = process.argv.indexOf("--config");
const config = configIndex >= 0 ? process.argv[configIndex + 1] : "wrangler.jsonc";
const target = local ? "--local" : "--remote";

const sql = [
  "DELETE FROM passkey;",
  "DELETE FROM session;",
  "DELETE FROM account;",
  "DELETE FROM user;",
].join(" ");

console.log(`Resetting auth on DB (${local ? "local" : "remote"}) with ${config}...`);
await $`bunx wrangler d1 execute DB ${target} --config ${config} --command ${sql}`;
console.log("Auth reset. Register a new passkey at /admin/setup?token=<SETUP_TOKEN>.");
