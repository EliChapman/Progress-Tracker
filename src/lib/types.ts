export type EntryType = 'game' | 'show';

export interface Milestone {
    id: string;
    label: string;     // "Ep 5", "Palace 2", etc.
    done: boolean;
    imageUrl?: string; // optional thumbnail for milestone
}

export interface Entry {
    id: string;
    type: EntryType;
    title: string;
    coverUrl: string;
    theme: string;     // hex or css color (e.g. "#D22")
    milestones: Milestone[];
}
