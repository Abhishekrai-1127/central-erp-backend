import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, JwtAuthGuard, RolesGuard],
  exports: [InventoryService],
})
export class InventoryModule {}
