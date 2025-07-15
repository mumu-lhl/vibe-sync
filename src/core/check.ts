import {
  loadConfig,
  resolveSyncObject,
  type ResolvedSyncObject,
} from "./config.ts";
import chalk from "chalk";
import { syncHandlers } from "./sync-handlers/index.ts";

async function checkSourceAgainstDest(
  source: ResolvedSyncObject,
  dest: ResolvedSyncObject,
  verbose?: boolean,
): Promise<boolean> {
  const sourceName = source.name || source.path;
  const destName = dest.name || dest.path;
  if (verbose) {
    console.log(chalk.blue(`Checking sync for ${sourceName} to ${destName}`));
  }

  for (const handler of syncHandlers) {
    if (await handler.canHandle(source, dest)) {
      return await handler.check(source, dest, verbose);
    }
  }

  // This should not be reached if DefaultSyncHandler is correctly configured
  throw new Error("No suitable sync handler found.");
}

export async function check(filePath?: string, verbose?: boolean) {
  try {
    const config = loadConfig(filePath);
    if (verbose) {
      console.log(chalk.yellow("Verbose mode enabled."));
      console.log(chalk.yellow("Loaded configuration:"), config);
    }

    console.log(chalk.bold.cyan("Starting checks...\n"));

    const source = resolveSyncObject(config.sync_from);
    const destinations = config.sync_to.map(resolveSyncObject);

    let allInSync = true;
    for (const dest of destinations) {
      const inSync = await checkSourceAgainstDest(source, dest, verbose);
      const sourceName = source.name || source.path;
      const destName = dest.name || dest.path;
      if (inSync) {
        console.log(
          chalk.green(`✔ ${sourceName} and ${destName} are in sync.`),
        );
      } else {
        allInSync = false;
        console.log(
          chalk.red(`✖ ${sourceName} and ${destName} are not in sync.`),
        );
      }
    }

    if (allInSync) {
      console.log(chalk.bold.green("\nAll items are in sync!"));
    } else {
      console.log(
        chalk.bold.red(
          "\nSome items are out of sync. Please run 'vibe-sync sync' to fix.",
        ),
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.bold.red("\nCheck failed:"), error);
    process.exit(1);
  }
}
