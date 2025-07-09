import { Command } from 'commander';
import { sync } from './core/sync.ts';
import { generateConfig as generateConfig } from './core/config.ts';

const program = new Command();

program
    .version('1.0.0')
    .description('vibe-sync - A CLI tool to sync vibe coding rules and workflows across vibe coding different tools.')
    .action(() => {
        program.help();
    });

program
    .command('sync')
    .description('Sync vibe coding rules and workflows.')
    .action(async () => {
        await sync();
    });

program
    .command('init')
    .description('Generate a vibesync.yaml configuration file.')
    .action(async () => {
        await generateConfig();
    });

export function run() {
    program.parse(process.argv);
}
