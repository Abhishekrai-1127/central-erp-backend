import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('General')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application root health ping' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Get application version and CI/CD deployment build details' })
  getVersion() {
    return this.appService.getVersionInfo();
  }
}

