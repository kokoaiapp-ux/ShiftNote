# Enterprise implementation status

See [live verification results](enterprise-live-verification.md) for the authoritative current report and [architecture and rollout](enterprise-backend.md) for setup instructions.

The live migration is applied and the real owner role is assigned. Live-backed API tests, RLS isolation, recovery/reset logic, browser wizard, generated types, lint, TypeScript, and the core production build passed. On September 14, 2026, SMTP authentication and actual setup and forgot-password email sends passed using a Namecheap Application Password on port 587 with required STARTTLS. The duplicate access-token definition is resolved. All four Meta/TikTok variables exist in Vercel production as sensitive values. Deployment verification is recorded separately from these pre-release checks.

## Files added, modified, or removed

Removed prototype files: AnalyticsOverview.tsx, SettingsPreview.tsx, UserDirectory.tsx, and lib/enterprise/demo-data.ts. Other listed files were added or modified.

- `.env.local.example`
- `app/admin/(portal)/[section]/page.tsx`
- `app/admin/(portal)/layout.tsx`
- `app/admin/(portal)/page.tsx`
- `app/admin/forgot-password/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/login/page.tsx`
- `app/admin/reset-password/page.tsx`
- `app/api/admin/[...action]/route.ts`
- `app/api/enterprise/[...action]/route.ts`
- `app/enterprise/(workspace)/analytics/page.tsx`
- `app/enterprise/(workspace)/billing/page.tsx`
- `app/enterprise/(workspace)/dashboard/page.tsx`
- `app/enterprise/(workspace)/departments/page.tsx`
- `app/enterprise/(workspace)/facilities/page.tsx`
- `app/enterprise/(workspace)/integrations/page.tsx`
- `app/enterprise/(workspace)/layout.tsx`
- `app/enterprise/(workspace)/organizations/page.tsx`
- `app/enterprise/(workspace)/settings/page.tsx`
- `app/enterprise/(workspace)/support/page.tsx`
- `app/enterprise/(workspace)/users/page.tsx`
- `app/enterprise/demo/page.tsx`
- `app/enterprise/forgot-password/page.tsx`
- `app/enterprise/layout.tsx`
- `app/enterprise/login/page.tsx`
- `app/enterprise/page.tsx`
- `app/enterprise/request-demo/page.tsx`
- `app/enterprise/request-demo/success/page.tsx`
- `app/enterprise/reset-password/page.tsx`
- `app/enterprise/setup/[token]/page.tsx`
- `app/enterprise/subscription/page.tsx`
- `app/layout.tsx`
- `components/ApplicationProviders.tsx`
- `components/enterprise/AdminShell.tsx`
- `components/enterprise/AdminWorkspace.tsx`
- `components/enterprise/AnalyticsBoundary.tsx`
- `components/enterprise/AnalyticsOverview.tsx`
- `components/enterprise/DemoRequestForm.tsx`
- `components/enterprise/EnterpriseShell.tsx`
- `components/enterprise/LiveWorkspace.tsx`
- `components/enterprise/MarketingChrome.tsx`
- `components/enterprise/PortalAuth.tsx`
- `components/enterprise/ProductOptions.tsx`
- `components/enterprise/SettingsPreview.tsx`
- `components/enterprise/SetupWizard.tsx`
- `components/enterprise/UserDirectory.tsx`
- `components/enterprise/WorkspaceProvider.tsx`
- `docs/enterprise-backend.md`
- `docs/enterprise-implementation-status.md`
- `docs/enterprise-live-verification.md`
- `docs/enterprise-preview.md`
- `lib/enterprise/catalog.ts`
- `lib/enterprise/demo-data.ts`
- `lib/enterprise/permissions.ts`
- `lib/enterprise/routes.ts`
- `lib/enterprise/session-proxy.ts`
- `lib/enterprise/validation.ts`
- `lib/server/enterprise-api.ts`
- `lib/server/enterprise-auth.ts`
- `lib/server/enterprise-mail.ts`
- `package-lock.json`
- `package.json`
- `proxy.ts`
- `scripts/bootstrap-enterprise-admin.mjs`
- `scripts/check-enterprise-database.mjs`
- `scripts/enterprise-live.mjs`
- `scripts/serve-enterprise-verification.mjs`
- `scripts/test-enterprise-live-api.mjs`
- `scripts/test-enterprise-live-rls.mjs`
- `scripts/test-enterprise-schema.mjs`
- `scripts/test-enterprise-wizard-browser.mjs`
- `scripts/verify-secret-boundaries.mjs`
- `supabase/migrations/20260911234416_enterprise_backend.sql`
- `tests/enterprise-permissions.test.mjs`
- `tests/enterprise.test.mjs`
- `types/enterprise.ts`
- `types/supabase-live.ts`
