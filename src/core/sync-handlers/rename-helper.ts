import type { ResolvedSyncObject } from "../config.ts";
import { areDirsEqual, type SyncAction } from "../sync-operations.ts";
import fs from "fs/promises";
import path from "path";

export type SubdirMapping = {
  src: string;
  dest: string;
  rename?: (fileName: string) => string;
  filter?: (src: string) => boolean;
};

export async function planWithRename(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
  subdirMappings: SubdirMapping[]
): Promise<SyncAction[]> {
  const actions: SyncAction[] = [];

  for (const mapping of subdirMappings) {
    const sourceSubdir = path.join(source.path, mapping.src);
    const destSubdir = path.join(dest.path, mapping.dest);

    try {
      const sourceStat = await fs.stat(sourceSubdir);
      if (sourceStat.isDirectory()) {
        actions.push({
          type: "mkdir",
          directory: destSubdir,
          options: { recursive: true },
        });

        const cpOptions: import("fs").CopyOptions & {
          rename?: (dest: string) => string;
          filter?: (src: string) => boolean;
        } = {
          recursive: true,
          force: true,
        };

        if (mapping.rename) {
          cpOptions.rename = mapping.rename;
        }

        if (mapping.filter) {
          cpOptions.filter = mapping.filter;
        }

        actions.push({
          type: "copy",
          source: sourceSubdir,
          destination: destSubdir,
          options: cpOptions,
        });
      }
    } catch {
      // Dir doesn't exist, ignore.
    }
  }
  return actions;
}

export async function checkWithRename(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
  subdirMappings: SubdirMapping[]
): Promise<boolean> {
  for (const mapping of subdirMappings) {
    const sourceSubdir = path.join(source.path, mapping.src);
    const destSubdir = path.join(dest.path, mapping.dest);

    try {
      const sourceStat = await fs.stat(sourceSubdir);
      if (sourceStat.isDirectory()) {
        const options: {
          rename?: (fileName: string) => string;
          filter?: (src: string) => boolean;
        } = { rename: mapping.rename, filter: mapping.filter };

        if (!(await areDirsEqual(sourceSubdir, destSubdir, options))) {
          return false;
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        try {
          await fs.stat(destSubdir);
          return false;
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
