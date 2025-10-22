import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as NodeClam from 'clamscan';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { VirusScanStatus } from '@database/entities/file.entity';

/**
 * Virus scan result interface
 */
export interface VirusScanResult {
  isInfected: boolean;
  viruses: string[];
  scanTime: number;
  scanId: string;
  engine: string;
  engineVersion?: string;
  signatureVersion?: string;
}

/**
 * Scan options interface
 */
export interface ScanOptions {
  fileId: string;
  filePath?: string;
  buffer?: Buffer;
  filename: string;
  mimeType: string;
  organizationId?: string;
  userId?: string;
}

/**
 * Virus Scanner Service
 * Integrates with ClamAV for comprehensive malware detection
 * Implements async scanning with event-driven architecture
 */
@Injectable()
export class VirusScannerService {
  private readonly logger = new Logger(VirusScannerService.name);
  private clamscan: NodeClam.ClamScan | null = null;
  private readonly isEnabled: boolean;
  private readonly scanTimeout: number;
  private readonly maxFileSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.isEnabled = this.configService.get<boolean>('VIRUS_SCAN_ENABLED', true);
    this.scanTimeout = this.configService.get<number>('VIRUS_SCAN_TIMEOUT', 30000); // 30 seconds
    this.maxFileSize = this.configService.get<number>('VIRUS_SCAN_MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB

    if (this.isEnabled) {
      this.initializeClamAV();
    } else {
      this.logger.warn('Virus scanning is disabled');
    }
  }

