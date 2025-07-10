import { Command } from "commander";
import { sync } from "./core/sync.ts";
import { generateConfig } from "./core/config.ts";
import pkg from "../package.json" with { type: "json" };

const program = new Command();

program
  .version(pkg.version)
  .description(
    "vibe-sync - A CLI tool to sync vibe coding rules and workflows across vibe coding different tools.",
  )
  .action(() => {
    program.help();
  });

program
  .command("sync")
  .description("Sync vibe coding rules and workflows.")
  .option(
    "-c, --config <path>",
    "Path to the configuration file",
    "vibesync.yaml",
  )
  .action(async (options) => {
    await sync(options.config);
  });

program
  .command("init")
  .description("Generate a vibesync.yaml configuration file.")
  .option(
    "-c, --config <path>",
    "Path to the configuration file",
    "vibesync.yaml",
  )
  .action(async (options) => {
    await generateConfig(options.config);
  });

program
  .command("check")
  .description("Check if vibe coding rules synchronization is complete.")
  .option(
    "-c, --config <path>",
    "Path to the configuration file",
    "vibesync.yaml",
  )
  .action(() => {
    console.log("Check command executed. (Not yet implemented)");
  });

export function run() {
  program.parse(process.argv);
}
