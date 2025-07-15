import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import type { SyncAction } from "../sync-operations.ts";
import {
  checkWithRename,
  planWithRename,
  type SubdirMapping,
} from "./rename-helper.ts";

export class CursorSyncHandler implements SyncHandler {
  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    return (
      (source.name === "Cursor" || dest.name === "Cursor") &&
      dest.type !== "file"
    );
  }

  private getSubdirMappings(isCursorDest: boolean): SubdirMapping[] {
    const renameToMdc = (fileName: string) => fileName.replace(/\.md$/, ".mdc");
    const renameToMd = (fileName: string) => fileName.replace(/\.mdc$/, ".md");

    return isCursorDest
      ? [{ src: "", dest: "rules", rename: renameToMdc }]
      : [{ src: "rules", dest: "", rename: renameToMd }];
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const isCursorDest = dest.name === "Cursor";
    const subdirMappings = this.getSubdirMappings(isCursorDest);
    return planWithRename(source, dest, subdirMappings);
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    const isCursorDest = dest.name === "Cursor";
    const subdirMappings = this.getSubdirMappings(isCursorDest);
    return checkWithRename(source, dest, subdirMappings);
  }
}
