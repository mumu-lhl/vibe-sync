import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

// Helper function to recursively get all file paths in a directory
async function getAllFiles(dirPath: string): Promise<string[]> {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true });
  const filePromises = dirents.map(async (dirent) => {
    const res = path.resolve(dirPath, dirent.name);
    return dirent.isDirectory() ? getAllFiles(res) : [res];
  });
  const files = await Promise.all(filePromises);
  return files.flat();
}

export class DirectoryToFileMergeHandler implements SyncHandler {
  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    return source.type === "directory" && dest.type === "file";
  }

  async sync(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<void> {
    console.log(
      chalk.blue(
        `Merging files from directory ${source.path} into file ${dest.path}`,
      ),
    );

    const allFiles = await getAllFiles(source.path);
    const contentPromises = allFiles.map((filePath) =>
      fs.readFile(filePath, "utf-8"),
    );
    const contents = await Promise.all(contentPromises);
    const mergedContent = contents.join("\n");

    await fs.writeFile(dest.path, mergedContent);
    console.log(
      chalk.green(
        `Successfully merged ${allFiles.length} files into ${dest.path}`,
      ),
    );
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
