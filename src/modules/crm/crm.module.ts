import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [CrmController],
  providers: [CrmService, JwtAuthGuard, RolesGuard],
  exports: [CrmService],
})
export class CrmModule {}
