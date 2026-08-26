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
import { SalesService } from './sales.service';
import {
  SalesDocQueryDto,
  CreateSalesDocDto,
  UpdateSalesDocDto,
} from './dto/sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('documents')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Fetch sales docs (quotation, sales_order, invoice, delivery_challan, payment)',
  })
  @ApiResponse({ status: 200, description: 'Returns sales documents.' })
  getDocuments(@Query() query: SalesDocQueryDto) {
    return this.salesService.getDocuments(query);
  }

  @Get('check-invoice-exists')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Check if invoice exists for a Sales Order' })
  @ApiResponse({ status: 200, description: 'Invoice existence check result.' })
  checkInvoiceExists(@Query('salesOrderNo') salesOrderNo: string) {
    return this.salesService.checkInvoiceExists(salesOrderNo);
  }

  @Get('documents/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Get single sales document details by ID' })
  @ApiResponse({ status: 200, description: 'Sales document details.' })
  @ApiResponse({ status: 404, description: 'Sales document not found.' })
  getDocumentById(@Param('id') id: string) {
    return this.salesService.getDocumentById(id);
  }

  @Post('documents')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Save / create sales document (Enforces HTTP 422 single-invoice rule)' })
  @ApiResponse({ status: 201, description: 'Sales document created successfully.' })
  @ApiResponse({
    status: 422,
    description: 'An invoice has already been generated for this Sales Order.',
  })
  createDocument(@Body() createSalesDocDto: CreateSalesDocDto) {
    return this.salesService.createDocument(createSalesDocDto);
  }

  @Put('documents/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update sales document fields or line items' })
  @ApiResponse({ status: 200, description: 'Sales document updated successfully.' })
  @ApiResponse({ status: 404, description: 'Sales document not found.' })
  @ApiResponse({
    status: 422,
    description: 'An invoice has already been generated for this Sales Order.',
  })
  updateDocument(
    @Param('id') id: string,
    @Body() updateSalesDocDto: UpdateSalesDocDto,
  ) {
    return this.salesService.updateDocument(id, updateSalesDocDto);
  }

  @Delete('documents/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete / Soft-delete sales document' })
  @ApiResponse({ status: 200, description: 'Sales document deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Sales document not found.' })
  deleteDocument(@Param('id') id: string) {
    return this.salesService.deleteDocument(id);
  }
}
