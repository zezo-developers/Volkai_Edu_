import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import  request from 'supertest';
import { AppModule } from '../../app.module';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityTestResult {
  testSuite: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details?: string;
  recommendation?: string;
  executionTime: number;
}

interface SecurityReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    overallScore: number;
    securityGrade: string;
  };
  testResults: SecurityTestResult[];
  recommendations: string[];
  generatedAt: string;
  environment: string;
  version: string;
}

/**
 * Comprehensive Security Test Runner
 * Orchestrates all security tests and generates detailed reports
 */
export class SecurityTestRunner {
  private app: INestApplication;
  private testResults: SecurityTestResult[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    
    // Set production environment for realistic testing
    process.env.NODE_ENV = 'production';
    
    await this.app.init();
  }

  async runAllSecurityTests(): Promise<SecurityReport> {
    console.log('🚀 Starting Comprehensive Security Testing Suite...\n');

    try {
      // Run all security test suites
      await this.runPenetrationTests();
      await this.runSecurityHeadersTests();
      await this.runInputValidationTests();
      await this.runErrorHandlingTests();
      await this.runAuthenticationTests();
      await this.runRateLimitingTests();
      await this.runFileUploadSecurityTests();
      await this.runSessionSecurityTests();

      // Generate comprehensive report
      const report = this.generateSecurityReport();
      
      // Save report to file
      await this.saveReport(report);
      
      // Display summary
      this.displaySummary(report);

      return report;
    } finally {
      await this.cleanup();
    }
  }

  private async runPenetrationTests(): Promise<void> {
    console.log('🔍 Running Penetration Tests...');
    
    await this.runTest('Penetration Testing', 'SQL Injection Prevention', async () => {
      const sqlPayloads = ["'; DROP TABLE users; --", "' OR '1'='1", "' UNION SELECT * FROM users --"];
      
      for (const payload of sqlPayloads) {
        const response = await request(this.app.getHttpServer())
          .post('/auth/login')
          .send({ email: payload, password: payload });

        if (response.status === 200 || response.body.message?.includes('SQL')) {
          throw new Error(`SQL injection vulnerability detected with payload: ${payload}`);
        }
      }
    }, 'CRITICAL', 'Prevents SQL injection attacks on authentication endpoints');

    await this.runTest('Penetration Testing', 'XSS Prevention', async () => {
      const xssPayloads = ['<script>alert("XSS")</script>', '<img src="x" onerror="alert(1)">'];
      
      for (const payload of xssPayloads) {
        const response = await request(this.app.getHttpServer())
          .post('/api/users/profile')
          .send({ firstName: payload })
          .set('Authorization', 'Bearer test-token');

        if (response.body.data?.firstName?.includes('<script') || 
            response.body.data?.firstName?.includes('onerror')) {
          throw new Error(`XSS vulnerability detected with payload: ${payload}`);
        }
      }
    }, 'HIGH', 'Prevents cross-site scripting attacks in user input');

    await this.runTest('Penetration Testing', 'Command Injection Prevention', async () => {
      const cmdPayloads = ['; ls -la', '| cat /etc/passwd', '&& whoami'];
      
      for (const payload of cmdPayloads) {
        const response = await request(this.app.getHttpServer())
          .post('/api/files/process')
          .send({ filename: payload })
          .set('Authorization', 'Bearer test-token');

        if (response.body.message?.includes('executed') || 
            response.body.message?.includes('command')) {
          throw new Error(`Command injection vulnerability detected`);
        }
      }
    }, 'CRITICAL', 'Prevents command injection in file processing');

    await this.runTest('Penetration Testing', 'Path Traversal Prevention', async () => {
      const pathPayloads = ['../../../etc/passwd', '..\\..\\..\\windows\\system32\\config\\sam'];
      
      for (const payload of pathPayloads) {
        const response = await request(this.app.getHttpServer())
          .get(`/api/files/download/${encodeURIComponent(payload)}`);

        if (response.status === 200 || response.body.message?.includes('/etc/passwd')) {
          throw new Error(`Path traversal vulnerability detected`);
        }
      }
    }, 'HIGH', 'Prevents directory traversal attacks');
  }

