import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/import-firebase-profiles.mjs path/to/users.json");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const payload = JSON.parse(await readFile(file, "utf8"));
const rows = Array.isArray(payload) ? payload : Object.entries(payload).map(([id, value]) => ({ id, ...value }));
const supabase = createClient(url, key, { auth: { persistSession: false } });
const authByEmail = new Map();
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) if (user.email) authByEmail.set(user.email.toLowerCase(), user.id);
  if (data.users.length < 1000) break;
}
let imported = 0;
for (const row of rows) {
  const legacyId = row.uid || row.id;
  const id = row.email ? authByEmail.get(String(row.email).toLowerCase()) : null;
  if (!id) { console.warn(`Skipping ${legacyId || row.email}: matching Supabase Auth user not found.`); continue; }
  const { error } = await supabase.from("profiles").upsert({ id, legacy_firebase_uid: legacyId || null, email: row.email || null, display_name: row.displayName || null, onboarding: row.onboarding || {}, onboarding_complete: Boolean(row.onboardingComplete), created_at: row.createdAt || new Date().toISOString(), updated_at: row.updatedAt || new Date().toISOString() });
  if (error) throw new Error(`Failed ${id}: ${error.message}`);
  imported += 1;
}
console.log(`Imported ${imported} Firebase profile records into Supabase.`);