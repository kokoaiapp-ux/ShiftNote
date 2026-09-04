# Supabase database workflow

This phase configures Supabase Postgres only. It does not configure Stripe billing or Firebase data migration.

## Local migration credentials

Keep these values in `.env.local` and never prefix them with `NEXT_PUBLIC_`:

```env
SUPABASE_ACCESS_TOKEN=your_personal_access_token
SUPABASE_PROJECT_REF=your_project_reference
SUPABASE_DB_PASSWORD=your_database_password
```

- Create `SUPABASE_ACCESS_TOKEN` under Supabase Dashboard > Account > Access Tokens.
- Copy `SUPABASE_PROJECT_REF` from Project Settings > General.
- Use the database password from Project Settings > Database. Reset it there if it is unavailable.

These credentials are used only by the local Supabase CLI to link the project, apply migration files, verify the remote schema, and regenerate TypeScript types. They are not sent to the browser and should not be configured as production frontend environment variables.

## Migration

The migration is `supabase/migrations/202608040001_initial_shift_note.sql`. After credentials are available:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<value from .env.local>"
npx supabase link --project-ref <SUPABASE_PROJECT_REF> --password <SUPABASE_DB_PASSWORD>
npx supabase db push --linked --password <SUPABASE_DB_PASSWORD>
npx supabase gen types typescript --linked > types/database.generated.ts
```

Run the isolated PostgreSQL verification at any time:

```powershell
npm run test:db
```

Do not paste secrets into commands that will be committed or into browser-exposed variables.