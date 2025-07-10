import type { SyncHandler } from "./handler.ts";
import { ClineSyncHandler } from "./cline-sync.ts";
import { CodeSyncHandler } from "./code-sync.ts";
import { DirectoryToFileMergeHandler } from "./directory-to-file-merge.ts";
import { DefaultSyncHandler } from "./default-sync.ts";

export const syncHandlers: SyncHandler[] = [
  new DirectoryToFileMergeHandler(),
  new ClineSyncHandler(),
  new CodeSyncHandler(),
  // DefaultSyncHandler should always be last
  new DefaultSyncHandler(),
];