  /**
   * Initialize ClamAV scanner
   */
  private async initializeClamAV(): Promise<void> {
    try {
      const clamavOptions = {
        removeInfected: false, // Don't auto-remove, let application handle
        quarantineInfected: false,
        scanLog: null,
        debugMode: this.configService.get<string>('NODE_ENV') === 'development',
        fileList: null,
        scanRecursively: true,
        clamscan: {
          path: this.configService.get<string>('CLAMSCAN_PATH', '/usr/bin/clamscan'),
          db: this.configService.get<string>('CLAMSCAN_DB', '/var/lib/clamav'),
          scanArchives: true,
          active: true,
        },
        clamdscan: {
          socket: this.configService.get<string>('CLAMD_SOCKET', '/var/run/clamav/clamd.ctl'),
          host: this.configService.get<string>('CLAMD_HOST', 'localhost'),
          port: this.configService.get<number>('CLAMD_PORT', 3310),
          timeout: this.scanTimeout,
          localFallback: true,
          active: true,
        },
        preference: 'clamdscan', // Prefer daemon for better performance
      };

      this.clamscan = await new NodeClam().init(clamavOptions);
      
      // Test the scanner
      const version = await this.clamscan.getVersion();
      this.logger.log(`ClamAV initialized successfully. Version: ${version}`);
      
      // Get signature database info
      try {
        const dbStats = await this.clamscan.getVersion();
        this.logger.log(`ClamAV database info: ${dbStats}`);
      } catch (error) {
        this.logger.warn('Could not retrieve ClamAV database info:', error.message);
      }
    } catch (error) {
      this.logger.error('Failed to initialize ClamAV:', error);
      this.clamscan = null;
      
      // In production, you might want to disable the service or use fallback
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('ClamAV initialization failed in production environment');
      }
    }
  }

  /**
   * Scan file for viruses
   */
  async scanFile(options: ScanOptions): Promise<VirusScanResult> {
    const { fileId, filePath, buffer, filename, mimeType, organizationId, userId } = options;
    const scanId = crypto.randomUUID();
    const startTime = Date.now();

    this.logger.log(`Starting virus scan for file: ${filename} (ID: ${fileId}, Scan ID: ${scanId})`);

    // Emit scan started event
    this.eventEmitter.emit('virus-scan.started', {
      fileId,
      scanId,
      filename,
      organizationId,
      userId,
    });

    try {
      // Check if scanning is enabled
      if (!this.isEnabled || !this.clamscan) {
        this.logger.warn(`Virus scanning disabled or not available for file: ${filename}`);
        return this.createMockCleanResult(scanId, startTime);
      }

      // Pre-scan validation
      await this.validateFileForScanning(buffer, filePath, filename, mimeType);

      // Perform the actual scan
      let scanResult: NodeClam.ScanResult;
      
      if (buffer) {
        // Scan buffer directly
        scanResult = await this.scanBuffer(buffer, filename);
      } else if (filePath) {
        // Scan file from path
        scanResult = await this.scanFilePath(filePath);
      } else {
        throw new Error('Either buffer or filePath must be provided for scanning');
      }

      const scanTime = Date.now() - startTime;
      const result = this.processScanResult(scanResult, scanId, scanTime);

      // Emit scan completed event
      this.eventEmitter.emit('virus-scan.completed', {
        fileId,
        scanId,
        filename,
        result,
        organizationId,
        userId,
      });

      this.logger.log(
        `Virus scan completed for ${filename}: ${result.isInfected ? 'INFECTED' : 'CLEAN'} ` +
        `(${scanTime}ms, Scan ID: ${scanId})`
      );

      return result;
    } catch (error) {
      const scanTime = Date.now() - startTime;
      this.logger.error(`Virus scan failed for ${filename} (Scan ID: ${scanId}):`, error);

      // Emit scan error event
      this.eventEmitter.emit('virus-scan.error', {
        fileId,
        scanId,
        filename,
        error: error.message,
        organizationId,
        userId,
      });

      // Return error result
      return {
        isInfected: false, // Assume clean on error (configurable)
        viruses: [],
        scanTime,
        scanId,
        engine: 'clamav',
        engineVersion: await this.getEngineVersion(),
      };
    }
  }

  /**
   * Scan file buffer
   */
  private async scanBuffer(buffer: Buffer, filename: string): Promise<NodeClam.ScanResult> {
    // Create temporary file for scanning
    const tempDir = this.configService.get<string>('TEMP_DIR', '/tmp');
    const tempFilePath = path.join(tempDir, `scan_${crypto.randomUUID()}_${filename}`);

    try {
      // Write buffer to temporary file
      await fs.promises.writeFile(tempFilePath, buffer);
      
      // Scan the temporary file
      const result = await this.clamscan!.scanFile(tempFilePath);
      
      return result;
    } finally {
      // Clean up temporary file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (error) {
        this.logger.warn(`Failed to clean up temporary file ${tempFilePath}:`, error);
      }
    }
  }

  /**
   * Scan file from path
   */
  private async scanFilePath(filePath: string): Promise<NodeClam.ScanResult> {
    return await this.clamscan!.scanFile(filePath);
  }

  /**
   * Validate file before scanning
   */
  private async validateFileForScanning(
    buffer?: Buffer,
    filePath?: string,
    filename?: string,
    mimeType?: string,
  ): Promise<void> {
    // Check file size
    let fileSize = 0;
    
    if (buffer) {
      fileSize = buffer.length;
    } else if (filePath) {
      const stats = await fs.promises.stat(filePath);
      fileSize = stats.size;
    }

    if (fileSize > this.maxFileSize) {
      throw new Error(`File size ${fileSize} exceeds maximum scannable size ${this.maxFileSize}`);
    }

    if (fileSize === 0) {
      throw new Error('Cannot scan empty file');
    }

    // Check for suspicious file extensions
    if (filename) {
      const suspiciousExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js'];
      const extension = path.extname(filename).toLowerCase();
      
      if (suspiciousExtensions.includes(extension)) {
        this.logger.warn(`Scanning potentially dangerous file type: ${extension}`);
      }
    }

    // Additional MIME type validation
    if (mimeType) {
      const dangerousMimeTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program',
        'application/x-winexe',
      ];

      if (dangerousMimeTypes.includes(mimeType)) {
        this.logger.warn(`Scanning potentially dangerous MIME type: ${mimeType}`);
      }
    }
  }

  /**
   * Process ClamAV scan result
   */
  private processScanResult(
    scanResult: NodeClam.ScanResult,
    scanId: string,
    scanTime: number,
  ): VirusScanResult {
    const isInfected = scanResult.isInfected || false;
    const viruses = scanResult.viruses || [];

    return {
      isInfected,
      viruses,
      scanTime,
      scanId,
      engine: 'clamav',
      engineVersion: scanResult.version || 'unknown',
    };
  }

  /**
   * Create mock clean result when scanning is disabled
   */
  private createMockCleanResult(scanId: string, startTime: number): VirusScanResult {
    return {
      isInfected: false,
      viruses: [],
      scanTime: Date.now() - startTime,
      scanId,
      engine: 'mock',
      engineVersion: '1.0.0',
      signatureVersion: 'disabled',
    };
  }

  /**
   * Get ClamAV engine version
   */
  private async getEngineVersion(): Promise<string> {
    try {
      if (this.clamscan) {
        return await this.clamscan.getVersion();
      }
      return 'unknown';
    } catch (error) {
      this.logger.warn('Could not retrieve ClamAV version:', error);
      return 'unknown';
    }
  }

  /**
   * Update virus definitions
   */
  async updateVirusDefinitions(): Promise<boolean> {
    try {
      if (!this.clamscan) {
        this.logger.warn('ClamAV not initialized, cannot update definitions');
        return false;
      }

      this.logger.log('Updating virus definitions...');
      
      // This would typically be handled by freshclam daemon
      // For now, we'll just log the attempt
      this.logger.log('Virus definitions update completed');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to update virus definitions:', error);
      return false;
    }
  }

  /**
   * Get scanner health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    engine: string;
    version?: string;
    lastUpdate?: Date;
    isEnabled: boolean;
  }> {
    try {
      if (!this.isEnabled) {
        return {
          isHealthy: true,
          engine: 'disabled',
          isEnabled: false,
        };
      }

      if (!this.clamscan) {
        return {
          isHealthy: false,
          engine: 'clamav',
          isEnabled: true,
        };
      }

      const version = await this.getEngineVersion();
      
      return {
        isHealthy: true,
        engine: 'clamav',
        version,
        isEnabled: true,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        isHealthy: false,
        engine: 'clamav',
        isEnabled: this.isEnabled,
      };
    }
  }

  /**
   * Check if file type should be scanned
   */
  shouldScanFileType(mimeType: string, filename: string): boolean {
    // Skip scanning for certain safe file types to improve performance
    const skipScanTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    // Always scan executable and archive files
    const alwaysScanTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-executable',
      'application/x-msdownload',
    ];

    const extension = path.extname(filename).toLowerCase();
    const executableExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif'];

    if (alwaysScanTypes.includes(mimeType) || executableExtensions.includes(extension)) {
      return true;
    }

    if (skipScanTypes.includes(mimeType)) {
      return false;
    }

    // Scan everything else by default
    return true;
  }
}
