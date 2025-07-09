import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { sync } from "./sync.ts";
import * as config from "./config.ts";

// Mock modules
vi.mock("fs/promises");
vi.mock("./config.ts");

describe("Sync Tests", () => {
  const mockSource: config.ResolvedSyncObject = {
    path: "/fake/source",
    type: "directory",
  };

  const mockDest: config.ResolvedSyncObject = {
    path: "/fake/dest",
    type: "directory",
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock console logs
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((() => {}) as (
      code?: string | number | null | undefined,
    ) => never);

    // Mock fs promises
    vi.mocked(fs.cp).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("file content");
    vi.mocked(fs.readdir).mockResolvedValue([]);
    // Default stat mock
    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sync function", () => {
    it("should perform a sync from a source to multiple destinations", async () => {
      const mockConfig: config.VibeSyncConfig = {
        version: 1,
        sync_from: "Gemini",
        sync_to: ["Cline", "Roo Code"],
      };
      const resolvedSource = {
        name: "Gemini",
        path: "/src/gemini",
        type: "directory" as const,
      };
      const resolvedDests = [
        { name: "Cline", path: "/dest/cline", type: "directory" as const },
        { name: "Roo Code", path: "/dest/roo", type: "directory" as const },
      ];

      vi.mocked(config.loadConfig).mockReturnValue(mockConfig);
      vi.mocked(config.resolveSyncObject)
        .mockReturnValueOnce(resolvedSource)
        .mockReturnValueOnce(resolvedDests[0])
        .mockReturnValueOnce(resolvedDests[1]);

      await sync();

      expect(config.loadConfig).toHaveBeenCalledOnce();
      expect(config.resolveSyncObject).toHaveBeenCalledTimes(3);
      expect(fs.cp).toHaveBeenCalledTimes(2); // Assuming default copy for both
      expect(console.log).toHaveBeenCalledWith(
        chalk.bold.green("\nSync completed successfully!"),
      );
    });

    it("should handle errors during sync and exit", async () => {
      const error = new Error("Sync failed");
      vi.mocked(config.loadConfig).mockImplementation(() => {
        throw error;
      });

      await sync();

      expect(console.error).toHaveBeenCalledWith(
        chalk.bold.red("\nSync failed:"),
        error,
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("copySourceToDest", () => {
    it("should copy from directory to directory", async () => {
      vi.mocked(config.loadConfig).mockReturnValue({
        version: 1,
        sync_from: "a",
        sync_to: ["b"],
      });
      vi.mocked(config.resolveSyncObject)
        .mockReturnValueOnce({ ...mockSource, type: "directory" })
        .mockReturnValueOnce({ ...mockDest, type: "directory" });

      await sync();

      expect(fs.cp).toHaveBeenCalledWith(mockSource.path, mockDest.path, {
        recursive: true,
        force: true,
      });
    });

    it("should copy a file to a directory, creating vibesync.md", async () => {
      vi.mocked(config.loadConfig).mockReturnValue({
        version: 1,
        sync_from: "a",
        sync_to: ["b"],
      });
      vi.mocked(config.resolveSyncObject)
        .mockReturnValueOnce({ ...mockSource, type: "file" })
        .mockReturnValueOnce({ ...mockDest, type: "directory" });

      await sync();

      const expectedDestPath = path.join(mockDest.path, "vibesync.md");
      expect(fs.cp).toHaveBeenCalledWith(mockSource.path, expectedDestPath, {
        recursive: true,
        force: true,
      });
    });

    it("should merge files from a directory into a single file", async () => {
      const files = ["file1.txt", "file2.txt"];
      files.map((f) => path.join(mockSource.path, f));

      vi.mocked(fs.readdir).mockResolvedValue(
        files.map((f) => ({ name: f, isDirectory: () => false })) as any,
      );
      vi.mocked(fs.readFile).mockResolvedValue("content");

      vi.mocked(config.loadConfig).mockReturnValue({
        version: 1,
        sync_from: "a",
        sync_to: ["b"],
      });
      vi.mocked(config.resolveSyncObject)
        .mockReturnValueOnce({ ...mockSource, type: "directory" })
        .mockReturnValueOnce({ ...mockDest, type: "file" });

      await sync();

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockDest.path,
        "content\ncontent",
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.green(`Successfully merged 2 files into ${mockDest.path}`),
      );
    });

    describe("Special Handling", () => {
      it("should handle special sync for Cline as destination", async () => {
        const clineDest = {
          name: "Cline",
          path: ".clinerules/",
          type: "directory" as const,
        };
        vi.mocked(config.loadConfig).mockReturnValue({
          version: 1,
          sync_from: "Gemini",
          sync_to: ["Cline"],
        });
        vi.mocked(config.resolveSyncObject)
          .mockReturnValueOnce({ ...mockSource, name: "Gemini" })
          .mockReturnValueOnce(clineDest);

        // Simulate that source has a 'rules' subdir
        vi.mocked(fs.stat).mockImplementation(async (p) => {
          if (p === path.join(mockSource.path, "rules")) {
            return { isDirectory: () => true } as any;
          }
          throw new Error("ENOENT");
        });

        await sync();

        const expectedSource = path.join(mockSource.path, "rules");
        const expectedDest = path.join(clineDest.path, "");
        expect(fs.cp).toHaveBeenCalledWith(
          expectedSource,
          expectedDest,
          expect.anything(),
        );
        expect(console.log).toHaveBeenCalledWith(
          chalk.green("Subdirectory sync for Cline completed."),
        );
      });

      it("should handle special sync for Kilo Code as source", async () => {
        const kiloSource = {
          name: "Kilo Code",
          path: ".kilocode/",
          type: "directory" as const,
        };
        vi.mocked(config.loadConfig).mockReturnValue({
          version: 1,
          sync_from: "Kilo Code",
          sync_to: ["some_dest"],
        });
        vi.mocked(config.resolveSyncObject)
          .mockReturnValueOnce(kiloSource)
          .mockReturnValueOnce(mockDest);

        // Simulate that source has 'rules' and 'workflows' subdirs
        vi.mocked(fs.stat).mockResolvedValue({
          isDirectory: () => true,
        } as any);

        await sync();

        const expectedSourceRules = path.join(kiloSource.path, "rules");
        const expectedDestRules = path.join(mockDest.path, "rules");
        const expectedSourceWorkflows = path.join(kiloSource.path, "workflows");
        const expectedDestWorkflows = path.join(mockDest.path, "workflows");

        expect(fs.cp).toHaveBeenCalledWith(
          expectedSourceRules,
          expectedDestRules,
          expect.anything(),
        );
        expect(fs.cp).toHaveBeenCalledWith(
          expectedSourceWorkflows,
          expectedDestWorkflows,
          expect.anything(),
        );
        expect(console.log).toHaveBeenCalledWith(
          chalk.green(`Subdirectory sync for ${kiloSource.name} completed.`),
        );
      });

      it("should handle special sync for Roo Code as source", async () => {
        const rooSource = {
          name: "Roo Code",
          path: ".roo/",
          type: "directory" as const,
        };
        vi.mocked(config.loadConfig).mockReturnValue({
          version: 1,
          sync_from: "Roo Code",
          sync_to: ["some_dest"],
        });
        vi.mocked(config.resolveSyncObject)
          .mockReturnValueOnce(rooSource)
          .mockReturnValueOnce(mockDest);

        // Simulate that source has 'rules' and 'workflows' subdirs
        vi.mocked(fs.stat).mockResolvedValue({
          isDirectory: () => true,
        } as any);

        await sync();

        const expectedSourceRules = path.join(rooSource.path, "rules");
        const expectedDestRules = path.join(mockDest.path, "rules");
        const expectedSourceWorkflows = path.join(rooSource.path, "workflows");
        const expectedDestWorkflows = path.join(mockDest.path, "workflows");

        expect(fs.cp).toHaveBeenCalledWith(
          expectedSourceRules,
          expectedDestRules,
          expect.anything(),
        );
        expect(fs.cp).toHaveBeenCalledWith(
          expectedSourceWorkflows,
          expectedDestWorkflows,
          expect.anything(),
        );
        expect(console.log).toHaveBeenCalledWith(
          chalk.green(`Subdirectory sync for ${rooSource.name} completed.`),
        );
      });

      it("should correctly sync from Cline to Kilo Code, excluding workflows from rules copy", async () => {
        const clineSource = {
          name: "Cline",
          path: "/fake/.clinerules/",
          type: "directory" as const,
        };
        const kiloDest = {
          name: "Kilo Code",
          path: "/fake/.kilocode/",
          type: "directory" as const,
        };

        vi.mocked(config.loadConfig).mockReturnValue({
          version: 1,
          sync_from: "Cline",
          sync_to: ["Kilo Code"],
        });
        vi.mocked(config.resolveSyncObject)
          .mockReturnValueOnce(clineSource)
          .mockReturnValueOnce(kiloDest);

        // Simulate that .clinerules/ and .clinerules/workflows exist
        vi.mocked(fs.stat).mockImplementation(async (p) => {
          const pStr = p.toString();
          if (
            pStr === clineSource.path ||
            pStr === path.join(clineSource.path, "workflows")
          ) {
            return { isDirectory: () => true } as any;
          }
          throw new Error(`ENOENT: no such file or directory, stat '${pStr}'`);
        });

        await sync();

        const expectedRulesDest = path.join(kiloDest.path, "rules");
        const expectedWorkflowsSource = path.join(
          clineSource.path,
          "workflows",
        );
        const expectedWorkflowsDest = path.join(kiloDest.path, "workflows");

        // Check that the root of clineSource was copied to the rules dir with a filter
        const mainCopyCall = vi
          .mocked(fs.cp)
          .mock.calls.find((call) => call[1] === expectedRulesDest);
        expect(mainCopyCall).toBeDefined();
        if (!mainCopyCall) throw new Error("mainCopyCall is undefined");
        const cpOptions = mainCopyCall[2];
        expect(cpOptions).toBeDefined();
        expect(cpOptions && cpOptions.filter).toBeInstanceOf(Function);

        // Test the filter
        if (!cpOptions) throw new Error("cpOptions is undefined");
        const filter = cpOptions.filter as (src: string) => boolean;
        expect(filter(expectedWorkflowsSource)).toBe(false); // Exclude workflows
        expect(filter(path.join(clineSource.path, "any-other-file.md"))).toBe(
          true,
        ); // Include other files

        // Check that the workflows dir was copied separately without a filter
        const workflowsCopyCall = vi
          .mocked(fs.cp)
          .mock.calls.find((call) => call[0] === expectedWorkflowsSource);
        expect(workflowsCopyCall).toBeDefined();
        if (!workflowsCopyCall)
          throw new Error("workflowsCopyCall is undefined");
        expect(workflowsCopyCall[1]).toBe(expectedWorkflowsDest);
        // It will have a filter that always returns true, which is fine.
        expect(
          workflowsCopyCall[2] && workflowsCopyCall[2].filter,
        ).toBeUndefined();

        expect(console.log).toHaveBeenCalledWith(
          chalk.green("Subdirectory sync for Cline completed."),
        );
      });

      it("should skip Cline special handling and merge to file when dest is a file", async () => {
        const clineSource = {
          name: "Cline",
          path: ".clinerules/",
          type: "directory" as const,
        };
        const fileDest = {
          name: "GEMINI.md",
          path: "/fake/dest/GEMINI.md",
          type: "file" as const,
        };
        const files = ["rule1.md", "rule2.md"];

        vi.mocked(config.loadConfig).mockReturnValue({
          version: 1,
          sync_from: "Cline",
          sync_to: ["GEMINI.md"],
        });
        vi.mocked(config.resolveSyncObject)
          .mockReturnValueOnce(clineSource)
          .mockReturnValueOnce(fileDest);

        // Simulate that a source subdir exists, which would normally trigger special handling
        vi.mocked(fs.stat).mockImplementation(async (p) => {
          if (p === path.join(clineSource.path, "rules")) {
            return { isDirectory: () => true } as any;
          }
          throw new Error("ENOENT");
        });

        // Simulate files for the merge operation
        vi.mocked(fs.readdir).mockResolvedValue(
          files.map((f) => ({ name: f, isDirectory: () => false })) as any,
        );
        vi.mocked(fs.readFile).mockResolvedValue("content");

        await sync();

        // Assert that the merge logic was called
        expect(fs.writeFile).toHaveBeenCalledWith(
          fileDest.path,
          "content\ncontent",
        );
        expect(console.log).toHaveBeenCalledWith(
          chalk.green(`Successfully merged 2 files into ${fileDest.path}`),
        );

        // Assert that special handling's fs.cp was NOT called
        expect(fs.cp).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalledWith(
          chalk.green("Subdirectory sync for Cline completed."),
        );
      });
    });
  });
});
