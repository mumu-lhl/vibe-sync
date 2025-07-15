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

  private getSubdirMappings(isDestSpecial: boolean): SubdirMapping[] {
    const renameToMdc = (fileName: string) =>
      fileName.replace(/\.md$/, ".mdc");
    const renameToMd = (fileName: string) =>
      fileName.replace(/\.mdc$/, ".md");
    const renameFunc = isDestSpecial ? renameToMdc : renameToMd;

    return [
      { src: "rules", dest: "rules", rename: renameFunc },
      { src: "workflows", dest: "workflows" },
    ];
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const isDestSpecial = !!dest.name && this.isSpecialCode(dest.name);
    const subdirMappings = this.getSubdirMappings(isDestSpecial);
    return planWithRename(source, dest, subdirMappings);
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    const isDestSpecial = !!dest.name && this.isSpecialCode(dest.name);
    const subdirMappings = this.getSubdirMappings(isDestSpecial);
    return checkWithRename(source, dest, subdirMappings);
  }
}
