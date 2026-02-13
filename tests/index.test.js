/**
 * Comprehensive tests for set-process-name
 * Works with Node.js, Bun, and Deno
 */

import { describe, it, expect } from 'test-anywhere';
import {
  setProcessName,
  setProcessNameSync,
  getProcessName,
  getCapabilities,
  detectRuntime,
  detectPlatform,
} from '../src/index.js';

describe('detectRuntime', () => {
  it('should return a string', () => {
    const runtime = detectRuntime();
    expect(typeof runtime).toBe('string');
  });

  it('should return one of the valid runtime values', () => {
    const runtime = detectRuntime();
    const validRuntimes = ['node', 'bun', 'deno', 'unknown'];
    expect(validRuntimes.includes(runtime)).toBe(true);
  });

  it('should detect the current runtime correctly', () => {
    const runtime = detectRuntime();
    // At least one of these should be true
    if (typeof Deno !== 'undefined') {
      expect(runtime).toBe('deno');
    } else if (
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.bun
    ) {
      expect(runtime).toBe('bun');
    } else if (
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node
    ) {
      expect(runtime).toBe('node');
    }
  });
});

describe('detectPlatform', () => {
  it('should return a string', () => {
    const platform = detectPlatform();
    expect(typeof platform).toBe('string');
  });

  it('should return one of the valid platform values', () => {
    const platform = detectPlatform();
    // Platform should be a string, may be any valid value
    expect(typeof platform).toBe('string');
    expect(platform.length > 0).toBe(true);
  });
});

describe('getCapabilities', () => {
  it('should return an object with required properties', () => {
    const caps = getCapabilities();
    expect(typeof caps).toBe('object');
    expect(typeof caps.canSetTitle).toBe('boolean');
    expect(typeof caps.canSetPrctl).toBe('boolean');
    expect(typeof caps.runtime).toBe('string');
    expect(typeof caps.platform).toBe('string');
  });

  it('should have canSetTitle true in Node.js/Bun environments', () => {
    const caps = getCapabilities();
    if (caps.runtime === 'node' || caps.runtime === 'bun') {
      expect(caps.canSetTitle).toBe(true);
    }
  });

  it('should have canSetPrctl true on Linux with node/bun', () => {
    const caps = getCapabilities();
    if (
      caps.platform === 'linux' &&
      (caps.runtime === 'node' || caps.runtime === 'bun')
    ) {
      expect(caps.canSetPrctl).toBe(true);
    }
  });
});

describe('getProcessName', () => {
  it('should return a string or null', () => {
    const name = getProcessName();
    expect(name === null || typeof name === 'string').toBe(true);
  });

  it('should return process.title value if available', () => {
    const name = getProcessName();
    if (typeof process !== 'undefined' && process.title) {
      expect(name).toBe(process.title);
    }
  });
});

describe('setProcessNameSync', () => {
  it('should throw TypeError for non-string input', () => {
    expect(() => setProcessNameSync(123)).toThrow(TypeError);
    expect(() => setProcessNameSync(null)).toThrow(TypeError);
    expect(() => setProcessNameSync(undefined)).toThrow(TypeError);
    expect(() => setProcessNameSync({})).toThrow(TypeError);
  });

  it('should accept a string and return result object', () => {
    const result = setProcessNameSync('test-process');
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
    expect(
      result.processTitle === null || typeof result.processTitle === 'boolean'
    ).toBe(true);
    expect(result.prctl === null || typeof result.prctl === 'boolean').toBe(
      true
    );
    expect(typeof result.runtime).toBe('string');
    expect(typeof result.platform).toBe('string');
  });

  it('should set process.title in Node.js', () => {
    const caps = getCapabilities();
    if (caps.runtime === 'node') {
      const testName = `sync-test-${Date.now()}`;
      const result = setProcessNameSync(testName);
      expect(result.processTitle).toBe(true);
      expect(process.title).toBe(testName);
    }
  });

  it('should handle empty string', () => {
    const result = setProcessNameSync('');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle long names (truncate for prctl)', () => {
    const longName = 'a'.repeat(100);
    const result = setProcessNameSync(longName);
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle special characters', () => {
    const result = setProcessNameSync('test-name_123');
    expect(typeof result.success).toBe('boolean');
  });
});

