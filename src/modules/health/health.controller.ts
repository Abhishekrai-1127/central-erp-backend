import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildMetadata {
  buildNumber?: string | null;
  gitCommit?: string | null;
  gitBranch?: string | null;
  buildTime?: string | null;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private packageVersion = '0.0.1';
  private packageName = 'central-erp-backend';
  private fileBuildInfo: BuildMetadata = {};

  constructor(private readonly configService: ConfigService) {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        this.packageVersion = pkg.version || '0.0.1';
        this.packageName = pkg.name || 'central-erp-backend';
      }
    } catch {
      // Fallback
    }

    const possibleBuildFiles = [
      path.join(process.cwd(), 'build-info.json'),
      path.join(process.cwd(), 'dist', 'build-info.json'),
      path.join(__dirname, '..', '..', 'build-info.json'),
    ];

    for (const file of possibleBuildFiles) {
      try {
        if (fs.existsSync(file)) {
          this.fileBuildInfo = JSON.parse(fs.readFileSync(file, 'utf8'));
          break;
        }
      } catch {
        // Ignore file read error
      }
    }
  }

  private getGitCommit(): string | null {
    if (this.fileBuildInfo.gitCommit) return this.fileBuildInfo.gitCommit;
    if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
    if (process.env.GIT_COMMIT_HASH) return process.env.GIT_COMMIT_HASH;
    if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;
    try {
      return execSync('git rev-parse --short HEAD', {
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {
      return null;
    }
  }

  private getGitBranch(): string | null {
    if (this.fileBuildInfo.gitBranch) return this.fileBuildInfo.gitBranch;
    if (process.env.GIT_BRANCH) return process.env.GIT_BRANCH;
    if (process.env.BRANCH_NAME) return process.env.BRANCH_NAME;
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {
      return null;
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check application liveness, readiness, and version info' })
  check() {
    const appConfig = this.configService.get('app');
    const nodeEnv =
      this.configService.get<string>('nodeEnv') ||
      process.env.NODE_ENV ||
      'development';

    const buildNumber =
      this.fileBuildInfo.buildNumber ||
      appConfig?.buildNumber ||
      process.env.BUILD_NUMBER ||
      process.env.BUILD_ID ||
      null;

    return {
      status: 'ok',
      service: appConfig?.name || this.packageName,
      version: appConfig?.version || this.packageVersion,
      environment: nodeEnv,
      buildNumber,
      gitCommit: this.getGitCommit(),
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Get application version and CI/CD build details' })
  version() {
    const appConfig = this.configService.get('app');
    const nodeEnv =
      this.configService.get<string>('nodeEnv') ||
      process.env.NODE_ENV ||
      'development';

    const buildNumber =
      this.fileBuildInfo.buildNumber ||
      appConfig?.buildNumber ||
      process.env.BUILD_NUMBER ||
      process.env.BUILD_ID ||
      null;

    const buildTime =
      this.fileBuildInfo.buildTime ||
      appConfig?.buildTime ||
      process.env.BUILD_TIME ||
      null;

    return {
      name: appConfig?.name || this.packageName,
      version: appConfig?.version || this.packageVersion,
      environment: nodeEnv,
      build: {
        buildNumber,
        gitCommit: this.getGitCommit(),
        gitBranch: this.getGitBranch(),
        buildTime,
      },
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }
}


