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

export interface TransformAction {
  type: "transform";
  source: string;
  destination: string;
  transform: (content: string) => string;
}

export type SyncAction =
  | CopyAction
  | MkdirAction
  | MergeAction
  | TransformAction;

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
    case "transform":
      console.log(
        chalk.blue(`Transforming: ${action.source} to ${action.destination}`),
      );
      const sourceContent = await fs.readFile(action.source, "utf-8");
      const transformedContent = action.transform(sourceContent);
      await fs.writeFile(action.destination, transformedContent);
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
  options?: {
    transform?: (content: string) => string;
    verbose?: boolean;
  },
): Promise<boolean> {
  const [hash1, hash2] = await Promise.all([
    getFileHash(path1),
    getFileHash(path2),
  ]);
  if (options?.transform) {
    const content1 = await fs.readFile(path1, "utf-8");
    const transformedContent1 = options.transform(content1);
    const transformedHash1 = createHash("sha256")
      .update(transformedContent1)
      .digest("hex");
    return transformedHash1 === hash2;
  }
  const areEqual = hash1 === hash2;
  if (options?.verbose && !areEqual) {
    console.log(
      chalk.yellow(
        `    - File content mismatch: ${path.basename(
          path1,
        )} vs ${path.basename(path2)}`,
      ),
    );
  }
  return areEqual;
}

export async function areDirsEqual(
  dir1: string,
  dir2: string,
  options: {
    filter?: (file: string) => boolean;
    rename?: (file: string) => string;
    verbose?: boolean;
  } = {},
): Promise<boolean> {
  try {
    if (options.verbose) {
      console.log(chalk.gray(`  Comparing directories: ${dir1} and ${dir2}`));
    }
    const [files1, files2] = await Promise.all([
      getAllFiles(dir1),
      getAllFiles(dir2),
    ]);

    const relativeFiles1 = files1.map((file) => path.relative(dir1, file));
    const fileMap1 = new Map<string, string>();
    for (const [i, relativeFile] of relativeFiles1.entries()) {
      if (!options.filter || options.filter(relativeFile)) {
        fileMap1.set(relativeFile, files1[i]);
      }
    }

    const fileMap2 = new Map(
      files2.map((file) => [path.relative(dir2, file), file]),
    );

    // Now, construct the expected destination file list based on source
    const expectedDestFiles = new Set<string>();
    for (const relativeFile of fileMap1.keys()) {
      const destRelative = options.rename
        ? options.rename(relativeFile)
        : relativeFile;
      expectedDestFiles.add(destRelative);
    }

    // Check for extra files in destination
    for (const relativeFile of fileMap2.keys()) {
      if (!expectedDestFiles.has(relativeFile)) {
        if (options.verbose) {
          console.log(
            chalk.yellow(`    - Extra file in destination: ${relativeFile}`),
          );
        }
        return false;
      }
    }

    // Check for missing files and content mismatch
    for (const [relativeFile, fullPath1] of fileMap1.entries()) {
      const destRelativeFile = options.rename
        ? options.rename(relativeFile)
        : relativeFile;
      const fullPath2 = fileMap2.get(destRelativeFile);

      if (!fullPath2) {
        if (options.verbose) {
          console.log(
            chalk.yellow(
              `    - Missing file in destination: ${destRelativeFile}`,
            ),
          );
        }
        return false;
      }
      if (
        !(await areFilesEqual(fullPath1, fullPath2, {
          verbose: options.verbose,
        }))
      ) {
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
