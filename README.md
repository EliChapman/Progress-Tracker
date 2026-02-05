# Progress Tracker

A SvelteKit app for tracking progress across games, shows, and other media. It stores entries locally in the browser and can optionally sync to Supabase through server-side API endpoints.

## What it includes

- Progress dashboard and entry cards
- Local persistence in the browser
- Optional Supabase-backed persistence via `/api/entries`

## Run locally

Install dependencies:

```sh
npm install
```

Start the dev server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

> To deploy, you may need a SvelteKit adapter for your target environment.

## Supabase (optional)

If you want data to persist across devices, configure Supabase and set environment variables for the server-side API.

### Database setup

Create a Supabase project and run:

```sql
create table public.entries (
	id text primary key,
	type text not null,
	title text not null,
	cover_url text,
	theme text,
	milestones jsonb not null,
	updated_at timestamptz not null default now()
);
```

### Environment variables

Set these in your deployment platform or `.env` file:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SECRET` = your service role key (server-side only)
- `VERCEL_WRITE_SECRET` = secret string required for write operations

### API endpoints

- `GET /api/entries` — returns all entries
- `POST /api/entries` — upserts entries; requires `x-write-secret` if `VERCEL_WRITE_SECRET` is set

### Notes

- Server endpoints call Supabase’s PostgREST API using the service role key (never expose it client-side).
- Client helpers live in `src/lib/stores/persistence.ts` (`remoteLoad()` and `remoteSave()`).

