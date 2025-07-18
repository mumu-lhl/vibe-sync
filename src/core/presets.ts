export type Preset = {
  name: string;
  path: string;
  type: "file" | "directory";
};

export const presets: Preset[] = [
  {
    name: "Gemini",
    path: "GEMINI.md",
    type: "file",
  },
  {
    name: "Jules",
    path: "AGENTS.md",
    type: "file",
  },
  {
    name: "Claude Code",
    path: "CLAUDE.md",
    type: "file",
  },
  {
    name: "Agent",
    path: "AGENT.md",
    type: "file",
  },
  {
    name: "Cline",
    path: ".clinerules/",
    type: "directory",
  },
  {
    name: "Kilo Code",
    path: ".kilocode/",
    type: "directory",
  },
  {
    name: "Roo Code",
    path: ".roo/",
    type: "directory",
  },
  {
    name: "Windsurf",
    path: ".windsurf/",
    type: "directory",
  },
  {
    name: "Cursor",
    path: ".cursor/rules/",
    type: "directory",
  },
];
