import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [PurchaseController],
  providers: [PurchaseService, JwtAuthGuard, RolesGuard],
  exports: [PurchaseService],
})
export class PurchaseModule {}
