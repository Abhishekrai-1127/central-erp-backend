import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('trash')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'View all soft-deleted records across system' })
  @ApiResponse({ status: 200, description: 'Returns system soft-deleted audit log.' })
  getTrash() {
    return this.adminService.getTrash();
  }

  @Post('restore/:entityType/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore soft-deleted record' })
  @ApiResponse({ status: 200, description: 'Record restored successfully.' })
  @ApiResponse({ status: 404, description: 'Record not found in trash.' })
  restore(@Param('entityType') entityType: string, @Param('id') id: string) {
    return this.adminService.restore(entityType, id);
  }
}
