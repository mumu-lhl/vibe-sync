import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import {
  getAllFiles,
  type SyncAction,
} from "../sync-operations.ts";

export class DirectoryToFileMergeHandler implements SyncHandler {
  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    return source.type === "directory" && dest.type === "file";
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const allFiles = await getAllFiles(source.path);
    if (allFiles.length === 0) {
      return [];
    }
    return [
      {
        type: "merge",
        sources: allFiles,
        destination: dest.path,
      },
    ];
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    // TODO: Implement check logic
    console.warn("Check logic not implemented for DirectoryToFileMergeHandler");
    return false;
  }
}
