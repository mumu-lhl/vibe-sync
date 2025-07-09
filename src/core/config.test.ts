
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { generateConfig, loadConfig } from './config.ts';
import chalk from 'chalk';

// Mock the fs module
vi.mock('fs');

describe('Config Tests', () => {

    beforeEach(() => {
        // Reset mocks before each test
        vi.resetAllMocks();

        // Mock console logs to prevent output during tests and allow spying
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation((() => {}) as (code?: number) => never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('generateConfig (init)', () => {
        const configPath = path.join(process.cwd(), 'vibesync.yaml');
        const defaultConfigContent = `# Vibe Sync Configuration

version: 1

sync_from: "Gemini"
# sync_from:
#   - custom: xxx/xxx/xxx

sync_to:
  - "Claude Code"
  - "Cline"
  - "Kilo Code"
  - "Jules"
  - "Roo Code"`;

        it('should create a new vibesync.yaml if one does not exist', async () => {
            // Arrange
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const writeSpy = vi.mocked(fs.writeFileSync);

            // Act
            await generateConfig();

            // Assert
            expect(fs.existsSync).toHaveBeenCalledWith(configPath);
            expect(writeSpy).toHaveBeenCalledOnce();
            expect(writeSpy).toHaveBeenCalledWith(configPath, defaultConfigContent);
            expect(console.log).toHaveBeenCalledWith(chalk.bold.green('vibesync.yaml created successfully!'));
        });

        it('should not create a new vibesync.yaml if one already exists', async () => {
            // Arrange
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const writeSpy = vi.mocked(fs.writeFileSync);

            // Act
            await generateConfig();

            // Assert
            expect(fs.existsSync).toHaveBeenCalledWith(configPath);
            expect(writeSpy).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(chalk.yellow('vibesync.yaml already exists. Aborting initialization.'));
        });

        it('should handle errors during file creation', async () => {
            // Arrange
            const error = new Error('Disk full');
            vi.mocked(fs.existsSync).mockReturnValue(false);
            vi.mocked(fs.writeFileSync).mockImplementation(() => {
                throw error;
            });

            // Act
            await generateConfig();

            // Assert
            expect(console.error).toHaveBeenCalledWith(chalk.bold.red('Failed to create vibesync.yaml:'), error);
        });
    });

    describe('loadConfig', () => {
        const configPath = path.join(process.cwd(), 'vibesync.yaml');

        it('should load and parse the config file correctly', () => {
            // Arrange
            const mockConfig = {
                version: 1,
                sync_from: 'Gemini',
                sync_to: ['Claude Code'],
            };
            const yamlString = yaml.dump(mockConfig);
            vi.mocked(fs.readFileSync).mockReturnValue(yamlString);

            // Act
            const config = loadConfig();

            // Assert
            expect(fs.readFileSync).toHaveBeenCalledWith(configPath, 'utf8');
            expect(config).toEqual(mockConfig);
        });

        it('should exit if the config file is not found', () => {
            // Arrange
            const error = new Error('File not found');
            vi.mocked(fs.readFileSync).mockImplementation(() => {
                throw error;
            });

            // Act
            loadConfig();

            // Assert
            expect(console.error).toHaveBeenCalledWith(chalk.red(`Error reading or parsing ${configPath}:`), error);
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should exit if the config file is invalid', () => {
            // Arrange
            const invalidConfig = { version: 'wrong type' };
            const yamlString = yaml.dump(invalidConfig);
            vi.mocked(fs.readFileSync).mockReturnValue(yamlString);

            // Act
            loadConfig();

            // Assert
            expect(console.error).toHaveBeenCalled();
            expect(process.exit).toHaveBeenCalledWith(1);
        });
    });
});
