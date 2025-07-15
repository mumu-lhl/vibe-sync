import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import {
  areFilesEqual,
  getAllFiles,
  type SyncAction,
} from "../sync-operations.ts";
import path from "path";

const header = `---
alwaysApply: true
---`;

export class CursorSyncHandler implements SyncHandler {
  canHandle(source: ResolvedSyncObject, dest: ResolvedSyncObject): boolean {
    if (source.type === "file" && dest.name === "Cursor") {
      return false;
    }
    return (
      (source.name === "Cursor" || dest.name === "Cursor") &&
      dest.type !== "file"
    );
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject
  ): Promise<SyncAction[]> {
    const isCursorDest = dest.name === "Cursor";
    const sourcePath = source.path;
    const destPath = dest.path;
    const actions: SyncAction[] = [];

    const sourceFiles = await getAllFiles(sourcePath);

    for (const sourceFile of sourceFiles) {
      const relativePath = path.relative(sourcePath, sourceFile);
      let destFile = path.join(destPath, relativePath);
      let transform: (content: string) => string;

      if (isCursorDest) {
        if (!sourceFile.endsWith(".md")) continue;
        destFile = destFile.replace(/\.md$/, ".mdc");
        transform = (content) => `${header}\n${content}`;
      } else {
        if (!sourceFile.endsWith(".mdc")) continue;
        destFile = destFile.replace(/\.mdc$/, ".md");
        transform = (content) => content.replace(/^---\n[\s\S]*?\n---\n/m, "");
      }

      actions.push({
        type: "transform",
        source: sourceFile,
        destination: destFile,
        transform,
      });
    }

    return actions;
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
    verbose?: boolean
  ): Promise<boolean> {
    const isCursorDest = dest.name === "Cursor";
    const sourcePath = source.path;
    const destPath = dest.path;

    const sourceFiles = await getAllFiles(sourcePath);

    for (const sourceFile of sourceFiles) {
      const relativePath = path.relative(sourcePath, sourceFile);
      let destFile = path.join(destPath, relativePath);
      let transform: (content: string) => string;

      if (isCursorDest) {
        if (!sourceFile.endsWith(".md")) continue;
        destFile = destFile.replace(/\.md$/, ".mdc");
        transform = (content) => `${header}\n${content}`;
      } else {
        if (!sourceFile.endsWith(".mdc")) continue;
        destFile = destFile.replace(/\.mdc$/, ".md");
        transform = (content) => content.replace(/^---\n[\s\S]*?\n---\n/m, "");
      }

      if (
        !(await areFilesEqual(sourceFile, destFile, { transform, verbose }))
      ) {
        return false;
      }
    }

    return true;
  }
}
