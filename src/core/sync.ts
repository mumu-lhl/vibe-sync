import { loadConfig, resolveSyncObject, ResolvedSyncObject } from './config.ts';
import fs from 'fs/promises';
import path from 'path';

async function copySourceToDest(source: ResolvedSyncObject, dest: ResolvedSyncObject) {
    console.log(`Syncing from ${source.path} to: ${dest.path}`);

    // Ensure the parent directory of the destination exists
    const destParentDir = dest.type === 'directory' ? dest.path : path.dirname(dest.path);
    await fs.mkdir(destParentDir, { recursive: true });

    const copyOptions = {
        recursive: true,
        force: true, // Allow overwriting
        filter: (srcPath: string) => {
            if (!source.excludedPaths || source.excludedPaths.length === 0) {
                return true; // No exclusions, copy everything
            }
            const relativePath = path.relative(source.path, srcPath);
            if (relativePath === '') {
                return true; // Always include the root source directory itself
            }
            const isExcluded = source.excludedPaths.some(excluded =>
                relativePath.startsWith(excluded)
            );
            if (isExcluded) {
                console.log(`Excluding: ${relativePath}`);
            }
            return !isExcluded;
        },
    };

    let finalDestPath = dest.path;
    if (source.type === 'file' && dest.type === 'directory') {
        finalDestPath = path.join(dest.path, path.basename(source.path));
    }

    await fs.cp(source.path, finalDestPath, copyOptions);
}

export async function sync() {
    const config = loadConfig();
    console.log('Configuration loaded:');
    console.dir(config, { depth: null });

    console.log('\nStarting sync...');

    try {
        const source = resolveSyncObject(config.sync_from);
        const destinations = config.sync_to.map(resolveSyncObject);

        for (const dest of destinations) {
            await copySourceToDest(source, dest);
        }

        console.log('\nSync completed successfully!');
    } catch (error) {
        console.error('\nSync failed:', error);
        process.exit(1);
    }
}
