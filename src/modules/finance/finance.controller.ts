import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { FinanceVoucherQueryDto, CreateVoucherDto } from './dto/finance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Fetch Chart of Accounts & General Ledger balances' })
  @ApiResponse({ status: 200, description: 'Returns Chart of Accounts.' })
  getAccounts() {
    return this.financeService.getAccounts();
  }

  @Get('vouchers')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List journal / payment / receipt vouchers' })
  @ApiResponse({ status: 200, description: 'Returns financial vouchers list.' })
  getVouchers(@Query() query: FinanceVoucherQueryDto) {
    return this.financeService.getVouchers(query);
  }

  @Post('vouchers')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Post financial voucher entry' })
  @ApiResponse({ status: 201, description: 'Voucher posted successfully.' })
  createVoucher(@Body() createVoucherDto: CreateVoucherDto) {
    return this.financeService.createVoucher(createVoucherDto);
  }

  @Get('tax-summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.PURCHASE_OFFICER)
  @ApiOperation({ summary: 'Fetch aggregated CGST, SGST, IGST liabilities & ITC' })
  @ApiResponse({ status: 200, description: 'Returns aggregated tax summary.' })
  getTaxSummary() {
    return this.financeService.getTaxSummary();
  }
}
