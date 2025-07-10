import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

export class CodeSyncHandler implements SyncHandler {
  private isSpecialCode(name: string): boolean {
    return name === "Kilo Code" || name === "Roo Code";
  }

  canHandle(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): boolean {
    const isSpecialSource = !!source.name && this.isSpecialCode(source.name);
    const isSpecialDest = !!dest.name && this.isSpecialCode(dest.name);
    return (isSpecialSource || isSpecialDest) && dest.type !== "file";
  }

  async sync(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<void> {
    const isSpecialSource = !!source.name && this.isSpecialCode(source.name);

    if (isSpecialSource) {
      await this.syncSubdirs(source, dest);
    } else {
      await this.syncToSpecialDest(source, dest);
    }
  }

  private async syncSubdirs(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<void> {
    const subdirs = ["rules", "workflows"];
    for (const subdir of subdirs) {
      const sourceSubdir = path.join(source.path, subdir);
      const destSubdir = path.join(dest.path, subdir);
      try {
        const sourceStat = await fs.stat(sourceSubdir);
        if (sourceStat.isDirectory()) {
          console.log(
            chalk.blue(
              `Syncing subdirectory: ${sourceSubdir} to ${destSubdir}`,
            ),
          );
          await fs.mkdir(destSubdir, { recursive: true });
          await fs.cp(sourceSubdir, destSubdir, {
            recursive: true,
            force: true,
          });
        }
      } catch {
        // Dir doesn't exist, ignore.
      }
    }
    const sourceName = source.name || source.path;
    const destName = dest.name || dest.path;
    console.log(
      chalk.green(`Sync from ${sourceName} to ${destName} completed.`),
    );
  }

  private async syncToSpecialDest(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<void> {
    const rulesDestPath = path.join(dest.path, "rules");
    console.log(
      chalk.blue(
        `Syncing to ${dest.name}'s "rules" directory: ${rulesDestPath}`,
      ),
    );
    await fs.mkdir(rulesDestPath, { recursive: true });
    let finalDestPath = rulesDestPath;
    if (source.type === "file") {
      finalDestPath = path.join(rulesDestPath, "vibesync.md");
    }
    await fs.cp(source.path, finalDestPath, { recursive: true, force: true });
    const sourceName = source.name || source.path;
    const destName = dest.name || dest.path;
    console.log(
      chalk.green(`Sync from ${sourceName} to ${destName} completed.`),
    );
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    // TODO: Implement check logic
    console.warn("Check logic not implemented for CodeSyncHandler");
    return false;
  }
}