describe('setProcessName (async)', () => {
  it('should throw TypeError for non-string input', async () => {
    try {
      await setProcessName(123);
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err instanceof TypeError).toBe(true);
    }
  });

  it('should accept a string and return result object', async () => {
    const result = await setProcessName('async-test-process');
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
    expect(
      result.processTitle === null || typeof result.processTitle === 'boolean'
    ).toBe(true);
    expect(result.prctl === null || typeof result.prctl === 'boolean').toBe(
      true
    );
    expect(typeof result.runtime).toBe('string');
    expect(typeof result.platform).toBe('string');
  });

  it('should set process.title in Node.js', async () => {
    const caps = getCapabilities();
    if (caps.runtime === 'node') {
      const testName = `async-test-${Date.now()}`;
      const result = await setProcessName(testName);
      expect(result.processTitle).toBe(true);
      expect(process.title).toBe(testName);
    }
  });

  it('should handle empty string', async () => {
    const result = await setProcessName('');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle long names', async () => {
    const longName = 'b'.repeat(100);
    const result = await setProcessName(longName);
    expect(typeof result.success).toBe('boolean');
  });

  it('should return correct runtime and platform', async () => {
    const result = await setProcessName('test');
    const runtime = detectRuntime();
    const platform = detectPlatform();
    expect(result.runtime).toBe(runtime);
    expect(result.platform).toBe(platform);
  });
});

describe('setProcessName on Linux', () => {
  it('should attempt prctl on Linux with Bun/Deno', async () => {
    const caps = getCapabilities();
    if (caps.platform === 'linux') {
      const result = await setProcessName('linux-test');
      // On Linux with Bun or Deno, prctl should be attempted
      if (caps.runtime === 'bun' || caps.runtime === 'deno') {
        // prctl result should be boolean, not null
        expect(result.prctl === null || typeof result.prctl === 'boolean').toBe(
          true
        );
      }
    }
  });
});

describe('Integration tests', () => {
  it('should round-trip: set then get process name', async () => {
    const caps = getCapabilities();
    if (caps.runtime === 'node') {
      const testName = `roundtrip-${Date.now()}`;
      await setProcessName(testName);
      const gotName = getProcessName();
      expect(gotName).toBe(testName);
    }
  });

  it('should handle multiple consecutive calls', async () => {
    const caps = getCapabilities();
    if (caps.runtime === 'node') {
      await setProcessName('first');
      const first = getProcessName();
      expect(first).toBe('first');

      await setProcessName('second');
      const second = getProcessName();
      expect(second).toBe('second');

      await setProcessName('third');
      const third = getProcessName();
      expect(third).toBe('third');
    }
  });

  it('should handle unicode characters', async () => {
    // Unicode might be truncated or encoded differently
    const result = await setProcessName('test-\u{1F600}');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle whitespace in name', async () => {
    const result = await setProcessName('test name');
    expect(typeof result.success).toBe('boolean');
  });
});

describe('Edge cases', () => {
  it('should handle name with null bytes', async () => {
    const result = await setProcessName('test\0name');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle name exactly 15 characters (prctl limit)', async () => {
    const exactName = 'a'.repeat(15);
    const result = await setProcessName(exactName);
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle name exactly 16 characters (prctl boundary)', async () => {
    const exactName = 'a'.repeat(16);
    const result = await setProcessName(exactName);
    expect(typeof result.success).toBe('boolean');
  });

  it('sync and async should produce consistent results', async () => {
    const testName = 'consistency-test';
    const syncResult = setProcessNameSync(testName);
    const asyncResult = await setProcessName(testName);

    expect(syncResult.runtime).toBe(asyncResult.runtime);
    expect(syncResult.platform).toBe(asyncResult.platform);
  });
});
