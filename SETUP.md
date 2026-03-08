# yenchingreviews setup

## Required environment variables

Create a `.env.local` file in the project root and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both values are required for the app to load data from the `courses` table.
If either value is missing, the homepage will render a clear configuration notice instead of crashing.

## Run locally

```bash
npm install
npm run dev
```
