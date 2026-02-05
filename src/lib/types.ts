export type EntryType = 'game' | 'show';

export interface Milestone {
    id: string;
    label: string;     // "Ep 5", "Palace 2", etc.
    done: boolean;
    imageUrl?: string; // optional thumbnail for milestone
}

export interface Theme {
    primary: string;   // hex color code
    secondary: string; // hex color code
}

export interface Entry {
    id: string;
    type: 'game' | 'show';
    title: string;
    milestones: Milestone[];
    cover_url: string | null;
    theme: Theme;
    updated_at: string | null;
}
