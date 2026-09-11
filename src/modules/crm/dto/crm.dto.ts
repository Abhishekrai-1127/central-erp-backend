import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsEmail } from 'class-validator';

export enum PartyType {
  CUSTOMER = 'Customer',
  VENDOR = 'Vendor',
}

export enum PartyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum LeadSource {
  DIRECT_OUTREACH = 'Direct Outreach',
  INBOUND_WEB = 'Inbound Web Inquiry',
  TRADE_SHOW = 'Trade Show Expo',
}

export enum LeadStage {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  PROPOSAL = 'Proposal',
  WON = 'Won',
  LOST = 'Lost',
}

export enum DealStage {
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  CLOSED_WON = 'Closed Won',
  CLOSED_LOST = 'Closed Lost',
}

export enum ActivityType {
  CALL = 'Call',
  MEETING = 'Meeting',
  EMAIL = 'Email',
  NOTE = 'Note',
}

/* ---------------- CUSTOMERS & VENDORS DTOs ---------------- */

export class CustomerQueryDto {
  @ApiPropertyOptional({ enum: PartyType, example: PartyType.CUSTOMER })
  @IsEnum(PartyType)
  @IsOptional()
  type?: PartyType;

  @ApiPropertyOptional({ enum: PartyStatus, example: PartyStatus.ACTIVE })
  @IsEnum(PartyStatus)
  @IsOptional()
  status?: PartyStatus;

  @ApiPropertyOptional({ example: 'Logistics' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}

export class CreateCustomerDto {
  @ApiPropertyOptional({ example: 'New' })
  @IsString()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ example: 'Inbound Web Inquiry' })
  @IsString()
  @IsOptional()
  source?: string;
  @ApiProperty({ enum: PartyType, example: PartyType.CUSTOMER })
  @IsEnum(PartyType)
  @IsNotEmpty()
  type: PartyType;

