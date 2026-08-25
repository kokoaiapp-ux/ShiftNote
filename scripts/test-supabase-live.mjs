import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.trimStart().startsWith("#") && line.includes("=")).map((line) => { const at = line.indexOf("="); return [line.slice(0, at).trim(), line.slice(at + 1).trim()]; }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anon && service, "Supabase URL, publishable key, and service role key are required");
const ids = { one: crypto.randomUUID(), two: crypto.randomUUID(), conversation: crypto.randomUUID(), userMessage: crypto.randomUUID(), assistantMessage: crypto.randomUUID(), favorite: crypto.randomUUID(), template: crypto.randomUUID() };
const password = `DbTest!${crypto.randomUUID()}`;
const createdUsers = [];

async function call(path, { key = anon, token = key, method = "GET", body, expected = [200, 201, 204] } = {}) {
  const response = await fetch(`${url}${path}`, { method, headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!expected.includes(response.status)) throw new Error(`${method} ${path} returned ${response.status}: ${payload?.message || payload?.error_description || "request failed"}`);
  return { status: response.status, data: payload };
}
async function createUser(id, label) { const email = `codex-db-${label}-${crypto.randomUUID()}@example.com`; await call("/auth/v1/admin/users", { key: service, token: service, method: "POST", body: { id, email, password, email_confirm: true, user_metadata: { temporary_database_test: true } } }); createdUsers.push(id); return email; }
async function session(email) { return (await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } })).data.access_token; }
async function rows(path, token, key = anon) { return (await call(`/rest/v1/${path}`, { key, token })).data; }

try {
  const emailOne = await createUser(ids.one, "one");
  const emailTwo = await createUser(ids.two, "two");
  const tokenOne = await session(emailOne);
  const tokenTwo = await session(emailTwo);
  assert.equal((await rows(`profiles?auth_user_id=eq.${ids.one}`, tokenOne)).length, 1, "profile trigger");
  assert.equal((await rows(`onboarding_answers?user_id=eq.${ids.one}`, tokenOne)).length, 1, "onboarding trigger");
  assert.equal((await rows(`user_preferences?user_id=eq.${ids.one}`, tokenOne)).length, 1, "preferences trigger");
  await call("/rest/v1/rpc/complete_onboarding", { token: tokenOne, method: "POST", body: { payload: { profession: "Nurse", workplace: "Hospital", experience: "5-10 years", emr: "Epic", documentation: "Progress notes", discovery_source: "friend", preferred_default_mode: "nurse" } } });
  const completedOnboarding = await rows(`onboarding_answers?user_id=eq.${ids.one}&select=discovery_source,answers`, tokenOne);
  assert.equal(completedOnboarding[0].discovery_source, "friend", "discovery source saved to onboarding column");
  assert.equal(completedOnboarding[0].answers.discovery_source, "friend", "discovery source retained in onboarding payload");
  const completedProfile = await rows(`profiles?auth_user_id=eq.${ids.one}&select=profession,emr,place_of_work,default_mode`, tokenOne);
  assert.deepEqual(completedProfile[0], { profession: "Nurse", emr: "Epic", place_of_work: "Hospital", default_mode: "nurse" }, "onboarding summary saved to profile");
  await call("/rest/v1/conversations", { token: tokenOne, method: "POST", body: { id: ids.conversation, user_id: ids.one, title: "Skin Assessment", selected_mode: "nurse", selected_template: "nurse-skin-assessment" } });
  await call("/rest/v1/messages", { token: tokenOne, method: "POST", body: [{ id: ids.userMessage, conversation_id: ids.conversation, user_id: ids.one, role: "user", message: "Observed clinical facts" }, { id: ids.assistantMessage, conversation_id: ids.conversation, user_id: ids.one, role: "assistant", message: "Generated clinical documentation" }] });
  await call(`/rest/v1/messages?id=eq.${ids.assistantMessage}`, { token: tokenOne, method: "PATCH", body: { edited_message: "Edited clinical documentation", copied: true } });
  await call("/rest/v1/favorites", { token: tokenOne, method: "POST", body: { id: ids.favorite, user_id: ids.one, message_id: ids.assistantMessage } });
  await call("/rest/v1/custom_templates", { token: tokenOne, method: "POST", body: { id: ids.template, user_id: ids.one, mode: "nurse", template_name: "Test Template", template_content: "Template content" } });
  await call(`/rest/v1/user_preferences?user_id=eq.${ids.one}`, { token: tokenOne, method: "PATCH", body: { theme: "dark", last_selected_mode: "nurse", last_selected_template: "nurse-skin-assessment" } });
  assert.equal((await rows(`conversations?title=fts.Skin`, tokenOne)).length, 1, "history full-text search");
  assert.equal((await rows(`messages?conversation_id=eq.${ids.conversation}`, tokenOne)).length, 2, "multi-message conversation CRUD");
  assert.equal((await rows(`favorites?id=eq.${ids.favorite}`, tokenOne)).length, 1, "favorite CRUD");
  assert.equal((await rows(`custom_templates?id=eq.${ids.template}`, tokenOne)).length, 1, "template CRUD");
  assert.equal((await rows(`conversations?id=eq.${ids.conversation}`, tokenTwo)).length, 0, "cross-user reads hidden by RLS");
  const deniedInsert = await call("/rest/v1/conversations", { token: tokenTwo, method: "POST", body: { user_id: ids.one, title: "Denied", selected_mode: "nurse", selected_template: "custom-template" }, expected: [401, 403] });
  assert.ok([401, 403].includes(deniedInsert.status), "cross-user insert denied");
  await call("/rest/v1/subscription_cache", { key: service, token: service, method: "POST", body: { user_id: ids.one, entitlement: "pro", subscription_status: "active" } });
  assert.equal((await rows(`subscription_cache?user_id=eq.${ids.one}`, tokenOne)).length, 1, "owner can read cache");
  await call(`/rest/v1/subscription_cache?user_id=eq.${ids.one}`, { token: tokenOne, method: "PATCH", body: { subscription_status: "expired" }, expected: [200, 204, 401, 403] });
  const authoritativeCache = await rows(`subscription_cache?user_id=eq.${ids.one}`, service, service);
  assert.equal(authoritativeCache[0].subscription_status, "active", "client cache mutation has no effect");
  await call(`/auth/v1/admin/users/${ids.one}`, { key: service, token: service, method: "DELETE" });
  createdUsers.splice(createdUsers.indexOf(ids.one), 1);
  for (const [table, column] of [["profiles", "auth_user_id"], ["onboarding_answers", "user_id"], ["conversations", "user_id"], ["messages", "user_id"], ["favorites", "user_id"], ["custom_templates", "user_id"], ["user_preferences", "user_id"], ["subscription_cache", "user_id"]]) {
    assert.equal((await rows(`${table}?${column}=eq.${ids.one}`, service, service)).length, 0, `${table} cascade deletion`);
  }
  console.log("Live Supabase triggers, CRUD, search, RLS isolation, cache protection, and cascades passed.");
} finally {
  for (const id of createdUsers) await call(`/auth/v1/admin/users/${id}`, { key: service, token: service, method: "DELETE", expected: [200, 204, 404] }).catch(() => undefined);
}