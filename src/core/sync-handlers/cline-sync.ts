import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import type { SyncAction } from "../sync-operations.ts";
import path from "path";
import {
  checkWithRename,
  planWithRename,
  type SubdirMapping,
} from "./rename-helper.ts";

export class ClineSyncHandler implements SyncHandler {
  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    return (
      (source.name === "Cline" || dest.name === "Cline") && dest.type !== "file"
    );
  }

  private getSubdirMappings(
    isClineDest: boolean,
    isCursorDest: boolean,
    source: ResolvedSyncObject,
  ): SubdirMapping[] {
    const renameToMdc = (fileName: string) => fileName.replace(/\.md$/, ".mdc");
    const renameToMd = (fileName: string) => fileName.replace(/\.mdc$/, ".md");
    let renameFunc = undefined;
    if (isCursorDest) {
      renameFunc = renameToMdc;
    } else if (source.name === "Cursor") {
      renameFunc = renameToMd;
    }

    return isClineDest
      ? [
          { src: "rules", dest: "", rename: renameFunc },
          { src: "workflows", dest: "workflows", rename: renameFunc },
        ]
      : [
          {
            src: "",
            dest: "rules",
            rename: renameFunc,
            filter: (src: string) =>
              !src.startsWith(path.join(source.path, "workflows")),
          },
          { src: "workflows", dest: "workflows", rename: renameFunc },
        ];
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const isClineDest = dest.name === "Cline";
    const isCursorDest = dest.name === "Cursor";
    const subdirMappings = this.getSubdirMappings(
      isClineDest,
      isCursorDest,
      source,
    );
    return planWithRename(source, dest, subdirMappings);
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
    verbose?: boolean,
  ): Promise<boolean> {
    const isClineDest = dest.name === "Cline";
    const isCursorDest = dest.name === "Cursor";
    const subdirMappings = this.getSubdirMappings(
      isClineDest,
      isCursorDest,
      source,
    );
    return checkWithRename(source, dest, subdirMappings, verbose);
  }
}
