import { loadConfig, resolveSyncObject, type ResolvedSyncObject } from './config.ts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

// Helper function to recursively get all file paths in a directory
async function getAllFiles(dirPath: string): Promise<string[]> {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    const filePromises = dirents.map(async (dirent) => {
        const res = path.resolve(dirPath, dirent.name);
        return dirent.isDirectory() ? getAllFiles(res) : [res];
    });
    const files = await Promise.all(filePromises);
    return files.flat();
}


async function copySourceToDest(source: ResolvedSyncObject, dest: ResolvedSyncObject) {
    console.log(chalk.blue(`Syncing from ${source.path} to: ${dest.path}`));

    // Special handling for Cline
    if ((source.name === 'Cline' || dest.name === 'Cline') && dest.type !== 'file') {
        let handled = false;
        const isClineDest = dest.name === 'Cline';

        const subdirMappings = isClineDest
            ? [
                { src: 'rules', dest: '' },
                { src: 'workflows', dest: 'workflows' },
            ]
            : [
                { src: '', dest: 'rules' },
                { src: 'workflows', dest: 'workflows' },
            ];

        for (const mapping of subdirMappings) {
            const sourceSubdir = path.join(source.path, mapping.src);
            const destSubdir = path.join(dest.path, mapping.dest);

            try {
                const sourceStat = await fs.stat(sourceSubdir);

                if (sourceStat.isDirectory()) {
                    console.log(chalk.blue(`Syncing subdirectory: ${sourceSubdir} to ${destSubdir}`));
                    await fs.mkdir(destSubdir, { recursive: true });

                    const cpOptions: import('fs').CopyOptions = {
                        recursive: true,
                        force: true,
                    };

                    if (!isClineDest && mapping.src === '') {
                        cpOptions.filter = (src) => {
                            const workflowsDir = path.join(source.path, 'workflows');
                            return src !== workflowsDir;
                        };
                    }

                    await fs.cp(sourceSubdir, destSubdir, cpOptions);
                    handled = true;
                }
            } catch (error) {
                // If a directory doesn't exist, stat will throw. We can ignore this.
            }
        }

        if (handled) {
            console.log(chalk.green(`Subdirectory sync for Cline completed.`));
            return;
        }
    }

    // Special handling for Kilo Code and Roo Code
    if ((source.name === 'Kilo Code' || source.name === 'Roo Code' || dest.name === 'Kilo Code' || dest.name === 'Roo Code') && dest.type !== 'file') {
        const isSourceSpecial = source.name === 'Kilo Code' || source.name === 'Roo Code';

        if (isSourceSpecial) {
            const subdirs = ['rules', 'workflows'];
            let handled = false;

            for (const subdir of subdirs) {
                const sourceSubdir = path.join(source.path, subdir);
                const destSubdir = path.join(dest.path, subdir);

                try {
                    const sourceStat = await fs.stat(sourceSubdir);

                    if (sourceStat.isDirectory()) {
                        console.log(chalk.blue(`Syncing subdirectory: ${sourceSubdir} to ${destSubdir}`));
                        await fs.mkdir(destSubdir, { recursive: true });
                        await fs.cp(sourceSubdir, destSubdir, { recursive: true, force: true });
                        handled = true;
                    }
                } catch (error) {
                    // If a directory doesn't exist, stat will throw. We can ignore this.
                }
            }

            if (handled) {
                // If we performed a sync of subdirectories, we might want to skip the main copy.
                // Let's assume for now that if subdirectories are synced, the top-level sync is not needed.
                console.log(chalk.green(`Subdirectory sync for ${source.name} completed.`));
                return;
            }
        } else { // Destination is Kilo Code or Roo Code, and source is not.
            const rulesDestPath = path.join(dest.path, 'rules');
            console.log(chalk.blue(`Syncing to ${dest.name}'s "rules" directory: ${rulesDestPath}`));
            await fs.mkdir(rulesDestPath, { recursive: true });

            let finalDestPath = rulesDestPath;
            if (source.type === 'file') {
                finalDestPath = path.join(rulesDestPath, 'vibesync.md');
            }

            await fs.cp(source.path, finalDestPath, { recursive: true, force: true });
            console.log(chalk.green(`Sync to ${dest.name} completed.`));
            return;
        }
    }

    // Ensure the parent directory of the destination exists
    const destParentDir = dest.type === 'directory' ? dest.path : path.dirname(dest.path);
    await fs.mkdir(destParentDir, { recursive: true });

    // Handle directory to file merge
    if (source.type === 'directory' && dest.type === 'file') {
        console.log(chalk.blue(`Merging files from directory ${source.path} into file ${dest.path}`));

        const allFiles = await getAllFiles(source.path);

        const contentPromises = allFiles.map(filePath => fs.readFile(filePath, 'utf-8'));
        const contents = await Promise.all(contentPromises);

        const mergedContent = contents.join('\n');

        await fs.writeFile(dest.path, mergedContent);
        console.log(chalk.green(`Successfully merged ${allFiles.length} files into ${dest.path}`));
        return;
    }

    // Existing logic for file->file, file->dir, dir->dir
    const copyOptions = {
        recursive: true,
        force: true, // Allow overwriting
    };

    let finalDestPath = dest.path;
    if (source.type === 'file' && dest.type === 'directory') {
        finalDestPath = path.join(dest.path, 'vibesync.md');
    }

    await fs.cp(source.path, finalDestPath, copyOptions);
}

export async function sync(filePath?: string) {
    try {
        const config = loadConfig(filePath);

        console.log(chalk.bold.cyan('Starting sync...\n'));

        const source = resolveSyncObject(config.sync_from);
        const destinations = config.sync_to.map(resolveSyncObject);

        for (const dest of destinations) {
            await copySourceToDest(source, dest);
        }

        console.log(chalk.bold.green('\nSync completed successfully!'));
    } catch (error) {
        console.error(chalk.bold.red('\nSync failed:'), error);
        process.exit(1);
    }
}
