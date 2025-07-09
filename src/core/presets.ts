export type Preset = {
    name: string;
    path: string;
    type: 'file' | 'directory';
    excludedPaths?: string[];
};

export const presets: Preset[] = [
    {
        name: 'Gemini',
        path: 'GEMINI.md',
        type: 'file',
    },
    {
        name: 'Claude Code',
        path: 'CLAUDE.md',
        type: 'file',
    },
    {
        name: 'Cline',
        path: '.clinerules/',
        type: 'directory',
        excludedPaths: ['workflows'],
    },    {
        name: 'Cline',
        path: '.kilocode/rules/',
        type: 'directory',
    },
];
