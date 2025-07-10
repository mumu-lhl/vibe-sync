import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import {
  areDirsEqual,
  areFilesEqual,
  type SyncAction,
} from "../sync-operations.ts";
import fs from "fs/promises";
import path from "path";

export class CodeSyncHandler implements SyncHandler {
  private isSpecialCode(name: string): boolean {
    return name === "Kilo Code" || name === "Roo Code";
  }

  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    const isSpecialSource = !!source.name && this.isSpecialCode(source.name);
    const isSpecialDest = !!dest.name && this.isSpecialCode(dest.name);
    return (isSpecialSource || isSpecialDest) && dest.type !== "file";
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const isSpecialSource = !!source.name && this.isSpecialCode(source.name);

    if (isSpecialSource) {
      return this.planSubdirs(source, dest);
    } else {
      return this.planToSpecialDest(source, dest);
    }
  }

  private async planSubdirs(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const actions: SyncAction[] = [];
    const subdirs = ["rules", "workflows"];
    for (const subdir of subdirs) {
      const sourceSubdir = path.join(source.path, subdir);
      const destSubdir = path.join(dest.path, subdir);
      try {
        const sourceStat = await fs.stat(sourceSubdir);
        if (sourceStat.isDirectory()) {
          actions.push({
            type: "mkdir",
            directory: destSubdir,
            options: { recursive: true },
          });
          actions.push({
            type: "copy",
            source: sourceSubdir,
            destination: destSubdir,
            options: { recursive: true, force: true },
          });
        }
      } catch {
        // Dir doesn't exist, ignore.
      }
    }
    return actions;
  }

  private async planToSpecialDest(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const actions: SyncAction[] = [];
    const rulesDestPath = path.join(dest.path, "rules");
    actions.push({
      type: "mkdir",
      directory: rulesDestPath,
      options: { recursive: true },
    });

    let finalDestPath = rulesDestPath;
    if (source.type === "file") {
      finalDestPath = path.join(rulesDestPath, "vibesync.md");
    }

    actions.push({
      type: "copy",
      source: source.path,
      destination: finalDestPath,
      options: { recursive: true, force: true },
    });

    return actions;
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    const isSpecialSource = !!source.name && this.isSpecialCode(source.name);

    if (isSpecialSource) {
      return this.checkSubdirs(source, dest);
    } else {
      return this.checkToSpecialDest(source, dest);
    }
  }

  private async checkSubdirs(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    const subdirs = ["rules", "workflows"];
    for (const subdir of subdirs) {
      const sourceSubdir = path.join(source.path, subdir);
      const destSubdir = path.join(dest.path, subdir);
      try {
        const sourceStat = await fs.stat(sourceSubdir);
        if (sourceStat.isDirectory()) {
          if (!(await areDirsEqual(sourceSubdir, destSubdir))) {
            return false;
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          // If source doesn't exist, check if dest also doesn't exist.
          try {
            await fs.stat(destSubdir);
            return false; // Dest exists but source doesn't.
          } catch {
            // Both don't exist, which is fine.
          }
        } else {
          throw error;
        }
      }
    }
    return true;
  }

  private async checkToSpecialDest(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    const rulesDestPath = path.join(dest.path, "rules");
    let finalDestPath = rulesDestPath;
    if (source.type === "file") {
      finalDestPath = path.join(rulesDestPath, "vibesync.md");
      return areFilesEqual(source.path, finalDestPath);
    } else {
      return areDirsEqual(source.path, finalDestPath);
    }
  }
}
