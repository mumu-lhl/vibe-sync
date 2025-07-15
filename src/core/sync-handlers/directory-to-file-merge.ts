import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import {
  areFilesEqual,
  getAllFiles,
  type SyncAction,
} from "../sync-operations.ts";
import fs from "fs/promises";
import os from "os";
import path from "path";

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
    verbose?: boolean,
  ): Promise<boolean> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vibesync-"));
    const tempMergedFilePath = path.join(tempDir, "merged-file");

    try {
      const allFiles = await getAllFiles(source.path);
      if (allFiles.length === 0) {
        // If source is empty, check if dest exists and is empty.
        try {
          const destStat = await fs.stat(dest.path);
          return destStat.size === 0;
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            return true; // Dest doesn't exist, which is correct for empty source.
          }
          throw error;
        }
      }

      const contents = await Promise.all(
        allFiles.map((file) => fs.readFile(file, "utf-8")),
      );
      await fs.writeFile(tempMergedFilePath, contents.join("\n"));

      return areFilesEqual(tempMergedFilePath, dest.path, verbose);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
