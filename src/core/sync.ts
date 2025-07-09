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

export async function sync() {
    const config = loadConfig();

    console.log(chalk.bold.cyan('Starting sync...\n'));

    try {
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
