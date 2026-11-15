// Check the publish preflight file set and run the suite against the tarball.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const runNpm = (args) =>
  execFileSync(npm, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

const [manifest] = JSON.parse(runNpm(['pack', '--dry-run', '--json']));
assert.deepEqual(
  manifest.files.map(({ path }) => path).sort(),
  ['LICENSE', 'README.md', 'package.json', 'src/index.d.ts', 'src/index.js'],
  'The package must include runtime files and documentation only'
);

const temporaryDirectory = mkdtempSync(
  join(tmpdir(), 'set-process-name-pack-')
);
try {
  const [packed] = JSON.parse(
    runNpm(['pack', '--json', '--pack-destination', temporaryDirectory])
  );
  runNpm([
    'install',
    '--prefix',
    temporaryDirectory,
    '--ignore-scripts',
    '--no-package-lock',
    '--no-audit',
    '--no-fund',
    join(temporaryDirectory, packed.filename),
  ]);

  // Keep test dependencies in the checkout; load the public package export
  // from the isolated installation so missing packed runtime files fail.
  const tests = readFileSync(
    new URL('../tests/index.test.js', import.meta.url),
    'utf8'
  )
    .replace(
      "'test-anywhere'",
      JSON.stringify(import.meta.resolve('test-anywhere'))
    )
    .replace("'../src/index.js'", "'set-process-name'");
  const testFile = join(temporaryDirectory, 'package.test.mjs');
  writeFileSync(testFile, tests);
  const installedPackage = JSON.parse(
    readFileSync(
      join(temporaryDirectory, 'node_modules/set-process-name/package.json'),
      'utf8'
    )
  );
  assert.ok(
    readFileSync(
      join(
        temporaryDirectory,
        'node_modules/set-process-name',
        installedPackage.types
      ),
      'utf8'
    ).includes('export declare const setProcessName')
  );
  execFileSync(process.execPath, ['--test', testFile], {
    cwd: temporaryDirectory,
    stdio: 'inherit',
  });
  console.log(
    'Package preflight passed: only the five intended files are packed.'
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
