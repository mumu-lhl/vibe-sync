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
        name: 'Jules',
        path: 'AGENTS.md',
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
    },
    {
        name: 'Kilo Code',
        path: '.kilocode/rules/',
        type: 'directory',
    },
    {
        name: 'Roo Code',
        path: '.roo/rules/',
        type: 'directory',
    },
];
