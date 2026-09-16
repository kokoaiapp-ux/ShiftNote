# ShiftNote SMART / Epic sandbox foundation

## Configuration as of September 16, 2026

- Callback: `https://www.shiftnote.care/fhir/callback`
- EHR launch: `https://www.shiftnote.care/fhir/launch` (GET with `iss` and `launch`)
- Safe failure: `/fhir/error`; authenticated technical handoff: `/enterprise/clinician`
- Organization: **ShiftNote Epic Sandbox Test**, `976673f4-d6bc-4399-adc1-35e6e1eea0a3`, Active. Explicit non-production audit marker; no contracts, billing, administrator accounts, activation links, or onboarding emails were created.
- Sandbox connection: `48d221bf-d42f-41fc-8226-c206ca1085f9`, vendor `epic-sandbox`, **disabled** pending production log-redaction verification and authorization to begin real OAuth.
- FHIR R4 issuer: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`
- Endpoints discovered from that issuer's `/.well-known/smart-configuration`, constrained to Epic's non-production host/path and pinned in the connection registry.
- User-approved authentication method: `client_secret_basic`. Configurable per connection; `client_secret_post` and public `none` remain supported by the generic exchange. Epic sandbox requires a supported symmetric method.
- SMART v2 minimum scopes: `openid fhirUser launch patient/Patient.r patient/Encounter.r user/Practitioner.r`. No search, wildcard, offline, or write access requested. PKCE is always S256.
- Actual Epic credentials are environment-only: `EPIC_SANDBOX_CLIENT_ID` and `EPIC_SANDBOX_CLIENT_SECRET`. The registry's `client_id` contains only `env:EPIC_SANDBOX_CLIENT_ID`, resolved server-side. Never copy the real values into the database, source, logs, or browser code.
- `SMART_SESSION_ENCRYPTION_KEY` is a random 32-byte standard-base64 key; configured locally and present in Vercel production metadata. Production variable values were not exported. The deployment's values are not proven equal to local ones by presence checks.

No real Epic OAuth launch or token exchange has been attempted. Route smoke tests use missing or synthetic invalid parameters, never a real Epic launch context/code. Publishing this code is not proof of a successful Epic authorization.

## Authentication and token protection

`client_secret_basic` sends form-encoded client ID/secret components solely in the HTTP Basic Authorization header. Neither credential is duplicated in the token POST body. `client_secret_post` retains its separate form-based implementation. Provider errors are not logged or reflected to users.

Launches require an exact enabled connection and Active organization. Arbitrary incoming issuers never trigger discovery or network calls. HTTPS endpoints reject local/IP hosts, redirects, credentials, and unsafe URLs.

Each launch generates independent random state, browser binding, PKCE verifier, and OIDC nonce. Only hashes of state/binding are stored. Verifier/nonce and resulting token/identity/context payloads use AES-256-GCM with record/organization-bound associated data. The opaque browser cookies are Secure, HttpOnly, host-only, SameSite=Lax. Use canonical-host top-level/new-tab EHR launch, not cross-site iframe or form_post.

The database atomically consumes each launch before token exchange. Missing, invalid, expired, reused, wrong-browser, disabled, or configuration-changed state fails closed. Code exchanges are never automatically retried. Signed ID tokens must pass signature, issuer, audience, nonce, expiration, authorized-party, optional access-token binding, and clinician `fhirUser` checks. Practitioner/PractitionerRole identity is required; patient identities cannot become clinicians.

Only encrypted tokens/context are persisted. Tokens are never serialized into browser HTML/JavaScript. Sessions expire at the earlier of token expiry and eight hours. Revocation, organization suspension, disabled/changed connection, encryption-key rotation, or a changed runtime client ID prevents session access. The resolved client ID is bound inside the encrypted session, not stored as a plaintext credential. Refresh tokens, if returned, are encrypted but not automatically used.

Technical routes do not mount analytics/providers and use no-store/no-referrer/noindex headers. Application audits contain fixed reason codes only. **Vercel ingress, runtime, APM, and log-drain query/header/body redaction must still be independently verified before real OAuth.** A prior synthetic query marker was absent from returned request logs; that limited observation does not establish infrastructure-wide redaction. Keep the Epic connection disabled until this prerequisite is resolved.

## Database and verification

Applied only `supabase/migrations/20260916071317_smart_callback.sql` to ShiftNote production. The SQL recorded in migration history matches the local file. It adds:

- `smart_connections`, `smart_launch_sessions`, `smart_sessions`
- 14 indexes, five cascading foreign keys including organization-bound composites
- three timestamp triggers and three SMART functions, with constrained search paths
- RLS default-deny on all three tables, no browser-access policies, revoked anon/authenticated CRUD, and service-role-only authorization RPCs

Before/after snapshots confirmed existing Professional/Enterprise permissions, policies, and function definitions unchanged. No auth users or existing setup workflows were changed. `enterprise_integrations` is not consumed by SMART and requires no placeholder Epic record.

The Management API query connection remains read-only (`25006`) even though migrations are permitted. Do not relax it. Live runtime/isolation testing now uses the existing service-role REST/RPC path instead:

- `node scripts/verify-smart-live.mjs --schema-only`: live schema, exact migration SQL, permissions, RLS, indexes/triggers/functions, unchanged existing security, and anonymous REST denial.
- `node --import tsx scripts/test-smart-live-service.ts`: synthetic SMART records only in the designated sandbox; cross-organization launch/session rejection, browser binding, concurrent/replayed/expired state, successful encrypted session storage, replay rejection, audit, disabled connection, anonymous RPC denial, and cleanup/cascades. Does not contact Epic or create accounts/organizations. The foreign organization ID is only read/referenced in deliberately rejected FK operations; its records are unchanged. Synthetic audit evidence is retained and explicitly labeled. Fixture connection/launch/session records are removed by exact IDs.
- `node scripts/test-smart-schema.mjs`: isolated PostgreSQL migration and rollback-only SQL suite.
- `node scripts/test-enterprise-schema.mjs`: existing Enterprise isolation, roles, setup, and CRUD regression suite.
- `node --import tsx --test tests/smart-callback.test.ts tests/smart-provider.test.ts tests/epic-sandbox.test.ts`: mocked protocol/provider tests, real test-key JWT verification, Basic header-only credentials, discovery restrictions, configured scopes and environment reference resolution.
- `node --test tests/smart-routes.test.mjs tests/enterprise.test.mjs tests/enterprise-permissions.test.mjs tests/enterprise-preview.test.mjs tests/rendered-html.test.mjs`: built-route and existing-flow regressions (requires the standard build).
- `npm run lint`, `npm run typecheck`, `npm run build`; Vercel-target Nitro build and `npm run security:secrets -- --bundles`.

The operator provisioning script `scripts/configure-epic-sandbox.ts` discovers/reviews configuration and creates only a disabled connection with explicit `--apply`. It never overwrites an existing connection. Credentials must remain in environment variables. The sandbox organization helper is separately opt-in and must not be added to builds or cleanup jobs.

Operational retention should remove expired/revoked SMART sessions, then expired launches with no surviving session, according to the organization's retention policy. No scheduling infrastructure is introduced here.

## Scope and files

No chart write-back, FHIR clinical-resource retrieval, patient synchronization, clinician account provisioning, Professional authentication, subscription changes, or Enterprise setup/admin redesign is included. `/enterprise/clinician` is a protected technical connection-confirmation handoff, not a full clinician workspace.

Implementation files: `app/fhir/{launch,callback,error}/route.ts`, `app/enterprise/clinician/route.ts`, `lib/server/smart/{core,crypto,exchange,service,epic-sandbox}.ts`, `types/smart.ts`, and the SMART migration. `proxy.ts` bypasses existing Professional middleware only for the new technical paths. Package changes add direct JOSE and the TypeScript test runner. Environment examples, secret-boundary scanning, SMART tests, and operator verification scripts are included. Unrelated Professional and Enterprise setup/admin files remain unchanged.

References: [Epic OAuth documentation](https://fhir.epic.com/Documentation?docId=oauth2), [SMART v2.2 scopes](https://hl7.org/fhir/smart-app-launch/STU2.2/scopes-and-launch-context.html), [Vercel log-drain fields](https://vercel.com/docs/drains/reference/logs).
