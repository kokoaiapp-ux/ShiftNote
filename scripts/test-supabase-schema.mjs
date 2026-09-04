import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const db = new PGlite({ extensions: { pgcrypto } });
const migration = ["202608040001_initial_shift_note.sql", "202608050001_optimize_rls_indexes.sql", "202608050002_profile_onboarding_fields.sql", "202608080001_subscription_access_lifecycle.sql", "202608080002_founder_role.sql", "202608150001_onboarding_discovery_source.sql", "202608260001_profile_discovery_source.sql"].map((name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
const migrationSql = (await Promise.all(migration)).join("\n");
const userOne = "11111111-1111-4111-8111-111111111111";
const userTwo = "22222222-2222-4222-8222-222222222222";
const conversation = "33333333-3333-4333-8333-333333333333";
const message = "44444444-4444-4444-8444-444444444444";

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, last_sign_in_at timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`);
await db.exec(migrationSql);

await db.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3::jsonb),($4,$5,$6::jsonb)", [userOne, "one@example.test", JSON.stringify({ display_name: "User One" }), userTwo, "kokoaiapp@gmail.com", JSON.stringify({ display_name: "Founder" })]);
let result = await db.query("select count(*)::int as count from public.profiles");
assert.equal(result.rows[0].count, 2, "new-user trigger creates profiles");
result = await db.query("select count(*)::int as count from public.user_preferences");
assert.equal(result.rows[0].count, 2, "new-user trigger creates preferences");
result = await db.query("select role from public.profiles where auth_user_id=$1", [userTwo]);
assert.deepEqual(result.rows[0], { role: "founder" }, "founder email is assigned the founder role by the database");
let denied = false;

await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
await db.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify({ profession: "Nurse", workplace: "Hospital", experience: "5-10 years", emr: "Epic", documentation: "Progress notes", discovery_source: "friend", preferred_default_mode: "nurse" })]);
result = await db.query("select profession,emr,place_of_work,default_mode,discovery_source from public.profiles");
assert.equal(result.rows.length, 1, "RLS exposes only the signed-in user's profile");
assert.deepEqual(result.rows[0], { profession: "Nurse", emr: "Epic", place_of_work: "Hospital", default_mode: "nurse", discovery_source: "friend" });
const discoverySources = ["google_search", "facebook", "instagram", "tiktok", "reddit", "flyer", "friend", "other"];
for (const discoverySource of discoverySources) {
  await db.query("select public.complete_onboarding($1::jsonb)", [JSON.stringify({ profession: "Nurse", workplace: "Hospital", experience: "5-10 years", emr: "Epic", documentation: "Progress notes", discovery_source: discoverySource, preferred_default_mode: "nurse" })]);
  result = await db.query("select discovery_source from public.profiles where auth_user_id=$1", [userOne]);
  assert.deepEqual(result.rows[0], { discovery_source: discoverySource }, `${discoverySource} persists to profile`);
}
await db.exec("reset role; reset request.jwt.claim.sub;");
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
result = await db.query("select discovery_source from public.profiles where auth_user_id=$1", [userOne]);
assert.deepEqual(result.rows[0], { discovery_source: "other" }, "discovery source survives a simulated logout/login and profile reload");
denied = false;
try { await db.query("update public.profiles set role='founder' where auth_user_id=$1", [userOne]); } catch { denied = true; }
assert.equal(denied, true, "authenticated users cannot promote their own profile role");
result = await db.query("select onboarding_completed,emr_platform,discovery_source,answers ->> 'discovery_source' as answer_discovery_source from public.onboarding_answers");
assert.deepEqual(result.rows[0], { onboarding_completed: true, emr_platform: "Epic", discovery_source: "other", answer_discovery_source: "other" });
await db.query("insert into public.conversations (id,user_id,title,selected_mode,selected_template) values ($1,$2,$3,$4,$5)", [conversation, userOne, "Skin Assessment", "nurse", "nurse-skin-assessment"]);
await db.query("insert into public.messages (id,conversation_id,user_id,role,message) values ($1,$2,$3,'assistant',$4)", [message, conversation, userOne, "Clinical documentation"]);
await db.query("update public.messages set edited_message=$1 where id=$2", ["Edited clinical documentation", message]);
await db.query("insert into public.favorites (user_id,message_id) values ($1,$2)", [userOne, message]);
await db.query("insert into public.custom_templates (user_id,mode,template_name,template_content) values ($1,$2,$3,$4)", [userOne, "nurse", "My Template", "Template body"]);
await db.query("update public.user_preferences set last_selected_mode='nurse', theme='dark' where user_id=$1", [userOne]);
result = await db.query("select count(*)::int as count from public.messages");
assert.equal(result.rows[0].count, 1, "message CRUD succeeds for owner");
denied = false;
try { await db.query("insert into public.conversations (user_id,title,selected_mode,selected_template) values ($1,'Denied','nurse','custom-template')", [userTwo]); } catch { denied = true; }
assert.equal(denied, true, "RLS denies writes for another user");
await db.exec("reset role; reset request.jwt.claim.sub;");
await db.exec("reset role; reset request.jwt.claim.sub;");
await db.query("insert into public.subscription_lifecycle (user_id,has_subscribed_before,first_paid_at) values ($1,true,now())", [userOne]);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
result = await db.query("select has_subscribed_before from public.subscription_lifecycle");
assert.deepEqual(result.rows, [{ has_subscribed_before: true }], "subscription lifecycle is readable only by its owner");
denied = false;
try { await db.query("update public.subscription_lifecycle set has_subscribed_before=false where user_id=$1", [userOne]); } catch { denied = true; }
assert.equal(denied, true, "client cannot change permanent paid eligibility");
await db.exec("reset role; reset request.jwt.claim.sub;");
await db.query("delete from auth.users where id=$1", [userOne]);
for (const table of ["profiles", "onboarding_answers", "conversations", "messages", "favorites", "custom_templates", "user_preferences", "subscription_lifecycle"]) {
  result = await db.query(`select count(*)::int as count from public.${table} where ${table === "profiles" ? "auth_user_id" : "user_id"}=$1`, [userOne]);
  assert.equal(result.rows[0].count, 0, `${table} cascades on account deletion`);
}
await db.close();
console.log("Supabase schema migration, triggers, RLS, CRUD, and cascades passed.");
