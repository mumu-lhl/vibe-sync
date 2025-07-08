import { z } from 'zod';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

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

export function loadConfig(): VibeSyncConfig {
    const configPath = path.join(process.cwd(), 'vibesync.yaml');
    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);
        return VibeSyncConfigSchema.parse(config);
    } catch (e) {
        console.error('Error reading or parsing vibesync.yaml:', e);
        process.exit(1);
    }
}
