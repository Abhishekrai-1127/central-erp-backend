import { Module } from '@nestjs/common';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [ManufacturingController],
  providers: [ManufacturingService, JwtAuthGuard, RolesGuard],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
