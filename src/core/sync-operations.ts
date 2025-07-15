import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { createHash } from "crypto";

// Action types
export interface CopyAction {
  type: "copy";
  source: string;
  destination: string;
  options: import("fs").CopyOptions;
}

export interface MkdirAction {
  type: "mkdir";
  directory: string;
  options: import("fs").MakeDirectoryOptions;
}

export interface MergeAction {
  type: "merge";
  sources: string[];
  destination: string;
}

export type SyncAction = CopyAction | MkdirAction | MergeAction;

// Action execution
export async function executeAction(action: SyncAction): Promise<void> {
  switch (action.type) {
    case "copy":
      console.log(
        chalk.blue(`Copying: ${action.source} to ${action.destination}`),
      );
      await fs.cp(action.source, action.destination, action.options);
      break;
    case "mkdir":
      try {
        await fs.access(action.directory, fs.constants.F_OK);
      } catch {
        console.log(chalk.blue(`Creating directory: ${action.directory}`));
      }
      await fs.mkdir(action.directory, action.options);
      break;
    case "merge":
      console.log(
        chalk.blue(
          `Merging ${action.sources.length} files into ${action.destination}`,
        ),
      );
      const contents = await Promise.all(
        action.sources.map((file) => fs.readFile(file, "utf-8")),
      );
      await fs.writeFile(action.destination, contents.join("\n"));
      break;
  }
}

// Helper function to recursively get all file paths in a directory
export async function getAllFiles(dirPath: string): Promise<string[]> {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true });
  const filePromises = dirents.map(async (dirent) => {
    const res = path.resolve(dirPath, dirent.name);
    return dirent.isDirectory() ? getAllFiles(res) : [res];
  });
  const files = await Promise.all(filePromises);
  return files.flat();
}

// Comparison helpers
async function getFileHash(filePath: string): Promise<string> {
  try {
    const fileContent = await fs.readFile(filePath);
    return createHash("sha256").update(fileContent).digest("hex");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return ""; // Return empty for non-existent files
    }
    throw error;
  }
}

export async function areFilesEqual(
  path1: string,
  path2: string,
): Promise<boolean> {
  const [hash1, hash2] = await Promise.all([
    getFileHash(path1),
    getFileHash(path2),
  ]);
  return hash1 === hash2;
}

export async function areDirsEqual(
  dir1: string,
  dir2: string,
  options: {
    filter?: (file: string) => boolean;
    rename?: (file: string) => string;
  } = {},
): Promise<boolean> {
  try {
    const [files1, files2] = await Promise.all([
      getAllFiles(dir1).then((files) =>
        options.filter ? files.filter(options.filter) : files,
      ),
      getAllFiles(dir2).then((files) =>
        options.filter ? files.filter(options.filter) : files,
      ),
    ]);

    const relativeFiles1 = files1.map((file) => path.relative(dir1, file));
    let relativeFiles2 = files2.map((file) => path.relative(dir2, file));

    if (options.rename) {
      relativeFiles2 = relativeFiles2.map(options.rename);
    }

    if (relativeFiles1.length !== relativeFiles2.length) {
      return false;
    }

    const fileMap1 = new Map(
      relativeFiles1.map((file, i) => [file, files1[i]]),
    );
    const fileMap2 = new Map(
      relativeFiles2.map((file, i) => [file, files2[i]]),
    );

    if (fileMap1.size !== fileMap2.size) {
      return false;
    }

    for (const [relativeFile, fullPath1] of fileMap1.entries()) {
      const fullPath2 = fileMap2.get(relativeFile);
      if (!fullPath2) {
        return false;
      }
      if (!(await areFilesEqual(fullPath1, fullPath2))) {
        return false;
      }
    }

    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false; // If one of the directories doesn't exist
    }
    throw error;
  }
}
