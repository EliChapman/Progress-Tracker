import type { RequestHandler } from '@sveltejs/kit';
import type { Entry } from '$lib/types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SECRET, VERCEL_WRITE_SECRET } from '$env/static/private';


if (!SUPABASE_URL || !SUPABASE_SECRET) {
    console.warn('Supabase env vars not set (expected SUPABASE_URL and SUPABASE_SECRET). /api/entries endpoints will error if called.');
}

function getSupabaseClient(key: string) {
    if (!SUPABASE_URL) throw new Error('Not configured: SUPABASE_URL missing');
    return createClient(SUPABASE_URL, key, {
        auth: { persistSession: false }
    });
}

function getReadClient() {
    if (SUPABASE_SECRET) return getSupabaseClient(SUPABASE_SECRET);
    throw new Error('Not configured: Supabase secret missing');
}

// Table: entries (id, type, title, cover_url, theme, progress, milestones jsonb, updated_at)

export const GET: RequestHandler = async () => {
    try {
        const client = getReadClient();
        const { data, error } = await client
            .from('entries')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('/api/entries GET failed', error);
            return new Response(error.message, { status: 502 });
        }

        const mapped: Entry[] = Array.isArray(data)
            ? data.map((r: Entry) => ({
                id: r.id ?? '',
                type: r.type ?? 'game',
                title: r.title ?? '',
                cover_url: r.cover_url ?? '',
                theme: r.theme,
                milestones: r.milestones,
                updated_at: r.updated_at ?? null
            }))
            : [];
        return new Response(JSON.stringify(mapped), { status: 200 });
    } catch (err) {
        console.error('/api/entries GET caught error', err);
        return new Response(String(err ?? 'Unknown error'), { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    if (!SUPABASE_URL || !SUPABASE_SECRET) return new Response('Not configured', { status: 500 });

    // write protection: require VERCEL_WRITE_SECRET to be set and match header
    if (!VERCEL_WRITE_SECRET) {
        // safer default: do not allow writes when secret is missing
        return new Response('Server misconfigured: VERCEL_WRITE_SECRET not set', { status: 500 });
    }
    const incoming = request.headers.get('x-write-secret') ?? '';
    if (incoming !== VERCEL_WRITE_SECRET) return new Response('Unauthorized', { status: 401 });

    try {
        const entries = await request.json();
        if (!Array.isArray(entries)) return new Response('Invalid payload', { status: 400 });

        // Strategy: upsert rows using onConflict=id
        const rowData = entries.map((e: Entry) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            cover_url: e.cover_url,
            theme: e.theme,
            milestones: e.milestones
        }));

        const client = getSupabaseClient(SUPABASE_SECRET);
        const { error } = await client.from('entries').upsert(rowData, { onConflict: 'id' });
        if (error) return new Response(error.message, { status: 502 });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err) {
        return new Response(String(err), { status: 500 });
    }
};
