import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import {
  CreateBomDto,
  WorkOrderQueryDto,
  CreateWorkOrderDto,
} from './dto/manufacturing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Manufacturing')
@Controller('manufacturing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Get('bom')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.PURCHASE_OFFICER)
  @ApiOperation({ summary: 'Fetch Bill of Materials (BOM) for finished products' })
  @ApiResponse({ status: 200, description: 'Returns BOM list.' })
  getBoms() {
    return this.manufacturingService.getBoms();
  }

  @Post('bom')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create new Bill of Materials (BOM)' })
  @ApiResponse({ status: 201, description: 'BOM created successfully.' })
  createBom(@Body() createBomDto: CreateBomDto) {
    return this.manufacturingService.createBom(createBomDto);
  }

  @Get('work-orders')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Fetch factory production work orders' })
  @ApiResponse({ status: 200, description: 'Returns work orders list.' })
  getWorkOrders(@Query() query: WorkOrderQueryDto) {
    return this.manufacturingService.getWorkOrders(query);
  }

  @Post('work-orders')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Issue new production work order' })
  @ApiResponse({ status: 201, description: 'Work order issued.' })
  createWorkOrder(@Body() createWorkOrderDto: CreateWorkOrderDto) {
    return this.manufacturingService.createWorkOrder(createWorkOrderDto);
  }
}
