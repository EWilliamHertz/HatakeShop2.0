import {
  TestHarness,
  checkServerReachable,
  ensureDatabaseColumns,
  cleanupAllTestLeads,
  closeDbPool,
  BASE_URL,
} from './test_helpers.ts';
import { runTier1Tests } from './tier1_feature_coverage.test.ts';
import { runTier2Tests } from './tier2_boundary_corner.test.ts';
import { runTier3Tests } from './tier3_cross_feature.test.ts';
import { runTier4Tests } from './tier4_real_world.test.ts';

async function main() {
  console.log('\n\x1b[1m\x1b[36m=======================================================');
  console.log('   AUTOMATED VENDOR OUTREACH ENGINE — E2E TEST SUITE   ');
  console.log('=======================================================\x1b[0m\n');

  console.log(`Target Backend URL : \x1b[33m${BASE_URL}\x1b[0m`);
  console.log(`Database Status    : \x1b[33mVerifying connection & schema...\x1b[0m`);

  // Ensure DB schema columns exist
  try {
    await ensureDatabaseColumns();
    console.log(`Database Status    : \x1b[32mReady\x1b[0m`);
  } catch (err: any) {
    console.error(`\x1b[31mDatabase connection failed: ${err.message}\x1b[0m`);
    process.exit(1);
  }

  // Pre-flight check: Backend Server Reachability
  console.log(`Checking backend server at ${BASE_URL}...`);
  const isReachable = await checkServerReachable(4000);
  if (!isReachable) {
    console.warn(`\x1b[33m[Warning] Backend server at ${BASE_URL} is not responding.\x1b[0m`);
    console.warn(`Please ensure the server is running (e.g. \`npm run dev\` or \`tsx server.ts\`).`);
    console.warn(`If running on an alternate port, set TEST_BASE_URL (e.g. \`TEST_BASE_URL=http://localhost:5000 npx tsx tests/e2e/run_all.ts\`).\n`);
  } else {
    console.log(`Backend Server     : \x1b[32mConnected\x1b[0m\n`);
  }

  // Initial clean-up of stale test records
  await cleanupAllTestLeads();

  const harness = new TestHarness();
  const overallStart = Date.now();

  try {
    // Tier 1: Core Feature Coverage
    await runTier1Tests(harness);

    // Tier 2: Boundary & Corner Cases
    await runTier2Tests(harness);

    // Tier 3: Cross-Feature Combinations & Lifecycle Monotonicity
    await runTier3Tests(harness);

    // Tier 4: Real-World Application Scenarios
    await runTier4Tests(harness);
  } catch (fatalErr) {
    console.error('\x1b[31mUnexpected fatal error during test execution:\x1b[0m', fatalErr);
  } finally {
    // Post-suite cleanup
    await cleanupAllTestLeads();
    await closeDbPool();
  }

  const overallDuration = Date.now() - overallStart;
  const results = harness.getResults();
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n\x1b[1m\x1b[36m=======================================================');
  console.log('                  FINAL E2E TEST SUMMARY               ');
  console.log('=======================================================\x1b[0m');
  console.log(`  Total Test Cases : ${total}`);
  console.log(`  Passed           : \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed           : \x1b[${failed > 0 ? '31' : '32'}m${failed}\x1b[0m`);
  console.log(`  Total Duration   : ${overallDuration}ms`);
  console.log('\x1b[1m\x1b[36m=======================================================\x1b[0m\n');

  if (failed > 0) {
    console.error(`\x1b[31m[FAILED] ${failed} test case(s) failed. Check details above.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[SUCCESS] All ${passed} E2E test cases passed successfully!\x1b[0m\n`);
    process.exit(0);
  }
}

main();
