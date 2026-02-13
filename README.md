# set-process-name

Cross-platform, multi-runtime library to set the process name visible in system monitoring tools (top, ps, htop, Activity Monitor, Task Manager, etc.).

## Features

- **Multi-runtime support**: Works with Node.js, Bun, and Deno
- **Cross-platform**: Supports Linux, macOS, and Windows
- **Zero dependencies**: Pure JavaScript with optional FFI for enhanced Linux support
- **TypeScript support**: Full type definitions included
- **Comprehensive API**: Async and sync versions, getters, and capability detection

## Installation

```bash
# npm
npm install set-process-name

# bun
bun add set-process-name

# deno
deno add jsr:@link-foundation/set-process-name
```

## Quick Start

```javascript
import { setProcessName } from 'set-process-name';

// Set the process name
await setProcessName('my-app');

// Now 'my-app' appears in top, ps, htop instead of 'node' or 'bun'
```

## API Reference

### `setProcessName(name: string): Promise<SetProcessNameResult>`

Sets the process name visible in system monitoring tools.

```javascript
import { setProcessName } from 'set-process-name';

const result = await setProcessName('my-service');

console.log(result);
// {
//   success: true,
//   processTitle: true,    // process.title was set successfully
//   prctl: true,           // prctl was called successfully (Linux only)
//   runtime: 'node',       // detected runtime
//   platform: 'linux'      // detected platform
// }
```

### `setProcessNameSync(name: string): SetProcessNameResult`

Synchronous version. Note: On Bun runtime, prctl changes may not be applied (use async version for full functionality).

```javascript
import { setProcessNameSync } from 'set-process-name';

const result = setProcessNameSync('my-service');
```

### `getProcessName(): string | null`

Gets the current process name from `process.title`.

```javascript
import { getProcessName, setProcessName } from 'set-process-name';

await setProcessName('my-app');
console.log(getProcessName()); // 'my-app'
```

### `getCapabilities(): Capabilities`

Returns information about what features are available on the current platform/runtime.

```javascript
import { getCapabilities } from 'set-process-name';

const caps = getCapabilities();
console.log(caps);
// {
//   canSetTitle: true,     // process.title can be set
//   canSetPrctl: true,     // prctl is available (Linux only)
//   runtime: 'node',
//   platform: 'linux'
// }
```

### `detectRuntime(): 'node' | 'bun' | 'deno' | 'unknown'`

Detects the current JavaScript runtime.

### `detectPlatform(): 'linux' | 'darwin' | 'win32' | 'unknown'`

Detects the current operating system.

## Platform-Specific Behavior

### Linux

- Uses `process.title` (which internally uses `prctl` via libuv in Node.js)
- On Bun/Deno: Uses FFI to call `prctl(PR_SET_NAME, name)` directly
- Name is truncated to 15 characters (Linux kernel limitation for `/proc/<pid>/comm`)
- Process name visible in `top`, `ps`, `htop`, and `/proc/<pid>/comm`

### macOS

- Uses `process.title` which works via libuv in Node.js
- Process name visible in Activity Monitor and `ps`

### Windows

- Uses `process.title` for console title
- Task Manager always shows executable name (cosmetic only)

## Runtime Support

| Runtime | process.title | prctl (Linux)  |
| ------- | ------------- | -------------- |
| Node.js | ✅            | ✅ (via libuv) |
| Bun     | ✅            | ✅ (via FFI)   |
| Deno    | ✅            | ✅ (via FFI)   |

## Examples

### Basic Usage

```javascript
import { setProcessName, getProcessName } from 'set-process-name';

async function main() {
  console.log('Before:', getProcessName()); // 'node'

  await setProcessName('my-daemon');

  console.log('After:', getProcessName()); // 'my-daemon'
}

main();
```

### With Capability Check

```javascript
import { setProcessName, getCapabilities } from 'set-process-name';

const caps = getCapabilities();

if (caps.canSetPrctl) {
  console.log('Full Linux prctl support available');
}

const result = await setProcessName('worker-1');

if (result.success) {
  console.log('Process name set successfully');
} else {
  console.log('Could not set process name (non-critical)');
}
```

### CLI Application

```javascript
#!/usr/bin/env node
import { setProcessName } from 'set-process-name';

// Set process name at startup
await setProcessName('my-cli');

// Your CLI code here...
```

## TypeScript

Full TypeScript support with type definitions:

```typescript
import {
  setProcessName,
  SetProcessNameResult,
  Capabilities,
  Runtime,
  Platform,
} from 'set-process-name';

const result: SetProcessNameResult = await setProcessName('typed-app');
```

## Testing

```bash
# Node.js
npm test

# Bun
bun test

# Deno
deno test --allow-read
```

## How It Works

1. **JavaScript Level**: Sets `process.title` and `process.argv0`
2. **Node.js**: `process.title` setter uses libuv which internally calls `prctl` on Linux
3. **Bun/Deno on Linux**: Uses FFI to call `prctl(PR_SET_NAME, name)` directly
4. **macOS/Windows**: Relies on `process.title` for best-effort support

## Comparison with Alternatives

| Feature            | set-process-name | process-title | process-name |
| ------------------ | ---------------- | ------------- | ------------ |
| Set process name   | ✅               | ✅            | ❌           |
| Linux prctl        | ✅               | ❌            | ❌           |
| Node.js            | ✅               | ✅            | ✅           |
| Bun                | ✅               | ❌            | ❌           |
| Deno               | ✅               | ❌            | ❌           |
| Zero dependencies  | ✅               | ✅            | ❌           |
| TypeScript support | ✅               | ❌            | ❌           |
| Active maintenance | ✅               | ❌            | ❌           |

## License

[Unlicense](LICENSE) - Public Domain
