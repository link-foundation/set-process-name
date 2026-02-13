# Case Study: setProcessName Function Implementation

## Issue Summary

**Issue #1**: Make prototype of setProcessName function

The goal is to create a cross-platform, multi-runtime function to set the process name visible in system monitoring tools (top, ps, htop, Task Manager, etc.).

## Requirements

1. Support multiple JavaScript runtimes: Node.js, Bun, Deno
2. Support multiple operating systems: Linux, macOS, Windows
3. 100% test coverage
4. Unlicense (public domain)
5. Well-documented
6. No dead code, minimal dependencies

## Reference Implementation

Source: [link-assistant/agent process-name.ts](https://github.com/link-assistant/agent/blob/2208d0dc199a7c903da5956029e796a44642c3ff/js/src/cli/process-name.ts#L13)

```typescript
import { platform } from 'os';
import { dlopen, FFIType, ptr } from 'bun:ffi';

export function setProcessName(name: string): void {
  process.title = name;
  process.argv0 = name;

  const os = platform();

  if (os === 'linux') {
    try {
      const PR_SET_NAME = 15;
      const libc = dlopen('libc.so.6', {
        prctl: {
          args: [FFIType.i32, FFIType.ptr],
          returns: FFIType.i32,
        },
      });
      const buf = Buffer.from(name.slice(0, 15) + '\0');
      libc.symbols.prctl(PR_SET_NAME, ptr(buf));
      libc.close();
    } catch (_e) {
      // Silently ignore - process name is cosmetic
    }
  }
}
```

## Existing Libraries Analysis

### 1. process-title (npm)

- **URL**: https://www.npmjs.com/package/process-title
- **GitHub**: https://github.com/focusaurus/process-title
- **Stars**: 4
- **Last Updated**: 2019 (5+ years old)
- **Approach**: Simply sets `process.title` from `package.json` name
- **Limitations**: Only 2 lines of code, no FFI, no cross-platform handling

### 2. process-name (npm)

- **URL**: https://www.npmjs.com/package/process-name
- **Version**: 1.0.1
- **Last Updated**: 5 years ago
- **Purpose**: Gets platform-specific application process names (read-only)
- **Limitations**: Does not set process names, only reads them

### 3. app-title (npm)

- **URL**: https://github.com/alessioalex/app-title
- **Stars**: 5
- **Last Updated**: 2017
- **Approach**: Sets process.title from package.json automatically
- **Limitations**: No cross-platform FFI support

## Platform-Specific Mechanisms

### Linux

- **System Call**: `prctl(PR_SET_NAME, name)` where PR_SET_NAME = 15
- **Effect**: Sets `/proc/<pid>/comm` visible in `ps`, `top`, `htop`
- **Limit**: 16 bytes including null terminator (15 characters max)
- **Library**: libc.so.6

References:

- [prctl(2) - Linux manual page](https://man7.org/linux/man-pages/man2/prctl.2.html)
- [PR_SET_NAME(2const) - Linux manual page](https://man7.org/linux/man-pages/man2/pr_set_name.2const.html)

### macOS

- **System Call**: `pthread_setname_np(name)` - only works for current thread
- **Alternative**: `process.title` in Node.js works natively via libuv
- **Note**: macOS pthread_setname_np only accepts single argument (unlike Linux/BSD)
- **Limitation**: Cannot change process name shown in Activity Monitor after launch

References:

- [Apple Developer Forums - pthread_setname_np](https://developer.apple.com/forums/thread/706014)
- [Node.js issue #28945](https://github.com/nodejs/node/issues/28945)

### Windows

- **System Call**: `SetConsoleTitle()` for console title
- **Note**: Task Manager always shows executable name
- **Approach**: Cosmetic only - set process.title for JS-level access

References:

- [SetConsoleTitle - Microsoft Learn](https://learn.microsoft.com/en-us/windows/console/setconsoletitle)

## Runtime Detection

### Node.js Detection

```javascript
typeof process !== 'undefined' && process.versions && process.versions.node;
```

### Bun Detection

```javascript
typeof process !== 'undefined' && process.versions && process.versions.bun;
```

### Deno Detection

```javascript
typeof Deno !== 'undefined';
```

Reference: [@cross/runtime](https://jsr.io/@cross/runtime)

## Design Decision: FFI Approach

### Bun FFI

- Uses `bun:ffi` module with `dlopen`, `FFIType`, `ptr`
- Works well for Linux prctl

### Deno FFI

- Uses `Deno.dlopen` with similar syntax
- Requires `--allow-ffi` permission

### Node.js FFI

- No built-in FFI
- Options:
  1. Use `process.title` only (libuv handles platform specifics)
  2. Use optional `ffi-napi` dependency (not recommended for zero-deps)

### Chosen Approach

1. **Node.js**: Rely on `process.title` (libuv handles prctl internally)
2. **Bun**: Use `bun:ffi` for Linux prctl since Bun doesn't implement process.title setter
3. **Deno**: Use `Deno.dlopen` for Linux prctl with fallback to process.title if available

## Implementation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    setProcessName(name)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Set process.title = name (works in Node.js)              │
│  2. Set process.argv0 = name (cosmetic)                      │
│  3. Detect runtime and platform                              │
│  4. If FFI available and needed:                             │
│     - Linux: prctl(PR_SET_NAME, name.slice(0, 15))           │
│     - macOS: No additional action (process.title sufficient) │
│     - Windows: No additional action                          │
└─────────────────────────────────────────────────────────────┘
```

## Test Strategy

1. **Unit Tests**: Test function exists, accepts string, doesn't throw
2. **Integration Tests**: Verify process.title is set
3. **Platform Tests**: Test on Linux with prctl verification via /proc
4. **Runtime Tests**: Test on Node.js, Bun, Deno

## Comparison with Competitors

| Feature            | Our Implementation | process-title | process-name | Reference (agent) |
| ------------------ | ------------------ | ------------- | ------------ | ----------------- |
| Set process name   | ✅                 | ✅            | ❌           | ✅                |
| Linux prctl        | ✅                 | ❌            | ❌           | ✅                |
| macOS support      | ✅                 | ✅\*          | ❌           | ✅                |
| Windows support    | ✅                 | ✅\*          | ❌           | ✅                |
| Node.js            | ✅                 | ✅            | ✅           | ❌                |
| Bun                | ✅                 | ❌            | ❌           | ✅                |
| Deno               | ✅                 | ❌            | ❌           | ❌                |
| Zero dependencies  | ✅                 | ✅            | ❌           | ❌                |
| 100% test coverage | ✅                 | ❌            | ❌           | ❌                |
| Active maintenance | ✅                 | ❌            | ❌           | ✅                |

\* via process.title only

## Conclusion

Our implementation will be the most comprehensive cross-platform, multi-runtime process name setting library available for JavaScript/TypeScript, combining:

1. The simplicity of process-title
2. The FFI approach from the agent reference
3. Support for all major runtimes (Node.js, Bun, Deno)
4. Comprehensive test coverage
5. Modern ES modules with TypeScript support
