#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command();
program
    .version('1.0.0')
    .description('vibe-sync - A CLI tool to sync vibe coding rules and workflows across vibe coding different tools.')
    .action(() => {
    program.help();
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map