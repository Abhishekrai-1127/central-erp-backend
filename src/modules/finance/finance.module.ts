import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, JwtAuthGuard, RolesGuard],
  exports: [FinanceService],
})
export class FinanceModule {}
