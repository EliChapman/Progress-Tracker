# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Remote persistence with Supabase (recommended)

This project includes server endpoints that proxy to Supabase so your data can persist across devices and deployments.

Steps to set up Supabase:

1. Create a Supabase project at https://app.supabase.com.
2. In the SQL editor, run the following to create the `entries` table:

```sql
create table public.entries (
	id text primary key,
	type text not null,
	title text not null,
	cover_url text,
	theme text,
	progress double precision not null default 0,
	milestones jsonb not null,
	updated_at timestamptz not null default now()
);
```

3. In your Supabase project settings, get the project URL and the service_role key.

4. In Vercel project settings, add the following environment variables:

- `SUPABASE_URL` = your Supabase project URL (e.g. https://xyzcompany.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` = the service_role key (keep this secret)
- `VERCEL_WRITE_SECRET` = a random secret string used to protect write endpoints (optional but recommended)

The app exposes server endpoints at `/api/entries`:

- GET /api/entries — returns all entries (mapped to the frontend shape)
- POST /api/entries — upserts entries; requires header `x-write-secret` matching `VERCEL_WRITE_SECRET` if that env var is set

How it works
- The server endpoints call Supabase's PostgREST API server-side using the service_role key. This keeps the service key off the client.
- On the client you can call `/api/entries` to fetch or save entries. The `src/lib/stores/persistence.ts` file includes `remoteLoad()` and `remoteSave()` helpers to call these endpoints.

Security notes
- Never put the Supabase `service_role` key in client-side code.
- Use `VERCEL_WRITE_SECRET` to protect write operations until you implement proper auth.

