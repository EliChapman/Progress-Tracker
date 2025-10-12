import type { RequestHandler } from '@sveltejs/kit';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.warn('Supabase env vars not set. /api/entries endpoints will error if called.');
}

const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE ?? '',
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE ?? ''}`
};

// Table: entries (id, type, title, cover_url, theme, progress, milestones jsonb, updated_at)

export const GET: RequestHandler = async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return new Response('Not configured', { status: 500 });
    const url = `${SUPABASE_URL}/rest/v1/entries?select=*&order=updated_at.desc`;
    const res = await fetch(url, { headers });
    if (!res.ok) return new Response(await res.text(), { status: res.status });
    const data: unknown = await res.json();

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
};

export const POST: RequestHandler = async ({ request }) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return new Response('Not configured', { status: 500 });

    // simple write protection: requires x-write-secret header to match env var
    const WRITE_SECRET = process.env.VERCEL_WRITE_SECRET;
    if (WRITE_SECRET) {
        const incoming = request.headers.get('x-write-secret') ?? '';
        if (incoming !== WRITE_SECRET) return new Response('Unauthorized', { status: 401 });
    }

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
                progress: typeof rec['progress'] === 'number' ? (rec['progress'] as number) : Number(rec['progress'] ?? 0),
                milestones: rec['milestones'] ?? []
            };
        });

        const url = `${SUPABASE_URL}/rest/v1/entries?on_conflict=id`;
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(rowData) });
        if (!res.ok) return new Response(await res.text(), { status: res.status });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err) {
        return new Response(String(err), { status: 500 });
    }
};
