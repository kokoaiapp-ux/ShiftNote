# Enterprise backend and rollout

Enterprise marketing and demo requests remain public. Organization workspaces require a server-verified `enterprise_admins` membership and an Active organization. `/admin` requires a separate `koko_admins` role. Neither role is derived from user-editable metadata or Professional subscription status.

## Schema

Migration: `supabase/migrations/20260911234416_enterprise_backend.sql` (applied to ShiftNote through the scoped Management API).

The nine requested tables are `organizations`, `facilities`, `departments`, `enterprise_admins`, `enterprise_leads`, `enterprise_contracts`, `enterprise_activation_links`, `enterprise_integrations`, and `enterprise_audit_logs`. Additional isolated tables are `koko_admins`, `enterprise_support_tickets`, and `enterprise_rate_limits`.

All tables have RLS. Facilities and departments carry the organization ID; a composite foreign key prevents departments from being linked to a facility in another organization. Staff roles, membership provisioning, activation records, rate limits, and audit writes are not editable by browser clients. Audit logs contain action metadata only, never message content, passwords, or setup tokens.

Organization approval, link reissue, and setup completion use service-only PostgreSQL functions. Tokens are 32 random bytes. Only their SHA-256 hash is stored. Expiry, revocation, email identity, and organization status are rechecked at completion under a row lock. Membership, facilities, departments, Active status, and token consumption are committed atomically. Failed setup cannot partially activate an organization.

## Authentication

The two portals use Supabase Auth with different HttpOnly cookie names from each other and from Professional. Login, session refresh, logout, recovery, and password update run on the server. Each API verifies the user through Supabase and rechecks database membership. An existing Supabase account must supply its current password during setup; the invitation never overwrites an existing password. A new account is created only after a valid invitation has been checked.

Portal writes require a same-origin Origin header and JSON, with a 64 KB body limit. Public entry points use database-backed rate limiting. Setup and internal portal routes do not initialize advertising analytics. Responses carrying portal data or links are not cacheable and suppress referrer transmission.

## Required deployment configuration

Existing Supabase URL, publishable key, and server service-role key are reused.

```
ENTERPRISE_SMTP_HOST=
ENTERPRISE_SMTP_PORT=587
ENTERPRISE_SMTP_USER=
ENTERPRISE_SMTP_PASSWORD=
ENTERPRISE_EMAIL_FROM=support@shiftnote.care
ENTERPRISE_APP_URL=https://www.shiftnote.care
ENTERPRISE_SETUP_EXPIRY_HOURS=48
```

Use your existing SMTP provider credentials. Port 465 uses TLS; port 587 requires STARTTLS. The sender must be authorized by that provider. The SMTP password must never use a NEXT_PUBLIC prefix. Configure these in local ignored environment files and Vercel. Supabase's SMTP configuration is not automatically exposed to application code.

The existing website origin works without DNS changes. To use `enterprise.shiftnote.care`, attach that domain to the same Vercel deployment and set ENTERPRISE_APP_URL accordingly. Links currently include `/enterprise/setup/{token}`. Recovery uses Supabase-generated recovery tokens verified by the corresponding portal callback; Professional redirect configuration is unchanged.

## Initial internal administrator

No account is automatically promoted. An operator must select an existing, verified Supabase user and add that exact user ID to `koko_admins` through a trusted database connection. Use `shiftnote_owner` for the initial KOKO LABS operator. Never accept this role from signup metadata or a browser request. See `scripts/bootstrap-enterprise-admin.mjs`; it requires an explicit `--email` and `--apply` and refuses unverified accounts. The exact existing and verified support@shiftnote.care account has been assigned shiftnote_owner. Its password was not changed. No substitute owner account was created.

### Internal roles

| Role | Permissions |
| --- | --- |
| shiftnote_owner | All current internal sections and operations; role provisioning remains a trusted administrative operation. |
| shiftnote_admin | All current internal sections and operations; cannot assign roles through the browser. |
| shiftnote_sales | Read organizations and contracts, manage unapproved leads through Contract Signed. No approvals, activation links, payment confirmation, contract writes, support tickets, or role changes. |
| shiftnote_support | Read organizations and integration metadata; view and resolve support tickets. No leads, contracts, payments, activation links, approvals, or role changes. |

Page access, navigation, server mutations, and SQL RLS enforce these restrictions. The retained `is_koko_admin()` database helper now means owner/admin only, not every internal staff member. Legacy generic owner/admin and Professional founder roles grant no internal access.

## Approval and email handling

Staff approve a lead in `/admin/leads`. The server creates the organization and integration metadata, generates a one-time setup link, and sends a branded email. If delivery fails, approval remains recorded and the UI reports the failure. Reissue Setup Link revokes the old link, generates a fresh one, and retries delivery. A successful SMTP response confirms provider acceptance, not inbox delivery; check the receiving mailbox during rollout.

Contracts and Enterprise payments are staff-maintained records. Payment Received does not charge a card or verify a Stripe payment. Professional Stripe checkout and webhooks are untouched. EHR settings are metadata only; no SMART, OAuth launch, patient sync, or Save to Chart is implemented.

## Validation and deployment order

1. Run `node scripts/test-enterprise-schema.mjs` to verify migration, CRUD, RLS, role escalation prevention, cross-tenant foreign keys, suspension, audit immutability, token replay/expiry/reissue, rollback, and cascade behavior in isolated PostgreSQL.
2. Run lint, typecheck, build, then `node --test tests/rendered-html.test.mjs tests/enterprise.test.mjs`.
3. Apply the migration to Supabase before deploying application code. Inspect the pending migration list first; do not apply unrelated migrations inadvertently.
4. Bootstrap the explicitly selected KOKO LABS account, configure SMTP, and verify provider delivery with an approved test lead and real receiving mailbox.
5. Verify staff login, approval, setup, organization login/logout/recovery, and two-organization isolation against the live deployment. Schema tests alone do not prove live delivery or authentication.

The APIs are `/api/enterprise/[...action]` and `/api/admin/[...action]`. Each operation is explicitly allowlisted, validated, and authorized. `types/supabase-live.ts` was generated from the live public schema; `types/enterprise.ts` consumes that generated Database type and defines UI domain types. Professional's existing type imports are unchanged.

## Latest verification

See [live verification results](enterprise-live-verification.md). The production database, owner role, RLS checks, live-backed API workflow, and browser wizard have been verified. SMTP authentication and actual setup and forgot-password email sends passed with a Namecheap Application Password using port 587 with required STARTTLS. Production environment entries were verified before release; provider acceptance does not establish inbox receipt.
