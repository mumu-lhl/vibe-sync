import { loadConfig, type SyncObject } from './config.ts';
import fs from 'fs/promises';
import path from 'path';

async function resolveSyncObject(syncObject: SyncObject): Promise<string> {
    if (typeof syncObject === 'string') {
        // For string-based sources, we can have a map or a switch statement
        // to handle different predefined services.
        // For this example, we'll just return a placeholder.
        console.log(`Resolving from predefined source: ${syncObject}`);
        return `Simulated content from ${syncObject}`;
    } else if (typeof syncObject === 'object' && 'custom' in syncObject) {
        // For custom sources, we'll treat the value as a file path.
        const filePath = path.resolve(syncObject.custom);
        console.log(`Resolving from custom file source: ${filePath}`);
        return await fs.readFile(filePath, 'utf-8');
    }
    throw new Error('Invalid sync object for source');
}

async function pushToSyncObject(syncObject: SyncObject, content: string): Promise<void> {
    if (typeof syncObject === 'string') {
    } else {
        throw new Error('Invalid sync object');
    }
    // Simulate pushing content
    console.log(`Content pushed: "${content}"`);
}

export async function sync() {
    const config = loadConfig();
    console.log('Configuration loaded:');
    console.log(config);

    console.log('\nStarting sync...');

    try {
        const sourceContent = await resolveSyncObject(config.sync_from);
        console.log(`Successfully fetched content from source.`);

        for (const dest of config.sync_to) {
            await pushToSyncObject(dest, sourceContent);
        }

        console.log('\nSync completed successfully!');
    } catch (error) {
        console.error('\nSync failed:', error);
        process.exit(1);
    }
}
