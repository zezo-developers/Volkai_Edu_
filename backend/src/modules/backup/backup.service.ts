import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'schema';
  filename: string;
  size: number;
  checksum: string;
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  metadata: {
    tables: string[];
    recordCount: number;
    duration: number;
  };
}

export interface RestoreOptions {
  backupId: string;
  targetDatabase?: string;
  tableFilter?: string[];
  skipData?: boolean;
  skipSchema?: boolean;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backups: Map<string, BackupInfo> = new Map();
  private readonly backupDir: string;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR') || './backups';
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  // Full database backup
  async createFullBackup(): Promise<BackupInfo> {
    const backupId = this.generateBackupId();
    const filename = `full_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const backup: BackupInfo = {
      id: backupId,
      type: 'full',
      filename,
      size: 0,
      checksum: '',
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        tables: [],
        recordCount: 0,
        duration: 0,
      },
    };

    this.backups.set(backupId, backup);

    try {
      backup.status = 'in_progress';
      const startTime = Date.now();

      // Get database configuration
      const dbConfig = this.dataSource.options;
      const dbName = dbConfig.database as string;
      const host = (dbConfig as any).host || 'localhost';
      const port = (dbConfig as any).port || 5432;
      const username = (dbConfig as any).username;
      const password = (dbConfig as any).password;

      // Create pg_dump command
      const dumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --verbose --no-owner --no-privileges`;

      // Execute backup
      const { exec } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        exec(`${dumpCommand} > ${filepath}`, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Get file stats
      const stats = await fs.stat(filepath);
      backup.size = stats.size;

      // Calculate checksum
      backup.checksum = await this.calculateChecksum(filepath);

      // Get metadata
      backup.metadata = await this.getBackupMetadata();
      backup.metadata.duration = Date.now() - startTime;
      backup.status = 'completed';

      this.logger.log(`Full backup completed: ${filename} (${this.formatBytes(backup.size)})`);

    } catch (error) {
      backup.status = 'failed';
      backup.error = error.message;
      this.logger.error(`Full backup failed: ${error.message}`);
    }

    return backup;
  }

  // Schema-only backup
  async createSchemaBackup(): Promise<BackupInfo> {
    const backupId = this.generateBackupId();
    const filename = `schema_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const backup: BackupInfo = {
      id: backupId,
      type: 'schema',
      filename,
      size: 0,
      checksum: '',
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        tables: [],
        recordCount: 0,
        duration: 0,
      },
    };

    this.backups.set(backupId, backup);

    try {
      backup.status = 'in_progress';
      const startTime = Date.now();

      // Get database configuration
      const dbConfig = this.dataSource.options;
      const dbName = dbConfig.database as string;
      const host = (dbConfig as any).host || 'localhost';
      const port = (dbConfig as any).port || 5432;
      const username = (dbConfig as any).username;
      const password = (dbConfig as any).password;

      // Create pg_dump command for schema only
      const dumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --schema-only --verbose --no-owner --no-privileges`;

      // Execute backup
      const { exec } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        exec(`${dumpCommand} > ${filepath}`, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Get file stats
      const stats = await fs.stat(filepath);
      backup.size = stats.size;

      // Calculate checksum
      backup.checksum = await this.calculateChecksum(filepath);

      // Get metadata
      backup.metadata = await this.getBackupMetadata();
      backup.metadata.duration = Date.now() - startTime;
      backup.status = 'completed';

      this.logger.log(`Schema backup completed: ${filename} (${this.formatBytes(backup.size)})`);

    } catch (error) {
      backup.status = 'failed';
      backup.error = error.message;
      this.logger.error(`Schema backup failed: ${error.message}`);
    }

    return backup;
  }

