import { readFile, readdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests(): Promise<void> {
  const testDir = join(__dirname, '../test');
  const expectedDir = join(testDir, 'expected');
  const actualDir = join(testDir, 'nginx/conf.d');
  const composePath = join(testDir, 'compose.yaml');

  console.log('Running nginx-config-generator tests...\n');

  try {
    // Clean up any previous test output
    try {
      await rm(actualDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    // Run the generator with test files
    console.log('Generating configs from test/compose.yaml...');
    const { stdout, stderr } = await execAsync(
      `tsx src/index.ts --compose-path "${composePath}" --output-dir "${actualDir}" --nginx-service "test-nginx"`,
      { cwd: join(__dirname, '..') }
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    // Read expected files
    console.log('\nComparing generated files with expected files...');
    const expectedFiles = await readdir(expectedDir);
    const actualFiles = await readdir(actualDir);

    // Check if all expected files were generated
    const missingFiles = expectedFiles.filter(f => !actualFiles.includes(f));
    if (missingFiles.length > 0) {
      throw new Error(`Missing generated files: ${missingFiles.join(', ')}`);
    }

    // Check if there are any extra files
    const extraFiles = actualFiles.filter(f => !expectedFiles.includes(f));
    if (extraFiles.length > 0) {
      throw new Error(`Unexpected generated files: ${extraFiles.join(', ')}`);
    }

    // Compare file contents
    let allMatch = true;
    for (const filename of expectedFiles) {
      const expectedPath = join(expectedDir, filename);
      const actualPath = join(actualDir, filename);

      const expectedContent = await readFile(expectedPath, 'utf-8');
      const actualContent = await readFile(actualPath, 'utf-8');

      if (expectedContent !== actualContent) {
        console.error(`\n❌ Mismatch in ${filename}`);
        console.error('\nExpected:');
        console.error('─'.repeat(50));
        console.error(expectedContent);
        console.error('─'.repeat(50));
        console.error('\nActual:');
        console.error('─'.repeat(50));
        console.error(actualContent);
        console.error('─'.repeat(50));
        allMatch = false;
      } else {
        console.log(`✅ ${filename} matches expected output`);
      }
    }

    if (!allMatch) {
      throw new Error('Some files did not match expected output');
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

runTests();
