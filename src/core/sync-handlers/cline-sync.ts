import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import { areDirsEqual, type SyncAction } from "../sync-operations.ts";
import fs from "fs/promises";
import path from "path";

export class ClineSyncHandler implements SyncHandler {
  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    return (
      (source.name === "Cline" || dest.name === "Cline") && dest.type !== "file"
    );
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const actions: SyncAction[] = [];
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
          actions.push({
            type: "mkdir",
            directory: destSubdir,
            options: { recursive: true },
          });

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

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
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
          const filter =
            !isClineDest && mapping.src === ""
              ? (src: string) => {
                  const workflowsDir = path.join(source.path, "workflows");
                  return !src.startsWith(workflowsDir);
                }
              : undefined;

          if (!(await areDirsEqual(sourceSubdir, destSubdir, { filter }))) {
            return false;
          }
        }
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          // If source doesn't exist, check if dest also doesn't exist.
          try {
            await fs.stat(destSubdir);
            return false; // Dest exists but source doesn't.
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
}