  private async runSecurityHeadersTests(): Promise<void> {
    console.log('🛡️ Running Security Headers Tests...');

    await this.runTest('Security Headers', 'Content Security Policy', async () => {
      const response = await request(this.app.getHttpServer()).get('/api/health');
      
      if (!response.headers['content-security-policy']) {
        throw new Error('CSP header missing');
      }
      
      const csp = response.headers['content-security-policy'];
      if (!csp.includes("default-src 'self'") || !csp.includes("object-src 'none'")) {
        throw new Error('CSP configuration is not secure');
      }
    }, 'HIGH', 'Ensures proper Content Security Policy implementation');

    await this.runTest('Security Headers', 'HSTS Implementation', async () => {
      const response = await request(this.app.getHttpServer())
        .get('/api/health')
        .set('X-Forwarded-Proto', 'https');
      
      if (!response.headers['strict-transport-security']) {
        throw new Error('HSTS header missing for HTTPS requests');
      }
      
      const hsts = response.headers['strict-transport-security'];
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      if (!maxAgeMatch || parseInt(maxAgeMatch[1]) < 15768000) {
        throw new Error('HSTS max-age is too short (should be at least 6 months)');
      }
    }, 'HIGH', 'Ensures HTTPS enforcement with proper HSTS configuration');

    await this.runTest('Security Headers', 'X-Frame-Options', async () => {
      const response = await request(this.app.getHttpServer()).get('/api/health');
      
      if (response.headers['x-frame-options'] !== 'DENY') {
        throw new Error('X-Frame-Options should be set to DENY');
      }
    }, 'MEDIUM', 'Prevents clickjacking attacks');

    await this.runTest('Security Headers', 'X-Content-Type-Options', async () => {
      const response = await request(this.app.getHttpServer()).get('/api/health');
      
      if (response.headers['x-content-type-options'] !== 'nosniff') {
        throw new Error('X-Content-Type-Options should be set to nosniff');
      }
    }, 'MEDIUM', 'Prevents MIME type sniffing attacks');
  }

  private async runInputValidationTests(): Promise<void> {
    console.log('✅ Running Input Validation Tests...');

    await this.runTest('Input Validation', 'Email Format Validation', async () => {
      const invalidEmails = ['invalid-email', '@domain.com', 'user@'];
      
      for (const email of invalidEmails) {
        const response = await request(this.app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
          });

        if (response.status === 201) {
          throw new Error(`Invalid email accepted: ${email}`);
        }
      }
    }, 'MEDIUM', 'Ensures proper email format validation');

