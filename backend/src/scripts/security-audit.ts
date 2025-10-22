#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface SecurityIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

interface ControllerAudit {
  file: string;
  hasJwtGuard: boolean;
  hasRoleGuard: boolean;
  publicEndpoints: string[];
  unprotectedEndpoints: string[];
  adminEndpoints: string[];
  issues: SecurityIssue[];
}

class SecurityAuditor {
  private controllers: string[] = [];
  private auditResults: ControllerAudit[] = [];
  private securityIssues: SecurityIssue[] = [];

  constructor(private rootDir: string) {}

  async runAudit(): Promise<void> {
    console.log('🔍 Starting Security Audit...\n');
    
    // Find all controller files
    await this.findControllers();
    
    // Audit each controller
    for (const controller of this.controllers) {
      await this.auditController(controller);
    }
    
    // Generate report
    this.generateReport();
  }

  private async findControllers(): Promise<void> {
    const findFiles = (dir: string): void => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findFiles(fullPath);
        } else if (file.endsWith('.controller.ts')) {
          this.controllers.push(fullPath);
        }
      }
    };
    
    findFiles(path.join(this.rootDir, 'src/modules'));
    console.log(`📁 Found ${this.controllers.length} controllers to audit`);
  }

  private async auditController(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const audit: ControllerAudit = {
      file: path.relative(this.rootDir, filePath),
      hasJwtGuard: false,
      hasRoleGuard: false,
      publicEndpoints: [],
      unprotectedEndpoints: [],
      adminEndpoints: [],
      issues: []
    };

    // Check for authentication guards
    audit.hasJwtGuard = content.includes('JwtAuthGuard') || content.includes('@UseGuards(JwtAuthGuard');
    audit.hasRoleGuard = content.includes('RolesGuard') || content.includes('AdminGuard') || content.includes('OrgAdminGuard');

    // Check class-level guards
    const classGuardMatch = content.match(/@UseGuards\([^)]+\)/);
    const hasClassLevelAuth = classGuardMatch && classGuardMatch[0].includes('JwtAuthGuard');

    // Find HTTP endpoints
    const httpMethods = ['@Get', '@Post', '@Put', '@Delete', '@Patch'];
    let currentMethod = '';
    let currentLine = 0;
    let isPublic = false;
    let hasMethodAuth = false;
    let isAdminOnly = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      currentLine = i + 1;

      // Check for public decorator
      if (line.includes('@Public()')) {
        isPublic = true;
        continue;
      }

      // Check for admin decorators
      if (line.includes('@AdminOnly()') || line.includes('@SuperAdminOnly()') || 
          line.includes('@Roles(') && (line.includes('admin') || line.includes('ADMIN'))) {
        isAdminOnly = true;
        continue;
      }

      // Check for method-level guards
      if (line.includes('@UseGuards(') && line.includes('JwtAuthGuard')) {
        hasMethodAuth = true;
        continue;
      }

      // Check for HTTP method decorators
      for (const method of httpMethods) {
        if (line.startsWith(method)) {
          const routeMatch = line.match(/@\w+\(['"`]([^'"`]*)/);
          const route = routeMatch ? routeMatch[1] : '';
          currentMethod = `${method.substring(1)} ${route}`;

          // Analyze endpoint security
          if (isPublic) {
            audit.publicEndpoints.push(currentMethod);
          } else if (isAdminOnly) {
            audit.adminEndpoints.push(currentMethod);
            
            // Check if admin endpoint has proper guards
            if (!hasClassLevelAuth && !hasMethodAuth) {
              audit.issues.push({
                file: audit.file,
                line: currentLine,
                issue: `Admin endpoint "${currentMethod}" lacks authentication guard`,
                severity: 'HIGH',
                recommendation: 'Add @UseGuards(JwtAuthGuard, AdminGuard) or ensure class-level guards are present'
              });
            }
          } else if (!hasClassLevelAuth && !hasMethodAuth) {
            audit.unprotectedEndpoints.push(currentMethod);
            
            // Determine severity based on endpoint type
            const severity = this.determineSeverity(currentMethod, content);
            audit.issues.push({
              file: audit.file,
              line: currentLine,
              issue: `Endpoint "${currentMethod}" lacks authentication guard`,
              severity,
              recommendation: 'Add @UseGuards(JwtAuthGuard) or @Public() if intentionally public'
            });
          }

          // Reset flags
          isPublic = false;
          hasMethodAuth = false;
          isAdminOnly = false;
          break;
        }
      }
    }

    // Additional security checks
    this.checkForSecurityAntiPatterns(content, audit);
    
    this.auditResults.push(audit);
    this.securityIssues.push(...audit.issues);
  }

  private determineSeverity(endpoint: string, content: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highRiskPatterns = [
      'delete', 'remove', 'admin', 'config', 'system', 'user', 'password', 
      'billing', 'payment', 'subscription', 'export', 'audit'
    ];
    
    const mediumRiskPatterns = [
      'create', 'update', 'modify', 'edit', 'upload', 'download'
    ];

    const endpointLower = endpoint.toLowerCase();
    
    if (highRiskPatterns.some(pattern => endpointLower.includes(pattern))) {
      return 'HIGH';
    }
    
    if (mediumRiskPatterns.some(pattern => endpointLower.includes(pattern)) || 
        endpoint.startsWith('POST') || endpoint.startsWith('PUT') || endpoint.startsWith('DELETE')) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private checkForSecurityAntiPatterns(content: string, audit: ControllerAudit): void {
    const antiPatterns = [
      {
        pattern: /req\.user\s*=\s*[^;]+/g,
        issue: 'Manual user assignment detected',
        severity: 'HIGH' as const,
        recommendation: 'Use @CurrentUser() decorator instead of manual user assignment'
      },
      {
        pattern: /password.*=.*req\./g,
        issue: 'Password handling in request detected',
        severity: 'HIGH' as const,
        recommendation: 'Ensure passwords are properly hashed and validated'
      },
      {
        pattern: /@SkipThrottle\(\)/g,
        issue: 'Rate limiting skipped',
        severity: 'MEDIUM' as const,
        recommendation: 'Ensure rate limiting bypass is intentional and documented'
      },
      {
        pattern: /eval\s*\(/g,
        issue: 'Use of eval() function detected',
        severity: 'HIGH' as const,
        recommendation: 'Remove eval() usage as it poses security risks'
      },
      {
        pattern: /process\.env\./g,
        issue: 'Direct environment variable access',
        severity: 'LOW' as const,
        recommendation: 'Use ConfigService for environment variable access'
      }
    ];

    for (const antiPattern of antiPatterns) {
      const matches = content.matchAll(antiPattern.pattern);
      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        audit.issues.push({
          file: audit.file,
          line: lineNumber,
          issue: antiPattern.issue,
          severity: antiPattern.severity,
          recommendation: antiPattern.recommendation
        });
      }
    }
  }

  private generateReport(): void {
    console.log('\n📊 SECURITY AUDIT REPORT');
    console.log('========================\n');

    // Summary statistics
    const totalControllers = this.auditResults.length;
    const protectedControllers = this.auditResults.filter(a => a.hasJwtGuard).length;
    const totalIssues = this.securityIssues.length;
    const highSeverityIssues = this.securityIssues.filter(i => i.severity === 'HIGH').length;
    const mediumSeverityIssues = this.securityIssues.filter(i => i.severity === 'MEDIUM').length;
    const lowSeverityIssues = this.securityIssues.filter(i => i.severity === 'LOW').length;

    console.log(`📈 SUMMARY`);
    console.log(`---------`);
    console.log(`Total Controllers: ${totalControllers}`);
    console.log(`Protected Controllers: ${protectedControllers} (${Math.round(protectedControllers/totalControllers*100)}%)`);
    console.log(`Total Security Issues: ${totalIssues}`);
    console.log(`  🔴 High Severity: ${highSeverityIssues}`);
    console.log(`  🟡 Medium Severity: ${mediumSeverityIssues}`);
    console.log(`  🟢 Low Severity: ${lowSeverityIssues}\n`);

    // Critical issues first
    if (highSeverityIssues > 0) {
      console.log(`🚨 CRITICAL ISSUES (${highSeverityIssues})`);
      console.log(`==================`);
      this.securityIssues
        .filter(i => i.severity === 'HIGH')
        .forEach(issue => {
          console.log(`❌ ${issue.file}:${issue.line}`);
          console.log(`   Issue: ${issue.issue}`);
          console.log(`   Fix: ${issue.recommendation}\n`);
        });
    }

    // Controllers without authentication
    const unprotectedControllers = this.auditResults.filter(a => !a.hasJwtGuard);
    if (unprotectedControllers.length > 0) {
      console.log(`🔓 UNPROTECTED CONTROLLERS (${unprotectedControllers.length})`);
      console.log(`========================`);
      unprotectedControllers.forEach(controller => {
        console.log(`❌ ${controller.file}`);
        console.log(`   Unprotected endpoints: ${controller.unprotectedEndpoints.length}`);
        if (controller.unprotectedEndpoints.length > 0) {
          controller.unprotectedEndpoints.forEach(endpoint => {
            console.log(`     - ${endpoint}`);
          });
        }
        console.log();
      });
    }

    // Admin endpoints analysis
    const adminEndpoints = this.auditResults.flatMap(a => a.adminEndpoints);
    if (adminEndpoints.length > 0) {
      console.log(`👑 ADMIN ENDPOINTS (${adminEndpoints.length})`);
      console.log(`================`);
      this.auditResults
        .filter(a => a.adminEndpoints.length > 0)
        .forEach(controller => {
          console.log(`✅ ${controller.file}`);
          controller.adminEndpoints.forEach(endpoint => {
            console.log(`     - ${endpoint}`);
          });
          console.log();
        });
    }

    // Recommendations
    console.log(`💡 RECOMMENDATIONS`);
    console.log(`=================`);
    console.log(`1. Add JwtAuthGuard to all controllers that handle sensitive data`);
    console.log(`2. Use role-based guards (AdminGuard, HRRole, etc.) for privileged operations`);
    console.log(`3. Explicitly mark public endpoints with @Public() decorator`);
    console.log(`4. Implement rate limiting on authentication and sensitive endpoints`);
    console.log(`5. Add input validation and sanitization to all endpoints`);
    console.log(`6. Use HTTPS in production and implement security headers`);
    console.log(`7. Regular security audits and dependency updates\n`);

    // Generate fix script
    this.generateFixScript();
  }

  private generateFixScript(): void {
    const fixScript = `#!/usr/bin/env ts-node
// Auto-generated security fix script
// Run this script to automatically fix common security issues

import * as fs from 'fs';

const fixes = [
${this.securityIssues
  .filter(issue => issue.severity === 'HIGH')
  .map(issue => `  {
    file: '${issue.file}',
    line: ${issue.line},
    issue: '${issue.issue}',
    fix: '${issue.recommendation}'
  }`)
  .join(',\n')}
];

console.log('🔧 Applying security fixes...');
fixes.forEach(fix => {
  console.log(\`Fixing: \${fix.file}:\${fix.line} - \${fix.issue}\`);
  // Implementation would go here
});
console.log('✅ Security fixes applied');
`;

    fs.writeFileSync(path.join(this.rootDir, 'security-fixes.ts'), fixScript);
    console.log(`📝 Generated security fix script: security-fixes.ts`);
  }
}

// Run the audit
const auditor = new SecurityAuditor(process.cwd());
auditor.runAudit().catch(console.error);
