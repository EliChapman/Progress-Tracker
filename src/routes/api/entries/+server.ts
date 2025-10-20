import type { RequestHandler } from '@sveltejs/kit';

// load local .env during development so process.env is populated
// attempt to load dotenv in development (non-blocking)
(async () => {
    try {
        const mod = await import('dotenv');
        if (mod && typeof mod.config === 'function') mod.config();
    } catch {
        /* ignore if dotenv isn't installed in production */
    }
})();

// support multiple common env names (some setups use NEXT_PUBLIC_* vars)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.warn('Supabase env vars not set (expected SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). /api/entries endpoints will error if called.');
}

const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;


// Table: entries (id, type, title, cover_url, theme, progress, milestones jsonb, updated_at)

export const GET: RequestHandler = async () => {
    if (!SUPABASE_URL) return new Response('Not configured: SUPABASE_URL missing', { status: 500 });
    const url = `${SUPABASE_URL}/rest/v1/entries?select=*&order=updated_at.desc`;
    const getHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPABASE_SERVICE_ROLE) {
        getHeaders.apikey = SUPABASE_SERVICE_ROLE;
        getHeaders.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE}`;
    } else if (SUPABASE_ANON) {
        getHeaders.apikey = SUPABASE_ANON;
        getHeaders.Authorization = `Bearer ${SUPABASE_ANON}`;
    }

    try {
        const res = await fetch(url, { headers: getHeaders });
        const text = await res.text();
        if (!res.ok) {
            console.error('/api/entries GET failed', { status: res.status, body: text });
            return new Response(text || `Supabase error: ${res.status}`, { status: 502 });
        }
        const data: unknown = text ? JSON.parse(text) : [];

        function getString(obj: unknown, key: string): string | undefined {
            if (typeof obj === 'object' && obj !== null && key in obj) {
                const v = (obj as Record<string, unknown>)[key];
                return typeof v === 'string' ? v : undefined;
            }
            return undefined;
        }

        function getNumber(obj: unknown, key: string): number | undefined {
            if (typeof obj === 'object' && obj !== null && key in obj) {
                const v = (obj as Record<string, unknown>)[key];
                return typeof v === 'number' ? v : undefined;
            }
            return undefined;
        }

        // map DB columns to client shape
        const mapped = Array.isArray(data)
            ? data.map((r) => ({
                id: getString(r, 'id') ?? '',
                type: getString(r, 'type') ?? 'game',
                title: getString(r, 'title') ?? '',
                coverUrl: getString(r, 'cover_url') ?? '',
                theme: getString(r, 'theme') ?? '',
                progress: getNumber(r, 'progress') ?? 0,
                milestones: (typeof r === 'object' && r !== null ? (r as Record<string, unknown>)['milestones'] : [])
            }))
            : [];
        return new Response(JSON.stringify(mapped), { status: 200 });
    } catch (err) {
        console.error('/api/entries GET caught error', err);
        return new Response(String(err ?? 'Unknown error'), { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return new Response('Not configured', { status: 500 });

    // write protection: require VERCEL_WRITE_SECRET to be set and match header
    const WRITE_SECRET = process.env.VERCEL_WRITE_SECRET;
    if (!WRITE_SECRET) {
        // safer default: do not allow writes when secret is missing
        return new Response('Server misconfigured: VERCEL_WRITE_SECRET not set', { status: 500 });
    }
    const incoming = request.headers.get('x-write-secret') ?? '';
    if (incoming !== WRITE_SECRET) return new Response('Unauthorized', { status: 401 });

    try {
        const entries = await request.json();
        if (!Array.isArray(entries)) return new Response('Invalid payload', { status: 400 });

        // Strategy: upsert rows using POST with on_conflict=id
        const rowData = (entries as unknown[]).map((e) => {
            const rec = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
            return {
                id: typeof rec['id'] === 'string' ? (rec['id'] as string) : String(rec['id'] ?? ''),
                type: typeof rec['type'] === 'string' ? (rec['type'] as string) : 'game',
                title: typeof rec['title'] === 'string' ? (rec['title'] as string) : String(rec['title'] ?? ''),
                cover_url: typeof rec['coverUrl'] === 'string' ? (rec['coverUrl'] as string) : String(rec['coverUrl'] ?? ''),
                theme: typeof rec['theme'] === 'string' ? (rec['theme'] as string) : String(rec['theme'] ?? ''),
                // progress is derived client-side from milestones and no longer stored in the DB
                milestones: rec['milestones'] ?? []
            };
        });

        const url = `${SUPABASE_URL}/rest/v1/entries?on_conflict=id`;
        const postHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        postHeaders.apikey = SUPABASE_SERVICE_ROLE;
        postHeaders.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE}`;
    // Ask PostgREST to merge duplicates on conflict (perform upsert)
    // and return the affected rows for debugging if needed.
    postHeaders.Prefer = 'resolution=merge-duplicates, return=representation';
        const res = await fetch(url, { method: 'POST', headers: postHeaders, body: JSON.stringify(rowData) });
        if (!res.ok) return new Response(await res.text(), { status: res.status });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err) {
        return new Response(String(err), { status: 500 });
    }
};