    await this.runTest('Input Validation', 'Password Strength Enforcement', async () => {
      const weakPasswords = ['password', '123456', 'qwerty'];
      
      for (const password of weakPasswords) {
        const response = await request(this.app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User',
          });

        if (response.status === 201) {
          throw new Error(`Weak password accepted: ${password}`);
        }
      }
    }, 'HIGH', 'Enforces strong password requirements');

    await this.runTest('Input Validation', 'Large Input Handling', async () => {
      const largeString = 'A'.repeat(1000000); // 1MB string
      
      const response = await request(this.app.getHttpServer())
        .post('/api/users/profile')
        .send({ bio: largeString })
        .set('Authorization', 'Bearer test-token');

      if (response.status === 200) {
        throw new Error('Large input accepted without size limits');
      }
    }, 'MEDIUM', 'Prevents DoS attacks via large inputs');
  }

  private async runErrorHandlingTests(): Promise<void> {
    console.log('🔒 Running Error Handling Tests...');

    await this.runTest('Error Handling', 'Stack Trace Exposure', async () => {
      const response = await request(this.app.getHttpServer())
        .get('/api/nonexistent-endpoint');

      if (response.body.stack || response.body.trace) {
        throw new Error('Stack traces exposed in error responses');
      }
    }, 'HIGH', 'Prevents information disclosure through stack traces');

    await this.runTest('Error Handling', 'Database Error Sanitization', async () => {
      const response = await request(this.app.getHttpServer())
        .post('/api/users')
        .send({ email: 'invalid' })
        .set('Authorization', 'Bearer test-token');

      const responseText = JSON.stringify(response.body);
      if (responseText.includes('database') || responseText.includes('SQL') || 
          responseText.includes('connection')) {
        throw new Error('Database details exposed in error messages');
      }
    }, 'HIGH', 'Prevents database information disclosure');

    await this.runTest('Error Handling', 'File Path Exposure', async () => {
      const response = await request(this.app.getHttpServer())
        .get('/api/invalid-endpoint');

      const responseText = JSON.stringify(response.body);
      if (responseText.match(/\/[a-zA-Z0-9_\-\/]+\.(js|ts)/)) {
        throw new Error('File paths exposed in error messages');
      }
    }, 'MEDIUM', 'Prevents file system information disclosure');
  }

  private async runAuthenticationTests(): Promise<void> {
    console.log('🔐 Running Authentication Tests...');

    await this.runTest('Authentication', 'JWT Token Validation', async () => {
      const invalidTokens = ['invalid-token', 'Bearer malformed.jwt.token'];
      
      for (const token of invalidTokens) {
        const response = await request(this.app.getHttpServer())
          .get('/api/users/profile')
          .set('Authorization', token);

        if (response.status === 200) {
          throw new Error(`Invalid token accepted: ${token}`);
        }
      }
    }, 'CRITICAL', 'Ensures proper JWT token validation');

    await this.runTest('Authentication', 'Role-Based Access Control', async () => {
      const response = await request(this.app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', 'Bearer user-token');

      if (response.status === 200) {
        throw new Error('Regular user accessed admin endpoint');
      }
    }, 'HIGH', 'Enforces role-based access control');
  }

  private async runRateLimitingTests(): Promise<void> {
    console.log('🚫 Running Rate Limiting Tests...');

    await this.runTest('Rate Limiting', 'Login Rate Limiting', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(this.app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (!rateLimited) {
        throw new Error('Rate limiting not enforced on login attempts');
      }
    }, 'HIGH', 'Prevents brute force attacks on authentication');
  }

  private async runFileUploadSecurityTests(): Promise<void> {
    console.log('📁 Running File Upload Security Tests...');

    await this.runTest('File Upload Security', 'Malicious File Prevention', async () => {
      const maliciousFiles = [
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'shell.jsp', content: '<% Runtime.getRuntime().exec("cmd"); %>' },
      ];

      for (const file of maliciousFiles) {
        const response = await request(this.app.getHttpServer())
          .post('/api/files/upload')
          .attach('file', Buffer.from(file.content), file.name)
          .set('Authorization', 'Bearer test-token');

        if (response.status === 200) {
          throw new Error(`Malicious file accepted: ${file.name}`);
        }
      }
    }, 'CRITICAL', 'Prevents malicious file uploads');
  }

  private async runSessionSecurityTests(): Promise<void> {
    console.log('🔑 Running Session Security Tests...');

    await this.runTest('Session Security', 'Token Expiration', async () => {
      // This would test with an actually expired token in a real scenario
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(this.app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      if (response.status === 200) {
        throw new Error('Expired token accepted');
      }
    }, 'HIGH', 'Ensures proper token expiration handling');
  }

  private async runTest(
    suite: string,
    name: string,
    testFn: () => Promise<void>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      
      this.testResults.push({
        testSuite: suite,
        testName: name,
        status: 'PASS',
        severity,
        description,
        executionTime: Date.now() - startTime,
      });
      
      console.log(`  ✅ ${name}`);
    } catch (error) {
      this.testResults.push({
        testSuite: suite,
        testName: name,
        status: 'FAIL',
        severity,
        description,
        details: error.message,
        recommendation: this.getRecommendation(name, error.message),
        executionTime: Date.now() - startTime,
      });
      
      console.log(`  ❌ ${name}: ${error.message}`);
    }
  }

  private getRecommendation(testName: string, error: string): string {
    const recommendations = {
      'SQL Injection Prevention': 'Implement parameterized queries and input sanitization',
      'XSS Prevention': 'Use proper input sanitization and output encoding',
      'Command Injection Prevention': 'Avoid executing system commands with user input',
      'Path Traversal Prevention': 'Validate and sanitize file paths',
      'Content Security Policy': 'Configure proper CSP headers',
      'HSTS Implementation': 'Set HSTS header with appropriate max-age',
      'JWT Token Validation': 'Implement proper JWT signature verification',
      'Rate Limiting': 'Configure rate limiting on sensitive endpoints',
      'File Upload Security': 'Implement file type validation and scanning',
    };

    return recommendations[testName] || 'Review and fix the identified security issue';
  }

  private generateSecurityReport(): SecurityReport {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;

    const criticalIssues = this.testResults.filter(r => r.status === 'FAIL' && r.severity === 'CRITICAL').length;
    const highIssues = this.testResults.filter(r => r.status === 'FAIL' && r.severity === 'HIGH').length;
    const mediumIssues = this.testResults.filter(r => r.status === 'FAIL' && r.severity === 'MEDIUM').length;
    const lowIssues = this.testResults.filter(r => r.status === 'FAIL' && r.severity === 'LOW').length;

    // Calculate security score (0-100)
    let score = 100;
    score -= criticalIssues * 25; // Critical issues: -25 points each
    score -= highIssues * 15;     // High issues: -15 points each
    score -= mediumIssues * 8;    // Medium issues: -8 points each
    score -= lowIssues * 3;       // Low issues: -3 points each
    
    const overallScore = Math.max(0, score);
    const securityGrade = this.calculateSecurityGrade(overallScore);

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalTests,
        passed,
        failed,
        skipped,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        overallScore,
        securityGrade,
      },
      testResults: this.testResults,
      recommendations,
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }

  private calculateSecurityGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => r.status === 'FAIL');

    if (failedTests.some(t => t.severity === 'CRITICAL')) {
      recommendations.push('🚨 CRITICAL: Address all critical security vulnerabilities immediately');
    }

    if (failedTests.some(t => t.testSuite === 'Penetration Testing')) {
      recommendations.push('🔍 Review and strengthen input validation and sanitization');
    }

    if (failedTests.some(t => t.testSuite === 'Security Headers')) {
      recommendations.push('🛡️ Configure proper security headers for all endpoints');
    }

    if (failedTests.some(t => t.testSuite === 'Authentication')) {
      recommendations.push('🔐 Strengthen authentication and authorization mechanisms');
    }

    if (failedTests.some(t => t.testSuite === 'Error Handling')) {
      recommendations.push('🔒 Implement proper error handling to prevent information disclosure');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All security tests passed! Continue monitoring and regular testing');
    }

    return recommendations;
  }

  private async saveReport(report: SecurityReport): Promise<void> {
    const reportPath = path.join(process.cwd(), 'security-test-report.json');
    const htmlReportPath = path.join(process.cwd(), 'security-test-report.html');

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    fs.writeFileSync(htmlReportPath, htmlReport);

    console.log(`\n📊 Security reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  private generateHtmlReport(report: SecurityReport): string {
    const { summary } = report;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .grade-A { color: #28a745; }
        .grade-B { color: #ffc107; }
        .grade-C { color: #fd7e14; }
        .grade-D, .grade-F { color: #dc3545; }
        .test-results { margin: 20px 0; }
        .test-pass { color: #28a745; }
        .test-fail { color: #dc3545; }
        .severity-critical { background: #f8d7da; }
        .severity-high { background: #fff3cd; }
        .severity-medium { background: #d1ecf1; }
        .severity-low { background: #d4edda; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Security Test Report</h1>
        <p>Generated: ${report.generatedAt}</p>
        <p>Environment: ${report.environment}</p>
        <p>Overall Security Grade: <span class="grade-${summary.securityGrade.charAt(0)}">${summary.securityGrade}</span> (${summary.overallScore}/100)</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${summary.totalTests}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3 class="test-pass">${summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3 class="test-fail">${summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3>${summary.criticalIssues}</h3>
            <p>Critical Issues</p>
        </div>
    </div>

    <div class="test-results">
        <h2>Test Results</h2>
        ${report.testResults.map(test => `
            <div class="severity-${test.severity.toLowerCase()}" style="margin: 10px 0; padding: 10px; border-radius: 5px;">
                <strong>${test.testSuite} - ${test.testName}</strong>
                <span class="test-${test.status.toLowerCase()}">[${test.status}]</span>
                <p>${test.description}</p>
                ${test.details ? `<p><strong>Details:</strong> ${test.details}</p>` : ''}
                ${test.recommendation ? `<p><strong>Recommendation:</strong> ${test.recommendation}</p>` : ''}
            </div>
        `).join('')}
    </div>

    <div>
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
  }

  private displaySummary(report: SecurityReport): void {
    const { summary } = report;
    
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SECURITY TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Overall Security Grade: ${summary.securityGrade} (${summary.overallScore}/100)`);
    console.log(`✅ Tests Passed: ${summary.passed}/${summary.totalTests}`);
    console.log(`❌ Tests Failed: ${summary.failed}`);
    console.log(`🚨 Critical Issues: ${summary.criticalIssues}`);
    console.log(`⚠️  High Issues: ${summary.highIssues}`);
    console.log(`📋 Medium Issues: ${summary.mediumIssues}`);
    console.log(`📝 Low Issues: ${summary.lowIssues}`);
    console.log(`⏱️  Total Execution Time: ${Date.now() - this.startTime}ms`);
    console.log('='.repeat(60));
    
    if (summary.criticalIssues > 0) {
      console.log('🚨 CRITICAL SECURITY ISSUES DETECTED - IMMEDIATE ACTION REQUIRED');
    } else if (summary.highIssues > 0) {
      console.log('⚠️  HIGH PRIORITY SECURITY ISSUES DETECTED');
    } else if (summary.failed === 0) {
      console.log('🎉 ALL SECURITY TESTS PASSED - EXCELLENT SECURITY POSTURE');
    }
    
    console.log('\n💡 Top Recommendations:');
    report.recommendations.slice(0, 3).forEach(rec => {
      console.log(`   ${rec}`);
    });
  }

  private async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }
}

// Export for use in test scripts
export default SecurityTestRunner;
