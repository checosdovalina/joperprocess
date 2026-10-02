---
name: Vitest JSX transform
description: Workspace-specific handling for compiling client TSX in Vitest when its Vite version differs from the app's Vite.
---

Client TSX tests run through Vitest's Vite pipeline, which may resolve a different Vite generation than the app's build. In this workspace, the reliable setup was to configure Vitest's OXC JSX runtime separately instead of relying on the app's React plugin.

**Why:** The test runner left JSX in transformed modules, causing import-analysis parse failures even though the app build uses a React plugin.

**How to apply:** Keep test-runner JSX handling isolated from the app build configuration, and recheck this approach if Vitest/Vite versions change.