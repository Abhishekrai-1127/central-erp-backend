import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import {
  PurchaseRecordQueryDto,
  CreatePurchaseRecordDto,
  UpdatePurchaseRecordDto,
} from './dto/purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Purchase')
@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.PURCHASE_OFFICER,
    UserRole.ACCOUNTANT,
    UserRole.WAREHOUSE_MANAGER,
  )
  @ApiOperation({ summary: 'List purchase records (?type=rfo|purchase_bill|purchased_machinery)' })
  @ApiResponse({ status: 200, description: 'Returns purchase domain records.' })
  getPurchaseRecords(@Query() query: PurchaseRecordQueryDto) {
    return this.purchaseService.getPurchaseRecords(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.PURCHASE_OFFICER,
    UserRole.ACCOUNTANT,
    UserRole.WAREHOUSE_MANAGER,
  )
  @ApiOperation({ summary: 'Get purchase record by ID' })
  @ApiResponse({ status: 200, description: 'Purchase record found.' })
  @ApiResponse({ status: 404, description: 'Purchase record not found.' })
  getPurchaseRecordById(@Param('id') id: string) {
    return this.purchaseService.getPurchaseRecordById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PURCHASE_OFFICER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create new purchase record (RFO, Bill, or Asset)' })
  @ApiResponse({ status: 201, description: 'Purchase record created successfully.' })
  createPurchaseRecord(@Body() createDto: CreatePurchaseRecordDto) {
    return this.purchaseService.createPurchaseRecord(createDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PURCHASE_OFFICER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update purchase record' })
  @ApiResponse({ status: 200, description: 'Purchase record updated.' })
  @ApiResponse({ status: 404, description: 'Purchase record not found.' })
  updatePurchaseRecord(
    @Param('id') id: string,
    @Body() updateDto: UpdatePurchaseRecordDto,
  ) {
    return this.purchaseService.updatePurchaseRecord(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete / Soft-delete purchase record' })
  @ApiResponse({ status: 200, description: 'Purchase record soft-deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Purchase record not found.' })
  deletePurchaseRecord(@Param('id') id: string) {
    return this.purchaseService.deletePurchaseRecord(id);
  }
}
