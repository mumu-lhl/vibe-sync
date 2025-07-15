import type { ResolvedSyncObject } from "../config.ts";
import {
  areDirsEqual,
  areFilesEqual,
  getAllFiles,
  type SyncAction,
} from "../sync-operations.ts";
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
  subdirMappings: SubdirMapping[],
): Promise<SyncAction[]> {
  const actions: SyncAction[] = [];

  for (const mapping of subdirMappings) {
    const sourcePath = path.join(source.path, mapping.src);
    const destPath = path.join(dest.path, mapping.dest);

    let sourceStat;
    try {
      sourceStat = await fs.stat(sourcePath);
    } catch {
      continue;
    }

    const isSourceDir = sourceStat.isDirectory();
    const filesInSource = isSourceDir
      ? await getAllFiles(sourcePath)
      : [sourcePath];

    const filesToCopy = mapping.filter
      ? filesInSource.filter((f) =>
          mapping.filter!(
            isSourceDir ? path.relative(sourcePath, f) : path.basename(f),
          ),
        )
      : filesInSource;

    if (filesToCopy.length > 0) {
      const destDir = isSourceDir ? destPath : path.dirname(destPath);
      actions.push({
        type: "mkdir",
        directory: destDir,
        options: { recursive: true },
      });
    }

    for (const sourceFile of filesToCopy) {
      const relativePath = isSourceDir
        ? path.relative(sourcePath, sourceFile)
        : "";

      const destFileName = mapping.rename
        ? mapping.rename(path.basename(sourceFile))
        : path.basename(sourceFile);

      const destinationFile = isSourceDir
        ? path.join(destPath, relativePath)
        : destPath;

      const finalDestination = mapping.rename
        ? path.join(path.dirname(destinationFile), destFileName)
        : destinationFile;

      actions.push({
        type: "copy",
        source: sourceFile,
        destination: finalDestination,
        options: { force: true },
      });
    }
  }
  return actions;
}

export async function checkWithRename(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
  subdirMappings: SubdirMapping[],
): Promise<boolean> {
  for (const mapping of subdirMappings) {
    const sourcePath = path.join(source.path, mapping.src);
    const destPath = path.join(dest.path, mapping.dest);

    try {
      const sourceStat = await fs.stat(sourcePath);
      const finalDestPath = mapping.rename
        ? path.join(
            path.dirname(destPath),
            mapping.rename(path.basename(sourcePath)),
          )
        : destPath;

      let destStat;
      try {
        destStat = await fs.stat(finalDestPath);
      } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "ENOENT") {
          return false;
        } else {
          throw e;
        }
      }

      if (sourceStat.isDirectory() && destStat.isDirectory()) {
        const options = { rename: mapping.rename, filter: mapping.filter };
        if (!(await areDirsEqual(sourcePath, destPath, options))) {
          return false;
        }
      } else if (sourceStat.isFile()) {
        if (
          !destStat.isFile() ||
          !(await areFilesEqual(sourcePath, finalDestPath))
        ) {
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        try {
          await fs.stat(destPath);
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
