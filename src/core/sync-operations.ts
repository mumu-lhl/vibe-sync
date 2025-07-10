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
    const relativeFiles2 = files2.map((file) => path.relative(dir2, file));

    if (relativeFiles1.length !== relativeFiles2.length) {
      return false;
    }

    relativeFiles1.sort();
    relativeFiles2.sort();

    for (let i = 0; i < relativeFiles1.length; i++) {
      if (relativeFiles1[i] !== relativeFiles2[i]) {
        return false;
      }
      const filePath1 = path.join(dir1, relativeFiles1[i]);
      const filePath2 = path.join(dir2, relativeFiles2[i]);
      if (!(await areFilesEqual(filePath1, filePath2))) {
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
