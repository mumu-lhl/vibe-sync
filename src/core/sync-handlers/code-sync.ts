import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import type { SyncAction } from "../sync-operations.ts";
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
    // TODO: Implement check logic
    console.warn("Check logic not implemented for CodeSyncHandler");
    return false;
  }
}
