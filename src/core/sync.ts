import {
  loadConfig,
  resolveSyncObject,
  type ResolvedSyncObject,
} from "./config.ts";
import chalk from "chalk";
import { syncHandlers } from "./sync-handlers/index.ts";

async function copySourceToDest(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
) {
  console.log(chalk.blue(`Syncing from ${source.path} to: ${dest.path}`));

  for (const handler of syncHandlers) {
    if (await handler.canHandle(source, dest)) {
      await handler.sync(source, dest);
      return;
    }
  }

  // This should not be reached if DefaultSyncHandler is correctly configured
  throw new Error("No suitable sync handler found.");
}

export async function sync(filePath?: string) {
  try {
    const config = loadConfig(filePath);

    console.log(chalk.bold.cyan("Starting sync...\n"));

    const source = resolveSyncObject(config.sync_from);
    const destinations = config.sync_to.map(resolveSyncObject);

    for (const dest of destinations) {
      await copySourceToDest(source, dest);
    }

    console.log(chalk.bold.green("\nSync completed successfully!"));
  } catch (error) {
    console.error(chalk.bold.red("\nSync failed:"), error);
    process.exit(1);
  }
}
