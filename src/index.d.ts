/**
 * Cross-platform, multi-runtime process name setter
 *
 * Sets the process name visible in system monitoring tools (top, ps, htop, etc.)
 * Supports: Node.js, Bun, Deno
 * Platforms: Linux, macOS, Windows
 */

/** Supported JavaScript runtimes */
export type Runtime = 'node' | 'bun' | 'deno' | 'unknown';

/** Supported operating system platforms */
export type Platform = 'linux' | 'darwin' | 'win32' | 'unknown';

/** Result of setting the process name */
export interface SetProcessNameResult {
  /** Whether the process name was successfully set by any method */
  success: boolean;
  /** Whether process.title was successfully set (null if not attempted) */
  processTitle: boolean | null;
  /** Whether prctl was successfully called on Linux (null if not attempted) */
  prctl: boolean | null;
  /** The detected JavaScript runtime */
  runtime: Runtime;
  /** The detected operating system platform */
  platform: Platform;
}

/** Capabilities of the current environment */
export interface Capabilities {
  /** Whether process.title can be set */
  canSetTitle: boolean;
  /** Whether prctl can be used to set process name (Linux only) */
  canSetPrctl: boolean;
  /** The detected JavaScript runtime */
  runtime: Runtime;
  /** The detected operating system platform */
  platform: Platform;
}

/**
 * Detect the current JavaScript runtime
 * @returns The detected runtime: 'node', 'bun', 'deno', or 'unknown'
 */
export declare const detectRuntime: () => Runtime;

/**
 * Detect the current operating system platform
 * @returns The detected platform: 'linux', 'darwin', 'win32', or 'unknown'
 */
export declare const detectPlatform: () => Platform;

/**
 * Set the process name visible in system monitoring tools
 *
 * This function sets the process name that appears in tools like:
 * - Linux: top, ps, htop (via /proc/<pid>/comm)
 * - macOS: Activity Monitor (via process.title)
 * - Windows: Task Manager (cosmetic only, process.title)
 *
 * @param name - The desired process name
 * @returns Promise resolving to the result of the operation
 *
 * @example
 * ```typescript
 * import { setProcessName } from 'set-process-name';
 *
 * const result = await setProcessName('my-app');
 * console.log(result.success); // true if successful
 * ```
 */
export declare const setProcessName: (
  name: string
) => Promise<SetProcessNameResult>;

/**
 * Synchronous version of setProcessName
 *
 * Note: On Bun runtime, this may not apply prctl changes.
 * Use the async version for full functionality.
 *
 * @param name - The desired process name
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * import { setProcessNameSync } from 'set-process-name';
 *
 * const result = setProcessNameSync('my-app');
 * console.log(result.success); // true if successful
 * ```
 */
export declare const setProcessNameSync: (name: string) => SetProcessNameResult;

/**
 * Get the current process name
 *
 * @returns The current process name from process.title, or null if unavailable
 *
 * @example
 * ```typescript
 * import { getProcessName } from 'set-process-name';
 *
 * const name = getProcessName();
 * console.log(name); // 'node' or 'bun' or custom name
 * ```
 */
export declare const getProcessName: () => string | null;

/**
 * Check if the process name can be set on the current platform/runtime
 *
 * @returns Object describing the capabilities of the current environment
 *
 * @example
 * ```typescript
 * import { getCapabilities } from 'set-process-name';
 *
 * const caps = getCapabilities();
 * if (caps.canSetPrctl) {
 *   console.log('Full Linux prctl support available');
 * }
 * ```
 */
export declare const getCapabilities: () => Capabilities;
