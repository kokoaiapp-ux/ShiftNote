# ShiftNote Enterprise preview

Enterprise is a public, UI-only prototype. All names, organizations, and metrics are fictional. Do not enter patient information.

## Pages

- `/enterprise`: Enterprise landing page.
- `/enterprise/demo`: introduction to the sample workspace.
- `/enterprise/request-demo`: demo request form, browser validation only.
- `/enterprise/request-demo/success`: prototype confirmation; nothing is submitted or saved.
- `/enterprise/subscription`: Enterprise features and demo CTA, without pricing or checkout.
- `/enterprise/dashboard`: organization overview and workspace navigation.
- `/enterprise/organizations`: organization profile and structure.
- `/enterprise/facilities`: sample facilities.
- `/enterprise/departments`: sample department directory.
- `/enterprise/users`: searchable sample clinician directory.
- `/enterprise/analytics`: sample activity and usage charts.
- `/enterprise/integrations`: eight EHR cards, all Coming Soon.
- `/enterprise/billing`: unconnected Enterprise billing preview.
- `/enterprise/support`: preview information and FAQs.
- `/enterprise/settings`: editable form with local confirmation; changes reset on navigation or reload.

## Boundaries

`lib/enterprise/routes.ts` defines the exact `/enterprise` namespace. The existing proxy passes these routes through before any session lookup. `ApplicationProviders` renders them without Professional authentication, subscription, product, or PIP providers. Every other path retains the original Professional provider hierarchy and server protection. Global analytics components remain in the root layout.

Enterprise components consume `lib/enterprise/demo-data.ts`, not Supabase or Professional stores. No Enterprise API routes, database schema, provisioning, permissions, payment actions, email delivery, CRM, or EHR connection exists. Roles and security features are explicitly illustrative or planned.

## Review

1. Open each Enterprise route while signed out; it should render without login or a paywall.
2. Use desktop sidebar or mobile menu to navigate all workspace sections.
3. Search the users directory; a nonmatching query shows an empty result state.
4. Fill the demo form with fictional details. Invalid email or empty required fields prevent continuation. Submission goes to the confirmation and transmits no form values.
5. Change preview settings and save; a local status appears. Refresh resets the form.
6. Return to Professional and confirm its original authentication and subscription behavior.

Run `npm run lint`, `npm run typecheck`, `npm run build`, then `node --test tests/rendered-html.test.mjs tests/enterprise.test.mjs`. The Enterprise test renders all 15 routes from the production artifact while intercepting external fetch calls; each must return 200 and make no backend request.
