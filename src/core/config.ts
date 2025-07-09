import { z } from 'zod';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { presets } from './presets.ts';
import chalk from 'chalk';

export const SyncObjectSchema = z.union([
    z.string(),
    z.object({
        custom: z.string(),
    }),
]);

export const VibeSyncConfigSchema = z.object({
    version: z.number(),
    sync_from: SyncObjectSchema,
    sync_to: z.array(SyncObjectSchema),
});

export type VibeSyncConfig = z.infer<typeof VibeSyncConfigSchema>;
export type SyncObject = z.infer<typeof SyncObjectSchema>;

export type ResolvedSyncObject = {
    name?: string;
    path: string;
    type: 'file' | 'directory';
};

export function resolveSyncObject(syncObject: SyncObject): ResolvedSyncObject {
    let p: string;
    let type: 'file' | 'directory' | undefined;
    let name: string | undefined;

    if (typeof syncObject === 'string') {
        const preset = presets.find((pr: { name: string; }) => pr.name === syncObject);
        if (preset) {
            p = preset.path;
            type = preset.type;
            name = preset.name;
        } else {
            p = syncObject;
        }
    } else {
        throw new Error('Invalid preset sync object');
    }

    const absolutePath = path.resolve(process.cwd(), p);

    if (type === undefined) {
        try {
            const stats = fs.statSync(absolutePath);
            type = stats.isDirectory() ? 'directory' : 'file';
        } catch (e) {
            // Doesn't exist, guess based on trailing slash
            type = p.endsWith('/') || p.endsWith('\\') ? 'directory' : 'file';
        }
    }

    return {
        name: name,
        path: absolutePath,
        type: type,
    };
}

export function loadConfig(filePath: string = 'vibesync.yaml'): VibeSyncConfig {
    const configPath = path.resolve(process.cwd(), filePath);
    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);
        return VibeSyncConfigSchema.parse(config);
    } catch (e) {
        console.error(chalk.red(`Error reading or parsing ${configPath}:`), e);
        process.exit(1);
    }
}

export async function generateConfig(filePath: string = 'vibesync.yaml') {
    const configPath = path.resolve(process.cwd(), filePath);
    const defaultConfigContent = `# Vibe Sync Configuration

version: 1

sync_from: "Gemini"
# sync_from:
#   - custom: xxx/xxx/xxx

sync_to:
  - "Claude Code"
  - "Cline"
  - "Kilo Code"
  - "Jules"
  - "Roo Code"`;

    if (fs.existsSync(configPath)) {
        console.log(chalk.yellow(`${filePath} already exists. Aborting initialization.`));
        return;
    }

    try {
        fs.writeFileSync(configPath, defaultConfigContent);
        console.log(chalk.bold.green(`${filePath} created successfully!`));
    } catch (error) {
        console.error(chalk.bold.red(`Failed to create ${filePath}:`), error);
    }
}
