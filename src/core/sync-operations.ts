import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

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