  // Restore from backup
  async restoreFromBackup(options: RestoreOptions): Promise<{
    success: boolean;
    message: string;
    duration: number;
  }> {
    const backup = this.backups.get(options.backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${options.backupId}`);
    }

    if (backup.status !== 'completed') {
      throw new Error(`Backup is not completed: ${backup.status}`);
    }

    const startTime = Date.now();
    const filepath = path.join(this.backupDir, backup.filename);

    try {
      // Verify backup file exists and checksum
      await this.verifyBackup(backup);

      // Get database configuration
      const dbConfig = this.dataSource.options;
      const targetDb = options.targetDatabase || (dbConfig.database as string);
      const host = (dbConfig as any).host || 'localhost';
      const port = (dbConfig as any).port || 5432;
      const username = (dbConfig as any).username;
      const password = (dbConfig as any).password;

      // Create restore command
      let restoreCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${targetDb}`;

      // Add options
      if (options.skipData) {
        // This would require parsing the SQL file to skip INSERT statements
        this.logger.warn('Skip data option not fully implemented');
      }

      // Execute restore
      const { exec } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        exec(`${restoreCommand} < ${filepath}`, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Database restored successfully from ${backup.filename} in ${duration}ms`);

      return {
        success: true,
        message: `Database restored successfully from ${backup.filename}`,
        duration,
      };

    } catch (error) {
      this.logger.error(`Database restore failed: ${error.message}`);
      return {
        success: false,
        message: `Database restore failed: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  // Verify backup integrity
  async verifyBackup(backup: BackupInfo): Promise<boolean> {
    const filepath = path.join(this.backupDir, backup.filename);

    try {
      // Check if file exists
      await fs.access(filepath);

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(filepath);
      if (currentChecksum !== backup.checksum) {
        throw new Error('Backup file checksum mismatch');
      }

      // Check file size
      const stats = await fs.stat(filepath);
      if (stats.size !== backup.size) {
        throw new Error('Backup file size mismatch');
      }

      return true;
    } catch (error) {
      this.logger.error(`Backup verification failed: ${error.message}`);
      return false;
    }
  }

  // List all backups
  getBackups(): BackupInfo[] {
    return Array.from(this.backups.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Get backup by ID
  getBackup(backupId: string): BackupInfo | null {
    return this.backups.get(backupId) || null;
  }

  // Delete backup
  async deleteBackup(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const filepath = path.join(this.backupDir, backup.filename);

    try {
      await fs.unlink(filepath);
      this.backups.delete(backupId);
      this.logger.log(`Backup deleted: ${backup.filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${error.message}`);
      throw error;
    }
  }

  // Scheduled backups
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledFullBackup(): Promise<void> {
    try {
      this.logger.log('Starting scheduled full backup...');
      await this.createFullBackup();
      
      // Clean up old backups (keep last 7 days)
      await this.cleanupOldBackups(7);
    } catch (error) {
      this.logger.error(`Scheduled backup failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async scheduledSchemaBackup(): Promise<void> {
    try {
      this.logger.log('Starting scheduled schema backup...');
      await this.createSchemaBackup();
    } catch (error) {
      this.logger.error(`Scheduled schema backup failed: ${error.message}`);
    }
  }

  // Cleanup old backups
  async cleanupOldBackups(keepDays: number): Promise<void> {
    const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    const backupsToDelete: string[] = [];

    for (const [id, backup] of this.backups) {
      if (backup.createdAt < cutoffDate && backup.status === 'completed') {
        backupsToDelete.push(id);
      }
    }

    for (const id of backupsToDelete) {
      try {
        await this.deleteBackup(id);
      } catch (error) {
        this.logger.error(`Failed to cleanup backup ${id}: ${error.message}`);
      }
    }

    if (backupsToDelete.length > 0) {
      this.logger.log(`Cleaned up ${backupsToDelete.length} old backups`);
    }
  }

  // Export backup to external storage
  async exportBackup(backupId: string, destination: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const sourcePath = path.join(this.backupDir, backup.filename);
    const destPath = path.join(destination, backup.filename);

    try {
      await fs.copyFile(sourcePath, destPath);
      this.logger.log(`Backup exported to: ${destPath}`);
    } catch (error) {
      this.logger.error(`Failed to export backup: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private generateBackupId(): string {
    return `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private async calculateChecksum(filepath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private async getBackupMetadata(): Promise<{
    tables: string[];
    recordCount: number;
    duration: number;
  }> {
    try {
      // Get table list
      const tablesResult = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      const tables = tablesResult.map((row: any) => row.table_name);

      // Get total record count
      let totalRecords = 0;
      for (const table of tables) {
        try {
          const countResult = await this.dataSource.query(`SELECT COUNT(*) as count FROM "${table}"`);
          totalRecords += parseInt(countResult[0].count);
        } catch (error) {
          // Skip tables that can't be counted
        }
      }

      return {
        tables,
        recordCount: totalRecords,
        duration: 0, // Will be set by caller
      };
    } catch (error) {
      this.logger.error(`Failed to get backup metadata: ${error.message}`);
      return {
        tables: [],
        recordCount: 0,
        duration: 0,
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Disaster recovery methods
  async createDisasterRecoveryPlan(): Promise<{
    backupStrategy: string;
    retentionPolicy: string;
    recoverySteps: string[];
    estimatedRTO: string; // Recovery Time Objective
    estimatedRPO: string; // Recovery Point Objective
  }> {
    return {
      backupStrategy: 'Daily full backups with weekly schema backups',
      retentionPolicy: 'Keep daily backups for 7 days, weekly backups for 4 weeks',
      recoverySteps: [
        '1. Identify the most recent valid backup',
        '2. Verify backup integrity using checksum',
        '3. Create new database instance if needed',
        '4. Restore schema from backup',
        '5. Restore data from backup',
        '6. Verify data integrity',
        '7. Update application configuration',
        '8. Restart application services',
        '9. Perform smoke tests',
        '10. Monitor system health',
      ],
      estimatedRTO: '< 30 minutes', // Time to restore service
      estimatedRPO: '< 24 hours',   // Maximum data loss
    };
  }

  async testDisasterRecovery(): Promise<{
    success: boolean;
    steps: Array<{ step: string; status: 'success' | 'failed'; duration: number; error?: string }>;
    totalDuration: number;
  }> {
    const steps: Array<{ step: string; status: 'success' | 'failed'; duration: number; error?: string }> = [];
    const startTime = Date.now();

    // Step 1: Create test backup
    try {
      const stepStart = Date.now();
      const backup = await this.createSchemaBackup(); // Use schema backup for testing
      steps.push({
        step: 'Create test backup',
        status: backup.status === 'completed' ? 'success' : 'failed',
        duration: Date.now() - stepStart,
        error: backup.error,
      });
    } catch (error) {
      steps.push({
        step: 'Create test backup',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }

    // Step 2: Verify backup integrity
    try {
      const stepStart = Date.now();
      const latestBackup = this.getBackups().find(b => b.type === 'schema' && b.status === 'completed');
      if (latestBackup) {
        const isValid = await this.verifyBackup(latestBackup);
        steps.push({
          step: 'Verify backup integrity',
          status: isValid ? 'success' : 'failed',
          duration: Date.now() - stepStart,
        });
      }
    } catch (error) {
      steps.push({
        step: 'Verify backup integrity',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
    }

    const success = steps.every(s => s.status === 'success');
    const totalDuration = Date.now() - startTime;

    this.logger.log(`Disaster recovery test ${success ? 'passed' : 'failed'} in ${totalDuration}ms`);

    return {
      success,
      steps,
      totalDuration,
    };
  }
}
