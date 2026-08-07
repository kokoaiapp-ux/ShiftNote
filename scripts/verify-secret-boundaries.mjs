import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { loadEnvFile } from "node:process";

const root = process.cwd();
const sourceRoots = ["app", "components", "hooks", "lib"];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const secretEnvironmentNames = [
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REVENUECAT_STRIPE_APP_PUBLIC_API_KEY",
  "REVENUECAT_SECRET_API_KEY",
  "REVENUECAT_WEBHOOK_AUTH",
  "REVENUECAT_WEBHOOK_SIGNING_SECRET",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
];
const secretValueEnvironmentNames = secretEnvironmentNames.filter(
  (name) => name !== "REVENUECAT_STRIPE_APP_PUBLIC_API_KEY",
);
const serverRequestMarkers = ["api.openai.com", "@ai-sdk/openai"];
const credentialPatterns = [
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ["Stripe secret key", /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{16,}\b/g],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const errors = [];

for (const sourceRoot of sourceRoots) {
  for (const file of await filesWithin(join(root, sourceRoot))) {
    if (!sourceExtensions.has(extname(file))) continue;
    const content = await readFile(file, "utf8");
    const projectPath = projectRelative(file);
    const isServerBoundary = projectPath.startsWith("app/api/") && projectPath.endsWith("/route.ts")
      || projectPath.startsWith("lib/server/");
    const isClientModule = /^\s*["']use client["'];/m.test(content);
    const usedSecrets = secretEnvironmentNames.filter((name) => content.includes(name));

    if (/NEXT_PUBLIC_(?:OPENAI|STRIPE_SECRET|SUPABASE_SERVICE_ROLE|REVENUECAT_SECRET|[^\s]*WEBHOOK)/.test(content)) {
      errors.push(`${projectPath}: a secret uses the public client prefix.`);
    }
    if ((isClientModule || !isServerBoundary) && (usedSecrets.length || serverRequestMarkers.some((marker) => content.includes(marker)))) {
      errors.push(`${projectPath}: secret access or a provider request exists outside server-only API code.`);
    }
  }
}

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
for (const trackedFile of trackedFiles) {
  const content = await readFile(join(root, trackedFile), "utf8").catch(() => "");
  scanCredentialPatterns(content, trackedFile);
}

if (process.argv.includes("--git-history")) {
  const refs = execFileSync("git", ["for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes", "refs/tags"], {
    cwd: root,
    encoding: "utf8",
  }).split(/\r?\n/).filter(Boolean);
  const history = execFileSync("git", ["log", "-p", "--no-ext-diff", ...refs], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
  });
  scanCredentialPatterns(history, "Git history");
}

if (process.argv.includes("--bundles")) {
  try { loadEnvFile(join(root, ".env.local")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  const configuredSecretValues = secretValueEnvironmentNames
    .map((name) => process.env[name])
    .filter((value) => value && value.length >= 12);
  for (const directory of [".vercel/output/static", "dist/client"]) {
    for (const file of await filesWithin(join(root, directory), true)) {
      const content = await readFile(file, "utf8").catch(() => "");
      if (secretEnvironmentNames.some((name) => content.includes(name)) || serverRequestMarkers.some((marker) => content.includes(marker))) {
        errors.push(`${projectRelative(file)}: browser output contains a server secret or provider marker.`);
      }
      if (configuredSecretValues.some((secret) => content.includes(secret))) {
        errors.push(`${projectRelative(file)}: browser output contains a configured secret value.`);
      }
    }
  }
}

if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log("Server secret boundaries verified.");

function scanCredentialPatterns(content, location) {
  for (const [category, pattern] of credentialPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) errors.push(`${location}: possible committed ${category}.`);
  }
}
function projectRelative(file) { return relative(root, file).replaceAll("\\", "/"); }
async function filesWithin(directory, missingIsEmpty = false) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (missingIsEmpty && error?.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(path, missingIsEmpty));
    else files.push(path);
  }
  return files;
}