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
import { CrmService } from './crm.service';
import {
  CustomerQueryDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  LeadQueryDto,
  CreateLeadDto,
  UpdateLeadDto,
  DealQueryDto,
  CreateDealDto,
  ActivityQueryDto,
  CreateActivityDto,
} from './dto/crm.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CRM')
@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  /* ---------------- CUSTOMERS & VENDORS ---------------- */

  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT, UserRole.PURCHASE_OFFICER)
  @ApiOperation({ summary: 'Fetch customers/vendors (?type=Customer|Vendor&status=Active)' })
  @ApiResponse({ status: 200, description: 'Returns customer/vendor party records list.' })
  getCustomers(@Query() query: CustomerQueryDto) {
    return this.crmService.getCustomers(query);
  }

  @Post('customers')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT, UserRole.PURCHASE_OFFICER)
  @ApiOperation({ summary: 'Create customer or vendor party record' })
  @ApiResponse({ status: 201, description: 'Party record successfully created.' })
  createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    return this.crmService.createCustomer(createCustomerDto);
  }

  @Put('customers/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update customer profile & financial terms' })
  @ApiResponse({ status: 200, description: 'Customer record updated.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  updateCustomer(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.crmService.updateCustomer(id, updateCustomerDto);
  }

  @Delete('customers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete customer record' })
  @ApiResponse({ status: 200, description: 'Customer record soft deleted.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  deleteCustomer(@Param('id') id: string) {
    return this.crmService.deleteCustomer(id);
  }

  /* ---------------- LEADS ---------------- */

  @Get('leads')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List leads (?stage=Qualified&search=Apex)' })
  @ApiResponse({ status: 200, description: 'Returns sales prospect leads.' })
  getLeads(@Query() query: LeadQueryDto) {
    return this.crmService.getLeads(query);
  }

  @Get('leads/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get single lead details by ID' })
  @ApiResponse({ status: 200, description: 'Lead details returned.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  getLeadById(@Param('id') id: string) {
    return this.crmService.getLeadById(id);
  }

  @Post('leads')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create sales prospect lead' })
  @ApiResponse({ status: 201, description: 'Lead successfully created.' })
  createLead(@Body() createLeadDto: CreateLeadDto) {
    return this.crmService.createLead(createLeadDto);
  }

  @Put('leads/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update lead pipeline stage / details' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  updateLead(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    return this.crmService.updateLead(id, updateLeadDto);
  }

  @Delete('leads/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Soft-delete lead record' })
  @ApiResponse({ status: 200, description: 'Lead soft-deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  deleteLead(@Param('id') id: string) {
    return this.crmService.deleteLead(id);
  }

  /* ---------------- DEALS ---------------- */


  @Get('deals')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Fetch deals pipeline (?stage=Proposal)' })
  @ApiResponse({ status: 200, description: 'Returns pipeline opportunity deals.' })
  getDeals(@Query() query: DealQueryDto) {
    return this.crmService.getDeals(query);
  }

  @Post('deals')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create sales opportunity deal' })
  @ApiResponse({ status: 201, description: 'Deal successfully created.' })
  createDeal(@Body() createDealDto: CreateDealDto) {
    return this.crmService.createDeal(createDealDto);
  }

  /* ---------------- ACTIVITIES ---------------- */

  @Get('activities')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Fetch timeline activity notes (?entityId=:id)' })
  @ApiResponse({ status: 200, description: 'Returns timeline activity log.' })
  getActivities(@Query() query: ActivityQueryDto) {
    return this.crmService.getActivities(query.entityId);
  }

  @Post('activities')
  @Roles(UserRole.ADMIN, UserRole.SALES_REP, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Log a call, meeting, or email activity note' })
  @ApiResponse({ status: 201, description: 'Activity logged successfully.' })
  createActivity(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentUser('name') userName: string,
  ) {
    return this.crmService.createActivity(createActivityDto, userName);
  }
}
