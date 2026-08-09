import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

const envFile = ".env.local";
if (existsSync(envFile)) loadEnvFile(envFile);

const required = [
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_TIKTOK_PIXEL_ID", "TIKTOK_EVENTS_API_TOKEN",
  "OPENAI_API_KEY", "OPENAI_MODEL",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID",
  "STRIPE_MONTHLY_PRODUCT_ID", "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_SIX_MONTH_PRODUCT_ID", "STRIPE_SIX_MONTH_PRICE_ID",
  "STRIPE_PROMOTIONAL_SIX_MONTH_DISCOUNT_PRODUCT_ID", "STRIPE_PROMOTIONAL_SIX_MONTH_DISCOUNT_PRICE_ID",
  "STRIPE_PROMOTIONAL_SIX_MONTH_RETENTION_PRODUCT_ID", "STRIPE_PROMOTIONAL_SIX_MONTH_RETENTION_PRICE_ID",
  "NEXT_PUBLIC_REVENUECAT_WEB_API_KEY", "REVENUECAT_STRIPE_APP_PUBLIC_API_KEY",
  "REVENUECAT_SECRET_API_KEY", "REVENUECAT_PRO_ENTITLEMENT_ID",
  "REVENUECAT_WEBHOOK_AUTH", "REVENUECAT_WEBHOOK_SIGNING_SECRET",
];
const errors = [];
for (const name of required) {
  const value = process.env[name]?.trim() || "";
  if (!value) errors.push(`${name} is missing.`);
  else if (/replace[_-]?me|placeholder|your[_-]/i.test(value)) errors.push(`${name} contains a placeholder.`);
}

check("NEXT_PUBLIC_SUPABASE_URL", /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i);
check("STRIPE_SECRET_KEY", /^(?:sk|rk)_live_[A-Za-z0-9_]+$/);
check("STRIPE_WEBHOOK_SECRET", /^whsec_[A-Za-z0-9_]+$/);
check("STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID", /^bpc_[A-Za-z0-9_]+$/);
for (const name of required.filter((item) => item.endsWith("_PRODUCT_ID"))) check(name, /^prod_[A-Za-z0-9]+$/);
for (const name of required.filter((item) => item.endsWith("_PRICE_ID"))) check(name, /^price_[A-Za-z0-9]+$/);

if (existsSync(envFile)) {
  const counts = new Map();
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);
    if (match) counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  }
  for (const [name, count] of counts) if (count > 1) errors.push(`${name} is defined ${count} times.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Production environment verified.");

function check(name, pattern) {
  const value = process.env[name]?.trim();
  if (value && !pattern.test(value)) errors.push(`${name} has an invalid production format.`);
}
