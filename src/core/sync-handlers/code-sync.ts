import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import {
  checkWithRename,
  planWithRename,
  type SubdirMapping,
} from "./rename-helper.ts";
import { type SyncAction } from "../sync-operations.ts";

export class CodeSyncHandler implements SyncHandler {
  private isSpecialCode(name: string): boolean {
    return name === "Kilo Code" || name === "Roo Code";
  }

  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    const isSpecialSource = !!source.name && this.isSpecialCode(source.name);
    const isSpecialDest = !!dest.name && this.isSpecialCode(dest.name);
    return (isSpecialSource || isSpecialDest) && dest.type !== "file";
  }

  private getSubdirMappings(
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

    return [
      { src: "rules", dest: "rules", rename: renameFunc },
      { src: "workflows", dest: "workflows", rename: renameFunc },
    ];
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const isCursorDest = dest.name === "Cursor";
    const subdirMappings = this.getSubdirMappings(isCursorDest, source);
    return planWithRename(source, dest, subdirMappings);
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    const isCursorDest = dest.name === "Cursor";
    const subdirMappings = this.getSubdirMappings(isCursorDest, source);
    return checkWithRename(source, dest, subdirMappings);
  }
}
