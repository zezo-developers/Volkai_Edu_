#!/usr/bin/env ts-node

import { SecurityTestRunner } from '../test/security/security-test-runner';

/**
 * Security Test Execution Script
 * Runs comprehensive security testing suite and generates reports
 */
async function runSecurityTests() {
  console.log('🚀 Volkai HR Edu Backend - Security Testing Suite');
  console.log('================================================\n');

  const runner = new SecurityTestRunner();

  try {
    // Initialize test environment
    console.log('🔧 Initializing test environment...');
    await runner.initialize();

    // Run all security tests
    const report = await runner.runAllSecurityTests();

    // Exit with appropriate code
    const exitCode = report.summary.criticalIssues > 0 ? 1 : 0;
    
    if (exitCode === 0) {
      console.log('\n✅ Security testing completed successfully!');
    } else {
      console.log('\n❌ Security testing completed with critical issues!');
    }

    process.exit(exitCode);

  } catch (error) {
    console.error('\n💥 Security testing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runSecurityTests };
