import {
  loadConfig,
  resolveSyncObject,
  type ResolvedSyncObject,
} from "./config.ts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { handleSpecialPaths } from "./path-handler.ts";
import { handleDirectoryToFileMerge } from "./content-handler.ts";

async function copySourceToDest(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
) {
  console.log(chalk.blue(`Syncing from ${source.path} to: ${dest.path}`));

  if (await handleSpecialPaths(source, dest)) {
    return;
  }

  // Ensure the parent directory of the destination exists
  const destParentDir =
    dest.type === "directory" ? dest.path : path.dirname(dest.path);
  await fs.mkdir(destParentDir, { recursive: true });

  if (await handleDirectoryToFileMerge(source, dest)) {
    return;
  }

  // Standard copy logic for file-to-file, file-to-dir, and dir-to-dir
  const copyOptions = {
    recursive: true,
    force: true, // Allow overwriting
  };

  let finalDestPath = dest.path;
  if (source.type === "file" && dest.type === "directory") {
    finalDestPath = path.join(dest.path, "vibesync.md");
  }

  await fs.cp(source.path, finalDestPath, copyOptions);
  console.log(chalk.green(`Synced to ${finalDestPath}`));
}

export async function sync(filePath?: string) {
  try {
    const config = loadConfig(filePath);

    console.log(chalk.bold.cyan("Starting sync...\n"));

    const source = resolveSyncObject(config.sync_from);
    const destinations = config.sync_to.map(resolveSyncObject);

    for (const dest of destinations) {
      await copySourceToDest(source, dest);
    }

    console.log(chalk.bold.green("\nSync completed successfully!"));
  } catch (error) {
    console.error(chalk.bold.red("\nSync failed:"), error);
    process.exit(1);
  }
}
