import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [SalesController],
  providers: [SalesService, JwtAuthGuard, RolesGuard],
  exports: [SalesService],
})
export class SalesModule {}
