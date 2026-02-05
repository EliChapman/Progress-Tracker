import type { Entry } from '$lib/types';

function isEntryArray(obj: unknown): obj is Entry[] {
    if (!Array.isArray(obj)) return false;
    return obj.every((it) =>
        typeof it === 'object' &&
        it !== null &&
        'id' in it &&
        'title' in it &&
        'type' in it
    );
}

export function exportJSON(entries: Entry[]): string {
    return JSON.stringify(entries, null, 2);
}

export function importJSON(text: string): Entry[] {
    try {
        const parsed = JSON.parse(text) as unknown;
        if (isEntryArray(parsed)) return parsed;
        throw new Error('Imported JSON is not a valid Entry[]');
    } catch (e) {
        throw new Error('Failed to parse import JSON: ' + (e instanceof Error ? e.message : String(e)));
    }
}

export async function importJSONFile(file: File): Promise<Entry[]> {
    const text = await file.text();
    return importJSON(text);
}

// Remote helpers (talk to server endpoints that proxy to Supabase)
export async function remoteLoad(): Promise<Entry[]> {
    try {
        const res = await fetch('/api/entries');
        if (!res.ok) throw new Error('Failed to fetch remote entries: ' + res.statusText);
        const data = await res.json();
        return isEntryArray(data) ? data : [];
    } catch (e) {
        console.warn('remoteLoad error', e);
        return [];
    }
}

export async function remoteSave(entries: Entry[]): Promise<boolean> {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        // if a client-visible write secret is provided in env, send it as x-write-secret
        const CLIENT_WRITE_SECRET = import.meta.env.VITE_WRITE_SECRET;
        if (CLIENT_WRITE_SECRET) headers['x-write-secret'] = String(CLIENT_WRITE_SECRET);

        const res = await fetch('/api/entries', {
            method: 'POST',
            headers,
            body: JSON.stringify(entries)
        });
        return res.ok;
    } catch (e) {
        console.warn('remoteSave error', e);
        return false;
    }
}
