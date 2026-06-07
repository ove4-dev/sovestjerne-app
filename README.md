# Sovestjerne App

Portal for Sovestjerne:

- `/start` onboarding-skjema
- `/success` takk-side
- `/admin` enkel adminoversikt

## Miljøvariabler i Vercel

Legg inn:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`

Ikke legg service role key i frontend eller i GitHub.

## Database

Kjør SQL-filen i `supabase/schema.sql` i Supabase SQL Editor.
