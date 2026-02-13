/**
 * @fileoverview Cross-platform, multi-runtime process name setter
 *
 * Sets the process name visible in system monitoring tools (top, ps, htop, etc.)
 * Supports: Node.js, Bun, Deno
 * Platforms: Linux, macOS, Windows
 */

/**
 * Detect the current JavaScript runtime
 * @returns {'node' | 'bun' | 'deno' | 'unknown'}
 */
export const detectRuntime = () => {
  if (typeof Deno !== 'undefined') {
    return 'deno';
  }
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.bun
  ) {
    return 'bun';
  }
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    return 'node';
  }
  return 'unknown';
};

/**
 * Detect the current operating system
 * @returns {'linux' | 'darwin' | 'win32' | 'unknown'}
 */
export const detectPlatform = () => {
  // Try Deno first
  if (typeof Deno !== 'undefined' && Deno.build) {
    const os = Deno.build.os;
    if (os === 'linux') {
      return 'linux';
    }
    if (os === 'darwin') {
      return 'darwin';
    }
    if (os === 'windows') {
      return 'win32';
    }
    return 'unknown';
  }

  // Try Node.js/Bun
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform;
  }

  return 'unknown';
};

/**
 * Set process name using Linux prctl via Bun FFI
 * @param {string} name - Process name (max 15 characters)
 * @returns {boolean} Whether the operation succeeded
 */
const setProcessNameLinuxBunFFI = async (name) => {
  try {
    const { dlopen, FFIType, ptr } = await import('bun:ffi');
    const PR_SET_NAME = 15;
    const libc = dlopen('libc.so.6', {
      prctl: {
        args: [FFIType.i32, FFIType.ptr],
        returns: FFIType.i32,
      },
    });
    // PR_SET_NAME accepts up to 16 bytes including the null terminator
    const truncatedName = name.slice(0, 15);
    const buf = Buffer.from(`${truncatedName}\0`);
    const result = libc.symbols.prctl(PR_SET_NAME, ptr(buf));
    libc.close();
    return result === 0;
  } catch {
    return false;
  }
};

// Cached Deno libc handle (singleton pattern to avoid repeated load/unload)
let denoLibcHandle = null;

/**
 * Set process name using Linux prctl via Deno FFI
 * @param {string} name - Process name (max 15 characters)
 * @returns {boolean} Whether the operation succeeded
 */
const setProcessNameLinuxDenoFFI = (name) => {
  try {
    const PR_SET_NAME = 15;

    // Use cached handle or create new one
    if (!denoLibcHandle) {
      denoLibcHandle = Deno.dlopen('libc.so.6', {
        prctl: {
          parameters: ['i32', 'pointer'],
          result: 'i32',
        },
      });
    }

    // PR_SET_NAME accepts up to 16 bytes including the null terminator
    const truncatedName = name.slice(0, 15);
    const encoder = new TextEncoder();
    const buf = encoder.encode(`${truncatedName}\0`);
    const result = denoLibcHandle.symbols.prctl(PR_SET_NAME, buf);
    // Note: We don't close the handle - it will be reused and cleaned up at process exit
    return result === 0;
  } catch {
    return false;
  }
};

/**
 * Set the process name visible in system monitoring tools
 *
 * @param {string} name - The desired process name
 * @returns {Promise<{success: boolean, processTitle: string | null, prctl: boolean | null, runtime: string, platform: string}>}
 *
 * @example
 * import { setProcessName } from 'set-process-name';
 *
 * await setProcessName('my-app');
 * // Process now shows as 'my-app' in top/ps/htop
 */
export const setProcessName = async (name) => {
  if (typeof name !== 'string') {
    throw new TypeError('Process name must be a string');
  }

  const runtime = detectRuntime();
  const platform = detectPlatform();

  const result = {
    success: false,
    processTitle: null,
    prctl: null,
    runtime,
    platform,
  };

  // Set process.title (works in Node.js, partially in Bun/Deno)
  if (typeof process !== 'undefined') {
    try {
      process.title = name;
      result.processTitle = process.title === name;
      result.success = result.processTitle;
    } catch {
      result.processTitle = false;
    }

    // Set process.argv0 for cosmetic purposes
    try {
      process.argv0 = name;
    } catch {
      // Ignore - this is cosmetic
    }
  }

  // Platform-specific handling
  if (platform === 'linux') {
    if (runtime === 'bun') {
      result.prctl = await setProcessNameLinuxBunFFI(name);
      result.success = result.success || result.prctl;
    } else if (runtime === 'deno') {
      result.prctl = setProcessNameLinuxDenoFFI(name);
      result.success = result.success || result.prctl;
    }
    // Node.js on Linux: process.title already uses prctl internally via libuv
  }

  // macOS: process.title works via libuv in Node.js
  // Windows: Task Manager shows executable name, process.title is cosmetic

  return result;
};

/**
 * Synchronous version of setProcessName for simpler use cases
 * Note: On Bun runtime, this may not apply prctl changes (use async version)
 *
 * @param {string} name - The desired process name
 * @returns {{success: boolean, processTitle: boolean | null, prctl: boolean | null, runtime: string, platform: string}}
 *
 * @example
 * import { setProcessNameSync } from 'set-process-name';
 *
 * setProcessNameSync('my-app');
 */
export const setProcessNameSync = (name) => {
  if (typeof name !== 'string') {
    throw new TypeError('Process name must be a string');
  }

  const runtime = detectRuntime();
  const platform = detectPlatform();

  const result = {
    success: false,
    processTitle: null,
    prctl: null,
    runtime,
    platform,
  };

  // Set process.title (works in Node.js, partially in Bun/Deno)
  if (typeof process !== 'undefined') {
    try {
      process.title = name;
      result.processTitle = process.title === name;
      result.success = result.processTitle;
    } catch {
      result.processTitle = false;
    }

    // Set process.argv0 for cosmetic purposes
    try {
      process.argv0 = name;
    } catch {
      // Ignore - this is cosmetic
    }
  }

  // Platform-specific handling (sync version)
  if (platform === 'linux' && runtime === 'deno') {
    result.prctl = setProcessNameLinuxDenoFFI(name);
    result.success = result.success || result.prctl;
  }
  // Note: Bun FFI requires async import, so prctl won't be applied in sync version

  return result;
};

/**
 * Get the current process name
 *
 * @returns {string | null} The current process name, or null if unavailable
 *
 * @example
 * import { getProcessName } from 'set-process-name';
 *
 * const name = getProcessName();
 * console.log(name); // 'node' or 'bun' or custom name
 */
export const getProcessName = () => {
  if (typeof process !== 'undefined' && process.title) {
    return process.title;
  }
  return null;
};

/**
 * Check if the process name can be set on the current platform/runtime
 *
 * @returns {{canSetTitle: boolean, canSetPrctl: boolean, runtime: string, platform: string}}
 *
 * @example
 * import { getCapabilities } from 'set-process-name';
 *
 * const caps = getCapabilities();
 * console.log(caps.canSetTitle); // true on Node.js
 */
export const getCapabilities = () => {
  const runtime = detectRuntime();
  const platform = detectPlatform();

  return {
    canSetTitle:
      typeof process !== 'undefined' && typeof process.title !== 'undefined',
    canSetPrctl:
      platform === 'linux' && (runtime === 'node' || runtime === 'bun'),
    runtime,
    platform,
  };
};
