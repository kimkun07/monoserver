import { readdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestConfig {
  description: string;
  shouldFail: boolean;
  expectedError?: string;
  params: {
    composePath?: string;
    outputDir?: string;
    nginxService?: string;
  };
}

interface TestResult {
  caseName: string;
  description: string;
  passed: boolean;
  message: string;
  details?: string;
}

async function getTestCases(): Promise<string[]> {
  const casesDir = join(process.cwd(), 'test');
  const entries = await readdir(casesDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}

async function readTestConfig(caseName: string): Promise<TestConfig> {
  const configPath = join(process.cwd(), 'test', caseName, 'test.json');
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

async function runGenerator(caseName: string, config: TestConfig): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const caseDir = join(process.cwd(), 'test', caseName);

  // Build command
  const args: string[] = [];

  if (config.params.composePath) {
    args.push('--compose-path', join(caseDir, config.params.composePath));
  }
  if (config.params.outputDir) {
    args.push('--output-dir', join(caseDir, config.params.outputDir));
  }
  if (config.params.nginxService) {
    args.push('--nginx-service', config.params.nginxService);
  }

  const command = `tsx src/index.ts ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}

async function compareOutputs(caseName: string): Promise<{ passed: boolean; message: string; details?: string }> {
  const caseDir = join(process.cwd(), 'test', caseName);
  const expectedDir = join(caseDir, 'expected');
  const actualDir = join(caseDir, 'nginx', 'conf.d');

  try {
    const expectedFiles = await readdir(expectedDir);
    const actualFiles = await readdir(actualDir);

    // Check file counts
    if (expectedFiles.length !== actualFiles.length) {
      return {
        passed: false,
        message: `File count mismatch: expected ${expectedFiles.length}, got ${actualFiles.length}`,
        details: `Expected files: ${expectedFiles.join(', ')}\nActual files: ${actualFiles.join(', ')}`,
      };
    }

    // Check for missing files
    const missingFiles = expectedFiles.filter(f => !actualFiles.includes(f));
    if (missingFiles.length > 0) {
      return {
        passed: false,
        message: `Missing generated files: ${missingFiles.join(', ')}`,
      };
    }

    // Check for extra files
    const extraFiles = actualFiles.filter(f => !expectedFiles.includes(f));
    if (extraFiles.length > 0) {
      return {
        passed: false,
        message: `Unexpected generated files: ${extraFiles.join(', ')}`,
      };
    }

    // Compare file contents
    for (const filename of expectedFiles) {
      const expectedPath = join(expectedDir, filename);
      const actualPath = join(actualDir, filename);

      const expectedContent = await readFile(expectedPath, 'utf-8');
      const actualContent = await readFile(actualPath, 'utf-8');

      if (expectedContent !== actualContent) {
        return {
          passed: false,
          message: `Content mismatch in ${filename}`,
          details: `Expected:\n${'─'.repeat(50)}\n${expectedContent}\n${'─'.repeat(50)}\n\nActual:\n${'─'.repeat(50)}\n${actualContent}\n${'─'.repeat(50)}`,
        };
      }
    }

    return {
      passed: true,
      message: `All ${expectedFiles.length} file(s) match expected output`,
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Error comparing outputs: ${error.message}`,
    };
  }
}

async function cleanupOutputDir(caseName: string): Promise<void> {
  const caseDir = join(process.cwd(), 'test', caseName);
  const outputDir = join(caseDir, 'nginx', 'conf.d');

  try {
    await rm(outputDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, that's ok
  }
}

async function runTestCase(caseName: string): Promise<TestResult> {
  const config = await readTestConfig(caseName);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`TEST: ${caseName}`);
  console.log(`${config.description}`);
  console.log('─'.repeat(60));

  // Clean up any existing output files before running the test
  await cleanupOutputDir(caseName);

  const result = await runGenerator(caseName, config);

  if (config.shouldFail) {
    // Test expects failure
    if (result.success) {
      return {
        caseName,
        description: config.description,
        passed: false,
        message: 'Expected generator to fail, but it succeeded',
      };
    }

    // Check if error message contains expected error
    if (config.expectedError) {
      const errorOutput = result.stderr + result.stdout;
      if (!errorOutput.includes(config.expectedError)) {
        return {
          caseName,
          description: config.description,
          passed: false,
          message: `Expected error message to contain "${config.expectedError}"`,
          details: `Actual output:\n${errorOutput}`,
        };
      }
    }

    return {
      caseName,
      description: config.description,
      passed: true,
      message: 'Generator failed as expected',
    };
  } else {
    // Test expects success
    if (!result.success) {
      return {
        caseName,
        description: config.description,
        passed: false,
        message: 'Generator failed unexpectedly',
        details: `stderr:\n${result.stderr}\n\nstdout:\n${result.stdout}`,
      };
    }

    // Compare outputs
    const comparison = await compareOutputs(caseName);
    return {
      caseName,
      description: config.description,
      passed: comparison.passed,
      message: comparison.message,
      details: comparison.details,
    };
  }
}

async function main(): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('nginx-config-generator Test Suite');
  console.log('═'.repeat(60));

  const testCases = await getTestCases();
  const results: TestResult[] = [];

  for (const caseName of testCases) {
    try {
      const result = await runTestCase(caseName);
      results.push(result);

      if (result.passed) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        if (result.details) {
          console.log('\nDetails:');
          console.log(result.details);
        }
      }
    } catch (error: any) {
      console.error(`\n❌ Test case "${caseName}" threw an error:`, error.message);
      results.push({
        caseName,
        description: '',
        passed: false,
        message: `Test execution failed: ${error.message}`,
      });
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.caseName}: ${result.description}`);
  }

  console.log('═'.repeat(60));
  console.log(`Total: ${passedCount}/${totalCount} test cases passed`);
  console.log('═'.repeat(60));

  if (passedCount < totalCount) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main();
