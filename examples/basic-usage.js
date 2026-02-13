/**
 * Basic usage example for set-process-name
 *
 * Run with:
 *   node examples/basic-usage.js
 *   bun examples/basic-usage.js
 *   deno run --allow-ffi examples/basic-usage.js
 */

import {
  setProcessName,
  getProcessName,
  getCapabilities,
  detectRuntime,
  detectPlatform,
} from '../src/index.js';

async function main() {
  console.log('=== set-process-name Demo ===\n');

  // Show environment info
  console.log('Environment:');
  console.log('  Runtime:', detectRuntime());
  console.log('  Platform:', detectPlatform());

  // Show capabilities
  const caps = getCapabilities();
  console.log('\nCapabilities:');
  console.log('  Can set title:', caps.canSetTitle);
  console.log('  Can set prctl:', caps.canSetPrctl);

  // Get original process name
  const originalName = getProcessName();
  console.log('\nOriginal process name:', originalName);

  // Set new process name
  const newName = 'demo-app';
  console.log('\nSetting process name to:', newName);

  const result = await setProcessName(newName);

  console.log('\nResult:');
  console.log('  Success:', result.success);
  console.log('  process.title set:', result.processTitle);
  console.log('  prctl called:', result.prctl);

  // Verify
  console.log('\nCurrent process name:', getProcessName());

  // On Linux, you can verify with:
  // ps -p <pid> -o comm=
  // cat /proc/<pid>/comm
  if (result.platform === 'linux') {
    console.log(`\nVerify with: cat /proc/${process.pid}/comm`);
  }

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
