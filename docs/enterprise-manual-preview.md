# Temporary manual setup preview

The `/enterprise/setup-preview` route reuses the seven-step Enterprise wizard with an explicit preview-only finish action. All fields remain in React memory. No account creation, password change, setup RPC, facilities write, department write, session creation, or customer activation occurs. The final screen confirms that nothing was saved; reviewing again is allowed until expiry. This is not an Enterprise login test.

The operator creates a separate `New` organization and a `Manual Setup Preview Created` audit marker. No lead, contract, subscription, activation row, or Auth user is created. The organization remains until the user requests cleanup. Its only durable data is its preview name/defaults and audit entries.

A purpose-specific HMAC credential, signed server-side with the existing service-role secret, expires after seven days. The validation route also enforces seven days from the audit marker and checks that the organization is still `New`. Deleting the preview organization or changing its status revokes access. Secret rotation also invalidates the signature. No new environment variable, database schema, or global activation-expiry change is required.

The preview credential has a different format from real activation tokens and is never inserted in the activation table. Both normal activation endpoints reject it. Changing frontend preview flags cannot grant real setup or account access.

The link puts the credential in the URL fragment, not a query/path, so ordinary HTTP access logs and referrers do not contain it. Validation sends it only in a same-origin POST body; neither requests nor raw errors are logged. Existing Enterprise analytics exclusion continues to apply. No credentials are written to files or committed.

After deployment, an explicitly authorized operator can run `node scripts/create-enterprise-manual-preview.mjs --create`. It sends the private link only to support@shiftnote.care after checking live preview validation and normal-activation rejection. It prints only organization metadata and provider acceptance. It does not modify that account or automatically clean up the preview. To resend for an existing preview, pass `--organization-id=<preview organization UUID>`; this does not extend the original seven-day review window.

Automated browser tests use separately identified fixtures and must never delete the retained manual-test organization. Cleanup is a separate user-authorized operation against the exact preview organization ID.
