# FinalActrack Monorepo

This is a pnpm monorepo containing multiple Next.js applications.

## Structure

```
finalactrack/
├── apps/
│   ├── acetrack/     # AceTrack app (Port 3001)
│   └── admin/        # Admin app (Port 3002)
├── client/           # Client app (Port 3000)
└── package.json      # Root package.json
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

To install pnpm globally:
```bash
npm install -g pnpm
```

## Installation

Install all dependencies for all apps from the root directory:

```bash
pnpm install
```

## Development

### Run all apps simultaneously
```bash
pnpm dev
```

This will start:
- Client app on http://localhost:3000
- AceTrack app on http://localhost:3001
- Admin app on http://localhost:3002

### Run individual apps
```bash
# Client app
pnpm dev:client

# AceTrack app
pnpm dev:acetrack

# Admin app
pnpm dev:admin
```

## Building

### Build all apps
```bash
pnpm build
```

### Build individual apps
```bash
pnpm build:client
pnpm build:acetrack
pnpm build:admin
```

## Production

### Start all apps
```bash
pnpm start
```

### Start individual apps
```bash
pnpm start:client
pnpm start:acetrack
pnpm start:admin
```

## Other Commands

### Linting
```bash
# Lint all apps
pnpm lint
```

### Clean up
```bash
# Remove all node_modules and .next directories
pnpm clean
```

## Workspace Management

This monorepo uses pnpm workspaces. The workspace configuration is defined in `pnpm-workspace.yaml`.

### Adding dependencies

To add a dependency to a specific app:
```bash
pnpm --filter <app-name> add <package-name>

# Examples:
pnpm --filter client add axios
pnpm --filter acetrack add zustand
pnpm --filter admin add react-query
```

To add a dev dependency:
```bash
pnpm --filter <app-name> add -D <package-name>
```

### Removing dependencies
```bash
pnpm --filter <app-name> remove <package-name>
```

## Tips

- All commands should be run from the root directory
- Each app runs on a different port to avoid conflicts
- Dependencies are hoisted to the root `node_modules` where possible
- Use `--filter` flag to target specific apps with pnpm commands
