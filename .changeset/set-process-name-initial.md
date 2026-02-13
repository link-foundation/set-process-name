---
'set-process-name': minor
---

Implement setProcessName function with cross-platform and multi-runtime support

- Add setProcessName() async function to set process name visible in system monitoring tools
- Add setProcessNameSync() synchronous version for simpler use cases
- Add getProcessName() to retrieve current process name
- Add getCapabilities() to check platform/runtime capabilities
- Add detectRuntime() and detectPlatform() utility functions
- Support Node.js with native process.title (uses libuv prctl internally on Linux)
- Support Bun with FFI-based prctl for Linux
- Support Deno with FFI-based prctl for Linux
- Cross-platform: Linux (prctl), macOS (process.title), Windows (process.title)
- Include comprehensive test suite (31 tests)
- Include TypeScript type definitions
- Include case study documentation
