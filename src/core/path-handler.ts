import { type ResolvedSyncObject } from "./config.ts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

async function handleClineSync(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
): Promise<boolean> {
  if (
    (source.name !== "Cline" && dest.name !== "Cline") ||
    dest.type === "file"
  ) {
    return false;
  }

  const isClineDest = dest.name === "Cline";
  const subdirMappings = isClineDest
    ? [
        { src: "rules", dest: "" },
        { src: "workflows", dest: "workflows" },
      ]
    : [
        { src: "", dest: "rules" },
        { src: "workflows", dest: "workflows" },
      ];

  for (const mapping of subdirMappings) {
    const sourceSubdir = path.join(source.path, mapping.src);
    const destSubdir = path.join(dest.path, mapping.dest);

    try {
      const sourceStat = await fs.stat(sourceSubdir);
      if (sourceStat.isDirectory()) {
        console.log(
          chalk.blue(`Syncing subdirectory: ${sourceSubdir} to ${destSubdir}`),
        );
        await fs.mkdir(destSubdir, { recursive: true });

        const cpOptions: import("fs").CopyOptions = {
          recursive: true,
          force: true,
        };

        if (!isClineDest && mapping.src === "") {
          cpOptions.filter = (src) => {
            const workflowsDir = path.join(source.path, "workflows");
            return src !== workflowsDir;
          };
        }

        await fs.cp(sourceSubdir, destSubdir, cpOptions);
      }
    } catch {
      // Dir doesn't exist, ignore.
    }
  }

  console.log(chalk.green(`Subdirectory sync for Cline completed.`));
  return true;
}

async function handleCodeSync(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
): Promise<boolean> {
  const isSpecialSource =
    source.name === "Kilo Code" || source.name === "Roo Code";
  const isSpecialDest = dest.name === "Kilo Code" || dest.name === "Roo Code";

  if ((!isSpecialSource && !isSpecialDest) || dest.type === "file") {
    return false;
  }

  if (isSpecialSource) {
    const subdirs = ["rules", "workflows"];
    for (const subdir of subdirs) {
      const sourceSubdir = path.join(source.path, subdir);
      const destSubdir = path.join(dest.path, subdir);
      try {
        const sourceStat = await fs.stat(sourceSubdir);
        if (sourceStat.isDirectory()) {
          console.log(
            chalk.blue(
              `Syncing subdirectory: ${sourceSubdir} to ${destSubdir}`,
            ),
          );
          await fs.mkdir(destSubdir, { recursive: true });
          await fs.cp(sourceSubdir, destSubdir, {
            recursive: true,
            force: true,
          });
        }
      } catch {
        // Dir doesn't exist, ignore.
      }
    }
    console.log(chalk.green(`Subdirectory sync for ${source.name} completed.`));
    return true;
  } else {
    // Destination is Kilo Code or Roo Code
    const rulesDestPath = path.join(dest.path, "rules");
    console.log(
      chalk.blue(
        `Syncing to ${dest.name}'s "rules" directory: ${rulesDestPath}`,
      ),
    );
    await fs.mkdir(rulesDestPath, { recursive: true });
    let finalDestPath = rulesDestPath;
    if (source.type === "file") {
      finalDestPath = path.join(rulesDestPath, "vibesync.md");
    }
    await fs.cp(source.path, finalDestPath, { recursive: true, force: true });
    console.log(chalk.green(`Sync to ${dest.name} completed.`));
    return true;
  }
}

export async function handleSpecialPaths(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
): Promise<boolean> {
  if (await handleClineSync(source, dest)) {
    return true;
  }
  if (await handleCodeSync(source, dest)) {
    return true;
  }
  return false;
}
