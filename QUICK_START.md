# Quick Reference - Monorepo Commands

## Most Used Commands

### Development (from root)
```bash
# Start all apps
pnpm dev

# Start specific app
pnpm dev:client      # Port 3000
pnpm dev:acetrack    # Port 3001  
pnpm dev:admin       # Port 3002
```

### Install packages
```bash
# Install to specific app
pnpm --filter client add <package>
pnpm --filter acetrack add <package>
pnpm --filter admin add <package>

# Install dev dependency
pnpm --filter client add -D <package>
```

### Build & Start
```bash
# Build all
pnpm build

# Build specific
pnpm build:client

# Start production
pnpm start
```

### Useful
```bash
# Clean everything
pnpm clean

# Reinstall all
pnpm install
```
