# Enterprise live verification

## Release status

The Enterprise migration is applied to the ShiftNote Supabase project. The remaining email checks passed on September 14, 2026: direct SMTP authentication and sending, actual Enterprise approval/setup email, and the actual internal owner forgot-password email handler. This report records pre-release evidence; the release handoff reports the resulting commit and Vercel deployment status.

## Passed verification

| Check | Result and scope |
| --- | --- |
| Initial owner | The exact existing, verified support@shiftnote.care Auth user has shiftnote_owner. Password unchanged. |
| Owner /admin access | Passed using the local production artifact and an authenticated session for the real owner against live Supabase. |
| Non-admin rejection | Authenticated temporary Enterprise users received internal API 403 and /admin login redirects. |
| Enterprise leads | Public API submissions were persisted in live Supabase. |
| Approval and activation | Real approval API created organizations and hashed setup links. |
| Expiration | Expired live links returned 410; restored test links validated. |
| Single use | Successful setup consumed the link; replay returned 410. |
| Enterprise account creation | Setup created temporary Auth users, memberships, facilities, and departments. |
| Login/logout | Password login succeeded, logout cleared portal sessions, and subsequent reads returned 401. |
| Password reset | Supabase recovery-token callback, password update, new-password login, and old-password rejection passed using temporary accounts. This did not verify delivery of a recovery email. |
| Setup wizard | An isolated browser completed all seven steps against the production artifact and live Supabase, reached the dashboard, and rejected reused links. |
| Facilities/departments CRUD | Create/update API calls and direct authenticated RLS read/delete operations passed. |
| Organization isolation | Two live authenticated organization sessions could access only their own records; foreign reads and inserts were denied. |
| RLS catalog | All 12 Enterprise tables have RLS enabled; anonymous reads and public provisioning RPC execution are denied. |
| Type generation | Live public-schema types generated into types/supabase-live.ts and consumed by EnterpriseDatabase. |
| Cleanup | Zero verification organizations, leads, or profiles remain. Audit entries were retained. |
| Core validation | npm run lint, npm run typecheck, npm run build, 31 route/permission/regression tests, and isolated PostgreSQL Enterprise tests passed. |
| Secret checks | Source and browser bundle checks passed. The already-public support address is exempted only from SMTP username value matching; client environment access, passwords, and tokens remain checked. |

The built-in local Windows preview returned 404 for existing static assets. Browser verification passed using scripts/serve-enterprise-verification.mjs, which serves the same built artifacts with a Windows-safe local static-file handler. No application layout or production routing was changed to address that preview limitation.

The optional --transactional mode in test-enterprise-live-rls.mjs requires write-capable SQL access. This token's SQL queries are read-only, so that optional rollback test could not run. Default read-only catalog tests and independent stateful live API/RLS tests passed.

## Email and release preflight recheck (September 14, 2026)

- Direct SMTP authentication and a real test email passed against mail.privateemail.com:587 with secure=false and requireTLS=true, using the Application Password freshly loaded from .env.local.
- The real approval handler sent a setup email to support@shiftnote.care and persisted email_status=sent in live Supabase. Its temporary organization, lead, and activation link were removed after verification; audit entries were retained. Do not use that verification setup link for a real organization.
- The actual /api/admin/forgot handler returned 200 after the provider accepted the password-reset email to the existing owner. The owner's password was not changed.
- These route tests used the local production artifact and live Supabase. Provider acceptance is verified; mailbox receipt is not independently verified.
- Exactly one SUPABASE_ACCESS_TOKEN definition remains in .env.local.
- Vercel production has one entry each for NEXT_PUBLIC_META_PIXEL_ID, META_CONVERSIONS_API_TOKEN, NEXT_PUBLIC_TIKTOK_PIXEL_ID, and TIKTOK_EVENTS_API_TOKEN. All four are sensitive values, so Vercel deliberately does not export them for local commands. Their absence locally is not a missing-production-variable failure. The real production build must run in Vercel with those secrets available; no dummy values or weakened analytics checks were added.
- The SMTP port was aligned to 587 in local configuration and the existing shared Vercel Preview/Production entry. No password was printed or committed, and no authentication or Enterprise application logic was changed for this recheck.
- Lint, TypeScript, the production build, all 31 existing route/permission/regression tests, and the isolated Enterprise PostgreSQL tests passed again.

## Remaining verification notes

- Package installation reports 24 existing dependency audit findings (1 low, 6 moderate, 16 high, 1 critical). No unrelated dependency migrations were attempted.
- Vercel Ready status and deployed Enterprise smoke checks must be checked after publishing; they are not inferred from the local build.

## Current production smoke checks

The existing homepage, login, signup, and Enterprise marketing pages return 200. Onboarding, dashboard, and billing return their expected unauthenticated 307 login redirects. No tested route returned 500. The new /enterprise/login and /admin/login return 404 on the existing deployment because these changes have not been published.

## Next steps

1. Check the receiving mailbox for the accepted verification emails; the temporary setup link was intentionally removed after testing.
2. Commit the verified source, push origin main, and verify the resulting Vercel deployment, production build, deployed email handlers, and smoke tests.

No SMART on FHIR, EHR connection, Professional subscription behavior, or owner password was changed.
