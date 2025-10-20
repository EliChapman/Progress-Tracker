import type { Entry } from '$lib/types';

const KEY = 'tracker-data-v1';

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

export function load(): Entry[] {
    // safe fallback when not running in browser
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (isEntryArray(parsed)) return parsed;
        return [];
    } catch (e) {
        console.warn('Failed to load tracker data:', e);
        return [];
    }
}

export function save(entries: Entry[]) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(KEY, JSON.stringify(entries));
    } catch (e) {
        console.warn('Failed to save tracker data:', e);
    }
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
        const CLIENT_WRITE_SECRET = import.meta.env.VITE_WRITE_SECRET ?? import.meta.env.NEXT_PUBLIC_WRITE_SECRET;
        if (CLIENT_WRITE_SECRET) headers['x-write-secret'] = String(CLIENT_WRITE_SECRET);

        // strip derived fields like `progress` before sending to server
        const payload = entries.map((e) => {
            const copy = Object.assign({}, e as unknown) as Record<string, unknown>;
            delete copy['progress'];
            return copy;
        });

        const res = await fetch('/api/entries', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        return res.ok;
    } catch (e) {
        console.warn('remoteSave error', e);
        return false;
    }
}
