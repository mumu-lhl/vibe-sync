import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

export class ClineSyncHandler implements SyncHandler {
  canHandle(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): boolean {
    return (source.name === "Cline" || dest.name === "Cline") && dest.type !== "file";
  }

  async sync(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<void> {
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
    const sourceName = source.name || source.path;
    const destName = dest.name || dest.path;
    console.log(
      chalk.green(`Sync from ${sourceName} to ${destName} completed.`),
    );
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    // TODO: Implement check logic
    console.warn("Check logic not implemented for ClineSyncHandler");
    return false;
  }
}
