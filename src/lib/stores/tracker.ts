import { writable } from 'svelte/store';
import type { Entry } from '$lib/types';
import * as persistence from '$lib/stores/persistence';

function createStore() {
    const initial: Entry[] = [
        {
            id: 'p5r',
            type: 'game',
            title: 'Persona 5 Royal',
            coverUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8d/Persona_5_cover_art.jpg',
            theme: '#e31837',
            progress: 0.2,
            milestones: [
                { id: 'm1', label: 'Palace 1', done: true },
                { id: 'm2', label: 'Palace 2', done: false },
                { id: 'm3', label: 'Mementos Start', done: false }
            ]
        }
    ];

    const start = (() => {
        const loaded = persistence.load();
        return loaded.length ? loaded : initial;
    })();

    const { subscribe, set, update } = writable<Entry[]>(start);

    // persist on change
    subscribe((val) => {
        persistence.save(val);
    });

    // helpers
    function toggleMilestone(entryId: string, milestoneId: string) {
        update((entries) => {
            const copy = entries.map((e) => {
                if (e.id !== entryId) return e;
                const milestones = e.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done } : m
                );
                const doneCount = milestones.filter((m) => m.done).length;
                const progress = milestones.length ? doneCount / milestones.length : e.progress;
                return { ...e, milestones, progress };
            });
            return copy;
        });
    }

    function addEntry(entry: Entry) {
        update((entries) => [entry, ...entries]);
    }

    function setProgress(entryId: string, p: number) {
        update((entries) =>
            entries.map((e) => (e.id === entryId ? { ...e, progress: Math.max(0, Math.min(1, p)) } : e))
        );
    }

    return { subscribe, set, update, toggleMilestone, addEntry, setProgress };
}

export const tracker = createStore();

// Export persistence helpers so UI components can call import/export functions
export const exportJSON = persistence.exportJSON;
export const importJSON = persistence.importJSON;
export const importJSONFile = persistence.importJSONFile;