  @ApiProperty({ example: 'Amitabh Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Sharma Logistics Ltd.' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiPropertyOptional({ example: 'amitabh@sharma-logistics.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '09AAACH7409R1ZZ' })
  @IsString()
  @IsOptional()
  gst?: string;

  @ApiPropertyOptional({ example: 'Logistics' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: PartyStatus, example: PartyStatus.ACTIVE })
  @IsEnum(PartyStatus)
  @IsOptional()
  status?: PartyStatus;

  @ApiPropertyOptional({ example: 42850.00 })
  @IsNumber()
  @IsOptional()
  numericOutstanding?: number;

  @ApiPropertyOptional({ example: 500000.00 })
  @IsNumber()
  @IsOptional()
  numericCreditLimit?: number;

  @ApiPropertyOptional({ example: '₹42,850.00' })
  @IsString()
  @IsOptional()
  outstanding?: string;

  @ApiPropertyOptional({ example: '₹5,00,000.00' })
  @IsString()
  @IsOptional()
  creditLimit?: string;

  @ApiPropertyOptional({ example: '2026-09-10T18:38:15.061Z' })
  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({ example: 'Sarah Jenkins' })
  @IsString()
  @IsOptional()
  assignedRep?: string;

  @ApiPropertyOptional({ example: 'Plot 42, Transport Nagar, Kanpur, UP 208023' })
  @IsString()
  @IsOptional()
  billingAddress?: string;

  @ApiPropertyOptional({ example: 'Plot 42, Transport Nagar, Kanpur, UP 208023' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'Key enterprise account for North India freight logistics.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'New' })
  @IsString()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ example: 'Inbound Web Inquiry' })
  @IsString()
  @IsOptional()
  source?: string;
  @ApiPropertyOptional({ enum: PartyType, example: PartyType.CUSTOMER })
  @IsEnum(PartyType)
  @IsOptional()
  type?: PartyType;

  @ApiPropertyOptional({ example: 'Amitabh Sharma' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Sharma Logistics Ltd.' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ example: 'amitabh@sharma-logistics.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '09AAACH7409R1ZZ' })
  @IsString()
  @IsOptional()
  gst?: string;

  @ApiPropertyOptional({ example: 'Logistics' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: PartyStatus, example: PartyStatus.ACTIVE })
  @IsEnum(PartyStatus)
  @IsOptional()
  status?: PartyStatus;

  @ApiPropertyOptional({ example: 42850.00 })
  @IsNumber()
  @IsOptional()
  numericOutstanding?: number;

  @ApiPropertyOptional({ example: 500000.00 })
  @IsNumber()
  @IsOptional()
  numericCreditLimit?: number;

  @ApiPropertyOptional({ example: '₹42,850.00' })
  @IsString()
  @IsOptional()
  outstanding?: string;

  @ApiPropertyOptional({ example: '₹5,00,000.00' })
  @IsString()
  @IsOptional()
  creditLimit?: string;

  @ApiPropertyOptional({ example: '2026-09-10T18:38:15.061Z' })
  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({ example: 'Sarah Jenkins' })
  @IsString()
  @IsOptional()
  assignedRep?: string;

  @ApiPropertyOptional({ example: 'Plot 42, Transport Nagar, Kanpur, UP 208023' })
  @IsString()
  @IsOptional()
  billingAddress?: string;

  @ApiPropertyOptional({ example: 'Plot 42, Transport Nagar, Kanpur, UP 208023' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'Key enterprise account for North India freight logistics.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

/* ---------------- LEADS DTOs ---------------- */

export class LeadQueryDto {
  @ApiPropertyOptional({ example: 'New Lead' })
  @IsString()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ example: 'Apex' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}

export class CreateLeadDto {
  @ApiProperty({ example: 'Vikram Malhotra' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Apex Precision Tools' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiPropertyOptional({ example: 'vikram@apexprecision.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+91 98112 33445' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 350000.0 })
  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 350000.0 })
  @IsNumber()
  @IsOptional()
  numericValue?: number;

  @ApiPropertyOptional({ example: 'New Lead' })
  @IsString()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ example: 'Key requirement details...' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-09-11T13:32:47.000Z' })
  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-09-11' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '01:32 PM' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ example: 'Direct Outreach' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Sarah Jenkins' })
  @IsString()
  @IsOptional()
  assignedRep?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  score?: number;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: 'Vikram Malhotra' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Apex Precision Tools' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ example: 'vikram@apexprecision.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+91 98112 33445' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 350000.0 })
  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 350000.0 })
  @IsNumber()
  @IsOptional()
  numericValue?: number;

  @ApiPropertyOptional({ example: 'New Lead' })
  @IsString()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ example: 'Key requirement details...' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-09-11T13:32:47.000Z' })
  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-09-11' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '01:32 PM' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ example: 'Direct Outreach' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Sarah Jenkins' })
  @IsString()
  @IsOptional()
  assignedRep?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  score?: number;
}


/* ---------------- DEALS DTOs ---------------- */

export class DealQueryDto {
  @ApiPropertyOptional({ enum: DealStage, example: DealStage.PROPOSAL })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiPropertyOptional({ example: 'CNC' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}

export class CreateDealDto {
  @ApiProperty({ example: '5-Axis CNC Milling Deal' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'cust-101' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Apex Precision Tools' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ example: 350000.00 })
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @ApiPropertyOptional({ enum: DealStage, example: DealStage.PROPOSAL })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsString()
  @IsOptional()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ example: 'Sarah Jenkins' })
  @IsString()
  @IsOptional()
  assignedRep?: string;
}

/* ---------------- ACTIVITIES DTOs ---------------- */

export class ActivityQueryDto {
  @ApiProperty({ example: 'cust-101' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class CreateActivityDto {
  @ApiProperty({ example: 'cust-101' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ enum: ActivityType, example: ActivityType.CALL })
  @IsEnum(ActivityType)
  @IsNotEmpty()
  type: ActivityType;

  @ApiProperty({ example: 'Discussed Q3 pricing options and credit terms.' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
