import { writable } from 'svelte/store';
import type { Entry } from '$lib/types';
import * as persistence from '$lib/stores/persistence';

export type SyncStatus = 'idle' | 'syncing' | 'writing' | 'error' | 'offline';
const syncStatusStore = writable<SyncStatus>('idle');
const lastSyncedStore = writable<number | null>(null);

function createStore() {
    const initial: Entry[] = [];
    const { subscribe, set, update } = writable<Entry[]>(initial);

    // helpers
    function toggleMilestone(entryId: string, milestoneId: string) {
        update((entries) => {
            const copy = entries.map((e) => {
                if (e.id !== entryId) return e;
                const milestones = e.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done } : m
                );
                const doneCount = milestones.filter((m) => m.done).length;
                const progress = milestones.length ? doneCount / milestones.length : 0;
                return { ...e, milestones, progress };
            });
            // persist to Supabase
            (async () => {
                try {
                    syncStatusStore.set('writing');
                    const ok = await persistence.remoteSave(copy);
                    if (ok) {
                        lastSyncedStore.set(Date.now());
                        syncStatusStore.set('idle');
                    } else {
                        // one retry
                        const retryOk = await persistence.remoteSave(copy);
                        if (retryOk) {
                            lastSyncedStore.set(Date.now());
                            syncStatusStore.set('idle');
                        } else {
                            console.warn('remoteSave retry failed');
                            syncStatusStore.set('error');
                        }
                    }
                } catch (err) {
                    console.warn('remoteSave error', err);
                    syncStatusStore.set('error');
                }
            })();
            return copy;
        });
    }

    function addEntry(entry: Entry) {
        update((entries) => {
            const updated = [entry, ...entries];
            // persist to Supabase
            (async () => {
                try {
                    syncStatusStore.set('writing');
                    const ok = await persistence.remoteSave(updated);
                    if (ok) {
                        lastSyncedStore.set(Date.now());
                        syncStatusStore.set('idle');
                    } else {
                        syncStatusStore.set('error');
                    }
                } catch (err) {
                    console.warn('addEntry save error', err);
                    syncStatusStore.set('error');
                }
            })();
            return updated;
        });
    }

    function setProgress(entryId: string, p: number) {
        update((entries) => {
            const updated = entries.map((e) => (e.id === entryId ? { ...e, progress: Math.max(0, Math.min(1, p)) } : e));
            // persist to Supabase
            (async () => {
                try {
                    syncStatusStore.set('writing');
                    const ok = await persistence.remoteSave(updated);
                    if (ok) {
                        lastSyncedStore.set(Date.now());
                        syncStatusStore.set('idle');
                    } else {
                        syncStatusStore.set('error');
                    }
                } catch (err) {
                    console.warn('setProgress save error', err);
                    syncStatusStore.set('error');
                }
            })();
            return updated;
        });
    }

    return { subscribe, set, update, toggleMilestone, addEntry, setProgress };
}

export const tracker = createStore();

// exported sync status store
export const syncStatus = syncStatusStore;
export const lastSynced = lastSyncedStore;

// helper that updates syncStatus while calling refreshRemote
export async function refreshRemoteWithStatus() {
    syncStatusStore.set('syncing');
    try {
        const ok = await refreshRemote();
        if (ok) {
            lastSyncedStore.set(Date.now());
            syncStatusStore.set('idle');
            return true;
        } else {
            syncStatusStore.set('error');
            return false;
        }
    } catch (e) {
        console.warn('refreshRemoteWithStatus error', e);
        syncStatusStore.set('error');
        return false;
    }
}

// Export persistence helpers so UI components can call import/export functions
export const exportJSON = persistence.exportJSON;
export const importJSON = persistence.importJSON;
export const importJSONFile = persistence.importJSONFile;

// remote read helpers
async function refreshRemote() {
    try {
        const data = await persistence.remoteLoad();
        if (data && data.length) {
            // compute progress from milestones if present
            const computed = (data as unknown[]).map((eUnknown: unknown) => {
                const e = eUnknown as { milestones?: unknown };
                let ms: unknown = e.milestones ?? [];
                // server may return milestones as a JSON string or malformed value,
                // normalize to an array before using .filter
                if (!Array.isArray(ms)) {
                    if (typeof ms === 'string') {
                        try {
                            const parsed = JSON.parse(ms as string);
                            ms = Array.isArray(parsed) ? parsed : [];
                        } catch {
                            ms = [];
                        }
                    } else {
                        ms = [];
                    }
                }
                const msArray = Array.isArray(ms) ? ms : [];
                const done = msArray.filter((m) => !!(m && (m as { done?: unknown }).done)).length;
                const progress = msArray.length ? done / msArray.length : 0;
                return { ...(e as object), milestones: msArray, progress } as unknown as Entry;
            });
            tracker.set(computed);
        }
        return true;
    } catch (e) {
        console.warn('refreshRemote failed', e);
        return false;
    }
}

// auto-load from Supabase on startup (browser only)
if (typeof window !== 'undefined') {
    (async () => {
        try {
            await refreshRemoteWithStatus();
        } catch (e) {
            console.warn('auto refresh failed', e);
        }
    })();
}
