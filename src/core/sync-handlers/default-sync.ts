import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

export class DefaultSyncHandler implements SyncHandler {
  canHandle(): boolean {
    // This handler is the fallback for standard copy operations.
    return true;
  }

  async sync(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<void> {
    // Ensure the parent directory of the destination exists
    const destParentDir =
      dest.type === "directory" ? dest.path : path.dirname(dest.path);
    await fs.mkdir(destParentDir, { recursive: true });

    const copyOptions = {
      recursive: true,
      force: true, // Allow overwriting
    };

    let finalDestPath = dest.path;
    if (source.type === "file" && dest.type === "directory") {
      // When copying a single file to a directory, copy it *into* the directory.
      // We'll use a default name, but this could be configured in the future.
      finalDestPath = path.join(dest.path, "vibesync.md");
    }

    await fs.cp(source.path, finalDestPath, copyOptions);
    console.log(chalk.green(`Synced to ${finalDestPath}`));
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    // TODO: Implement check logic
    console.warn("Check logic not implemented for DefaultSyncHandler");
    return false;
  }
}
