import { type ResolvedSyncObject } from "./config.ts";
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

export async function handleDirectoryToFileMerge(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
): Promise<boolean> {
  if (source.type !== "directory" || dest.type !== "file") {
    return false;
  }

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

  return true;
}
