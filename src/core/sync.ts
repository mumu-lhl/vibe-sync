import {
  loadConfig,
  resolveSyncObject,
  type ResolvedSyncObject,
} from "./config.ts";
import chalk from "chalk";
import { syncHandlers } from "./sync-handlers/index.ts";
import { executeAction } from "./sync-operations.ts";

async function copySourceToDest(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
) {
  const sourceName = source.name || source.path;
  const destName = dest.name || dest.path;
  console.log(chalk.blue(`Syncing from ${sourceName} to ${destName}`));

  for (const handler of syncHandlers) {
    if (await handler.canHandle(source, dest)) {
      const actions = await handler.plan(source, dest);
      for (const action of actions) {
        await executeAction(action);
      }
      console.log(
        chalk.green(`Sync from ${sourceName} to ${destName} completed.`),
      );
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
