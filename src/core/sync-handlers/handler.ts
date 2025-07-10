import type { ResolvedSyncObject } from "../config.ts";

export interface SyncHandler {
  /**
   * Determines if this handler can process the given source and destination.
   * @returns {Promise<boolean> | boolean} - True if the handler can manage the sync, otherwise false.
   */
  canHandle(
    source: ResolvedSyncObject,
    dest: ResolvedSyncObject,
  ): Promise<boolean> | boolean;

  /**
   * Executes the synchronization from source to destination.
   * @param {ResolvedSyncObject} source - The source object.
   * @param {ResolvedSyncObject} dest - The destination object.
   * @returns {Promise<void>}
   */
  sync(source: ResolvedSyncObject, dest: ResolvedSyncObject): Promise<void>;

  /**
   * Checks if the source and destination are already in sync.
   * @param {ResolvedSyncObject} source - The source object.
   * @param {ResolvedSyncObject} dest - The destination object.
   * @returns {Promise<boolean>} - True if they are in sync, otherwise false.
   */
  check(source: ResolvedSyncObject, dest: ResolvedSyncObject): Promise<boolean>;
}
