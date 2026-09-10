import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  private packageVersion = '0.0.1';
  private packageName = 'central-erp-backend';

  constructor(private readonly configService?: ConfigService) {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        this.packageVersion = pkg.version || '0.0.1';
        this.packageName = pkg.name || 'central-erp-backend';
      }
    } catch {
      // Fallback to default version if package.json not found
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  getVersionInfo() {
    const appConfig = this.configService?.get('app');
    const nodeEnv =
      this.configService?.get<string>('nodeEnv') ||
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

