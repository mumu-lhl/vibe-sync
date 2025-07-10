import type { ResolvedSyncObject } from "../config.ts";
import type { SyncHandler } from "./handler.ts";
import type { SyncAction } from "../sync-operations.ts";
import path from "path";

export class DefaultSyncHandler implements SyncHandler {
  canHandle(): boolean {
    // This handler is the fallback for standard copy operations.
    return true;
  }

  async plan(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<SyncAction[]> {
    const actions: SyncAction[] = [];
    const destParentDir =
      dest.type === "directory" ? dest.path : path.dirname(dest.path);

    actions.push({
      type: "mkdir",
      directory: destParentDir,
      options: { recursive: true },
    });

    const copyOptions = {
      recursive: true,
      force: true, // Allow overwriting
    };

    let finalDestPath = dest.path;
    if (source.type === "file" && dest.type === "directory") {
      // When copying a single file to a directory, copy it *into* the directory.
      // We'll use a default name, but this could be configured in the future.
      finalDestPath = path.join(dest.path, "vibesync.md");
    }

    actions.push({
      type: "copy",
      source: source.path,
      destination: finalDestPath,
      options: copyOptions,
    });

    return actions;
  }

  async check(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> {
    // TODO: Implement check logic
    console.warn("Check logic not implemented for DefaultSyncHandler");
    return false;
  }
}
