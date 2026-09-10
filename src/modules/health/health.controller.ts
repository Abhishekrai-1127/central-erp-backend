import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private packageVersion = '0.0.1';
  private packageName = 'central-erp-backend';

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

    return {
      status: 'ok',
      service: appConfig?.name || this.packageName,
      version: appConfig?.version || this.packageVersion,
      environment: nodeEnv,
      buildNumber:
        appConfig?.buildNumber ||
        process.env.BUILD_NUMBER ||
        process.env.BUILD_ID ||
        null,
      gitCommit:
        appConfig?.gitCommit ||
        process.env.GIT_COMMIT ||
        process.env.GIT_COMMIT_HASH ||
        process.env.COMMIT_SHA ||
        null,
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

    return {
      name: appConfig?.name || this.packageName,
      version: appConfig?.version || this.packageVersion,
      environment: nodeEnv,
      build: {
        buildNumber:
          appConfig?.buildNumber ||
          process.env.BUILD_NUMBER ||
          process.env.BUILD_ID ||
          null,
        gitCommit:
          appConfig?.gitCommit ||
          process.env.GIT_COMMIT ||
          process.env.GIT_COMMIT_HASH ||
          process.env.COMMIT_SHA ||
          null,
        gitBranch:
          appConfig?.gitBranch ||
          process.env.GIT_BRANCH ||
          process.env.BRANCH_NAME ||
          null,
        buildTime: appConfig?.buildTime || process.env.BUILD_TIME || null,
      },
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }
}

