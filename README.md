# vibe-sync

A CLI tool to sync vibe coding rules and workflows across different vibe coding tools.

## Installation

To install `vibe-sync`, ensure you have Node.js and pnpm installed. Then, run the following command:

```bash
# npm
npm install -g vibe-sync

# yarn
yarn global add vibe-sync

# pnpm
pnpm install -g vibe-sync

# bun
bun install -g vibe-sync

# deno
deno install -g npm:vibe-sync
```

## Usage

### Initialize Config File

```bash
vibe-sync init
```

### Sync

```bash
vibe-sync sync
```

## Configuration

```yaml
# Vibe Sync Configuration

version: 1

sync_from: "Gemini"

sync_to:
  - "Claude Code"
  - "Cline"
  - "Kilo Code"
  - "Jules"
  - "Roo Code"
```

## Development

To contribute to `vibe-sync`:

1.  Clone the repository.
2.  Install dependencies: `pnpm install`
3.  Run tests: `pnpm test`
4.  Run the project: `pnpm start`

## License

This project is licensed under the MIT License.
